#!/usr/bin/env node
/**
 * MentraOS AppServer Bridge (V2 — channel plugin features)
 *
 * Bridges Mentra Live glasses to OpenClaw AI via /v1/chat/completions.
 *
 * V2 additions (ported from src/channels/mentra/):
 *   - Per-session conversation context (last 20 msgs, sends 10 as context)
 *   - Processing lock (prevents concurrent OpenClaw requests per session)
 *   - Audio interrupt (short press during TTS stops playback)
 *   - Better error handling (no spoken errors, echo detection cooldown)
 *   - WebSocket relay integration for live webview data
 */
const { AppServer } = require('@mentra/sdk');

// -- Config -----------------------------------------------------------------
const OPENCLAW_URL = process.env.OPENCLAW_URL || `http://localhost:${process.env.OPENCLAW_PORT || 18789}`;
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const MENTRA_PORT = parseInt(process.env.MENTRA_BRIDGE_PORT || '7010', 10);
const PACKAGE_NAME = process.env.MENTRA_PACKAGE_NAME || 'mentra-claw';
const API_KEY = process.env.MENTRAOS_API_KEY || process.env.MENTRA_API_KEY || '';
const VISION_MODEL = process.env.MENTRA_VISION_MODEL || '';
const MAX_DISPLAY = 220;
const MAX_HISTORY = 20;
const CTX_WINDOW = 10;
const MAX_TOKENS = 256;
const TIMEOUT_MS = 30000;
const ECHO_WINDOW_MS = 8000;

if (!API_KEY) { console.error('[bridge] MENTRAOS_API_KEY not set'); process.exit(1); }

// -- Global audio/mic controls (toggled via HTTP from webview) ----------------
const controls = {
  micEnabled: true,   // false = ignore all transcription
  audioEnabled: true, // false = skip all speak() calls
  pttMode: true,      // true = mic only active during PTT hold (DEFAULT)
  pttActive: false,   // true = PTT button is being held right now
};
// NOTE: With pttMode=true and pttActive=false, NO transcription is processed
// until the user holds the PTT button in the webview.

// -- Relay disabled (runs as separate pm2 process, IPC not yet wired) --------
const relayEmit = null;

function emitRelay(evt) {
  if (relayEmit) { try { relayEmit(evt); } catch (_) { /* */ } }
}

// -- SessionState -----------------------------------------------------------
class SessionState {
  constructor(sid, uid) {
    this.sessionId = sid;
    this.userId = uid;
    this.startTime = Date.now();
    this.lastActivity = this.startTime;
    this.messageCount = 0;
    this.history = [];
    this.isProcessing = false;
    this.isSpeaking = false;
    this.lastSpokenText = '';
    this.lastSpokenAt = 0;
  }
  addMessage(role, content) {
    this.history.push({ role, content, timestamp: Date.now() });
    if (this.history.length > MAX_HISTORY) this.history = this.history.slice(-MAX_HISTORY);
    this.messageCount++;
    this.lastActivity = Date.now();
  }
  buildContext() {
    return this.history.slice(-CTX_WINDOW).map((m) => ({ role: m.role, content: m.content }));
  }
  lock() { if (this.isProcessing) return false; this.isProcessing = true; return true; }
  unlock() { this.isProcessing = false; }
  // Block transcription while speaking + 3s cooldown after TTS finishes
  startSpeaking() { this.isSpeaking = true; this.speakingEndAt = 0; }
  stopSpeaking() { this.isSpeaking = false; this.speakingEndAt = Date.now(); }
  shouldIgnoreTranscription() {
    if (this.isSpeaking) return true;
    if (this.speakingEndAt && Date.now() - this.speakingEndAt < 3000) return true;
    return false;
  }
  recordSpoken(t) { this.lastSpokenText = t; this.lastSpokenAt = Date.now(); }
  touch() { this.lastActivity = Date.now(); }
}

// -- Helpers ----------------------------------------------------------------
function formatForGlasses(text) {
  let c = text.replace(/#{1,6}\s/g, '').replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[code]').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n').trim();
  return c.length > MAX_DISPLAY ? c.substring(0, MAX_DISPLAY - 3) + '...' : c;
}

function toBase64(buf) { return Buffer.from(buf).toString('base64'); }

// -- OpenClaw query (with conversation context) -----------------------------
async function queryOpenClaw(message, state, opts = {}) {
  const { imageBase64, model } = opts;
  const messages = [];
  if (state) {
    for (const m of state.buildContext()) {
      if (m.content !== message) messages.push({ role: m.role, content: m.content });
    }
  }
  if (imageBase64) {
    messages.push({ role: 'user', content: [
      { type: 'text', text: message },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
    ]});
  } else {
    messages.push({ role: 'user', content: message });
  }
  const body = { messages, max_tokens: MAX_TOKENS };
  if (model) body.model = model;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const t0 = Date.now();
    const res = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENCLAW_TOKEN}` },
      body: JSON.stringify(body), signal: ac.signal,
    });
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`OpenClaw ${res.status}: ${t.substring(0, 200)}`); }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || 'No response';
    emitRelay({ type: 'agent-response', text, model: model || '(default)', latencyMs: Date.now() - t0 });
    return text;
  } finally { clearTimeout(timer); }
}

// == AppServer ==============================================================
/** @type {Map<string, SessionState>} */
const sessionStates = new Map();

class OpenClawBridge extends AppServer {
  constructor() { super({ packageName: PACKAGE_NAME, apiKey: API_KEY, port: MENTRA_PORT }); }

  async onSession(session, sessionId, userId) {
    console.log(`[bridge] SESSION ${sessionId} user=${userId} caps=${JSON.stringify(session.capabilities || {})}`);
    const hasDisplay = session.capabilities?.hasDisplay !== false && !!session.layouts;
    const hasAudio = session.capabilities?.hasSpeaker !== false && !!session.audio;

    const state = new SessionState(sessionId, userId);
    sessionStates.set(sessionId, state);

    const show = async (t) => { if (hasDisplay) try { await session.layouts.showTextWall(t); } catch (e) { console.log('[bridge] showText err:', e.message); } };
    const speak = async (t) => {
      if (!hasAudio || !controls.audioEnabled) return;
      state.startSpeaking(); state.recordSpoken(t);
      emitRelay({ type: 'tts', text: t, status: 'speaking' });
      try { await session.audio.speak(t, { voice_id: 'Wq15xSaY3gWvazBRaGEU', model_id: 'eleven_flash_v2_5' }); emitRelay({ type: 'tts', text: t, status: 'done' }); }
      catch (e) { console.error('[bridge] TTS err:', e?.message); emitRelay({ type: 'tts', text: t, status: 'error' }); }
      finally { state.stopSpeaking(); }
    };
    const stopAudio = async () => {
      if (!hasAudio) return;
      try { if (session.audio.stop) await session.audio.stop(); } catch (e) { console.error('[bridge] stop err:', e?.message); }
      state.stopSpeaking();
    };

    emitRelay({ type: 'session', event: 'connected', userId, sessionId, capabilities: session.capabilities || {} });
    if (hasDisplay) await show('WeaveLogic AI\nReady');
    if (hasAudio) await speak('Ready');

    // -- Transcription ------------------------------------------------------
    if (session.events && session.events.onTranscription) {
      session.events.onTranscription(async (data) => {
        emitRelay({ type: 'transcription', text: data.text, isFinal: data.isFinal, language: data.transcribeLanguage, confidence: data.confidence });
        if (!data.isFinal) return;
        // Check mic controls
        if (!controls.micEnabled) { return; }
        if (controls.pttMode && !controls.pttActive) { return; }
        // Block all transcription while speaking or in 3s cooldown after TTS
        if (state.shouldIgnoreTranscription()) { console.log(`[bridge] Speaking/cooldown, ignoring transcription`); return; }
        if (!state.lock()) { console.log(`[bridge] Busy, skip`); return; }
        try {
          state.addMessage('user', data.text);
          await show('Thinking...');
          const resp = await queryOpenClaw(data.text, state);
          state.addMessage('assistant', resp);
          await show(formatForGlasses(resp));
          await speak(resp);
        } catch (err) {
          console.error('[bridge] Query fail:', err.message);
          emitRelay({ type: 'error', source: 'transcription', message: err.message });
          await show('Error processing request.\nPlease try again.');
        } finally { state.unlock(); }
      });
    }

    // -- Photo --------------------------------------------------------------
    if (session.events && session.events.onPhotoTaken) {
      session.events.onPhotoTaken(async (data) => {
        emitRelay({ type: 'photo', mimeType: data.mimeType, size: data.photoData?.byteLength || 0 });
        if (!state.lock()) return;
        try {
          await show('Analyzing...'); await speak('Analyzing photo');
          const b64 = toBase64(data.photoData);
          const resp = await queryOpenClaw('What do you see? Be concise.', state, { imageBase64: b64, model: VISION_MODEL || undefined });
          state.addMessage('user', '[Photo] What do you see?');
          state.addMessage('assistant', resp);
          await show(formatForGlasses(resp)); await speak(resp);
        } catch (err) {
          console.error('[bridge] Photo fail:', err.message);
          emitRelay({ type: 'error', source: 'photo', message: err.message });
          await show('Could not analyze image.');
        } finally { state.unlock(); }
      });
    }

    // -- Button press -------------------------------------------------------
    if (session.events && session.events.onButtonPress) {
      session.events.onButtonPress(async (data) => {
        emitRelay({ type: 'button', buttonId: data.buttonId, pressType: data.pressType });
        if (data.pressType === 'short' && state.isSpeaking) { await stopAudio(); return; }
        if (data.pressType === 'long') {
          await speak('Capturing');
          if (!state.lock()) return;
          try {
            const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
            const resp = await queryOpenClaw('What do you see? Describe briefly.', state, { imageBase64: toBase64(photo.photoData), model: VISION_MODEL || undefined });
            state.addMessage('user', '[Button photo] What do you see?');
            state.addMessage('assistant', resp);
            await show(formatForGlasses(resp)); await speak(resp);
          } catch (err) {
            console.error('[bridge] Capture fail:', err.message);
            emitRelay({ type: 'error', source: 'button-photo', message: err.message });
            await show('Could not capture photo.');
          } finally { state.unlock(); }
        } else { await speak('Listening'); }
      });
    }

    // -- Head position / notifications / battery / messaging ----------------
    if (session.events && session.events.onHeadPosition) session.events.onHeadPosition(() => state.touch());

    if (session.events && session.events.onPhoneNotifications) {
      session.events.onPhoneNotifications(async (notifs) => {
        if (!notifs || !notifs.length) return;
        for (const n of notifs) {
          if (n.priority === 'high') { await show(`${n.app}: ${n.title}`); await speak(`${n.app}: ${n.title}`); }
        }
      });
    }

    if (session.events && session.events.onGlassesBattery) {
      session.events.onGlassesBattery(async (d) => {
        emitRelay({ type: 'battery', level: d.batteryLevel, charging: !!d.isCharging });
        if (d.batteryLevel !== undefined && d.batteryLevel <= 10) await speak(`Low battery: ${d.batteryLevel} percent`);
      });
    }

    if (session.events && session.events.onAppMessage) session.events.onAppMessage(() => state.touch());
    if (session.events && session.events.onAppUserJoined) session.events.onAppUserJoined(() => {});
    if (session.events && session.events.onAppUserLeft) session.events.onAppUserLeft(() => {});

    // -- Lifecycle ----------------------------------------------------------
    if (session.events && session.events.onDisconnected) {
      session.events.onDisconnected(() => { sessionStates.delete(sessionId); emitRelay({ type: 'session', event: 'disconnected', userId, sessionId }); });
    }
    if (session.events && session.events.onReconnected) {
      session.events.onReconnected(() => { emitRelay({ type: 'session', event: 'reconnected', userId, sessionId }); speak('Reconnected').catch(console.error); });
    }
    if (session.events && session.events.onError) {
      session.events.onError((e) => { console.error(`[bridge] Session err: ${e.message}`); emitRelay({ type: 'error', source: 'session', message: e.message }); });
    }

    try { if (session.dashboard && session.dashboard.content) session.dashboard.content.writeToMain('WeaveLogic AI - Active'); } catch (_) {}

    // Force subscription update (SDK timing bug workaround)
    try { if (session.updateSubscriptions) await session.updateSubscriptions(); else if (session._updateSubscriptions) await session._updateSubscriptions(); } catch (_) {}
    console.log(`[bridge] Handlers registered for ${sessionId}`);
  }

  async onToolCall(tc) {
    if (tc.toolId === 'ask_ai') {
      try { return await queryOpenClaw(tc.toolParameters?.question || 'No question', null); }
      catch (e) { return `Error: ${e.message}`; }
    }
    if (tc.toolId === 'capture_photo') return 'Use the camera button on your glasses.';
    return undefined;
  }
}

// == Start ==================================================================
async function main() {
  console.log(`[bridge] OpenClaw: ${OPENCLAW_URL} | Starting...`);
  const server = new OpenClawBridge();
  const app = server.getExpressApp();

  // Log buffer
  const logBuf = [];
  const _log = console.log; const _err = console.error;
  console.log = (...a) => { const m = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); logBuf.push(m); if (logBuf.length > 200) logBuf.shift(); _log.apply(console, a); };
  console.error = (...a) => { const m = 'ERR: ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); logBuf.push(m); if (logBuf.length > 200) logBuf.shift(); _err.apply(console, a); };

  // Control endpoints (called by webview)
  app.use(require('express').json());
  app.get('/control', (_, r) => r.json(controls));
  app.post('/control/mic', (req, r) => {
    if (req.body.enabled !== undefined) controls.micEnabled = !!req.body.enabled;
    console.log(`[bridge] Mic ${controls.micEnabled ? 'ENABLED' : 'DISABLED'}`);
    r.json(controls);
  });
  app.post('/control/audio', (req, r) => {
    if (req.body.enabled !== undefined) controls.audioEnabled = !!req.body.enabled;
    console.log(`[bridge] Audio ${controls.audioEnabled ? 'ENABLED' : 'DISABLED'}`);
    r.json(controls);
  });
  app.post('/control/ptt', (req, r) => {
    if (req.body.mode !== undefined) controls.pttMode = !!req.body.mode;
    if (req.body.active !== undefined) controls.pttActive = !!req.body.active;
    console.log(`[bridge] PTT mode=${controls.pttMode} active=${controls.pttActive}`);
    r.json(controls);
  });

  app.get('/logs', (_, r) => r.type('text/plain').send(logBuf.join('\n')));
  app.get('/webview', (_, r) => r.send('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WeaveLogic AI</title><style>body{font-family:sans-serif;margin:0;padding:20px;background:#1a1a2e;color:#eee}h1{color:#e94560}.s{background:#16213e;padding:15px;border-radius:10px;margin:10px 0}</style></head><body><h1>WeaveLogic AI</h1><div class="s"><p><b>Status:</b> Connected</p><p><b>Model:</b> Gemini 2.0 Flash</p></div><div class="s"><p>Speak naturally. Long-press to capture photos.</p></div></body></html>'));

  await server.start();
  console.log(`[bridge] Running on :${MENTRA_PORT} pkg=${PACKAGE_NAME}`);

  emitRelay({ type: 'status', service: 'bridge', healthy: true });
  try { const h = await fetch(`${OPENCLAW_URL}/health`, { signal: AbortSignal.timeout(5000) }); emitRelay({ type: 'status', service: 'openclaw', healthy: h.ok }); }
  catch (_) { emitRelay({ type: 'status', service: 'openclaw', healthy: false }); }
}

module.exports = { sessionStates };
main().catch((e) => { console.error('[bridge] Fatal:', e); process.exit(1); });
