#!/usr/bin/env node
/**
 * OpenClaw <-> MentraOS Bridge (V3)
 * Drop-in replacement for mentra-bridge.cjs. Extends @mentra/sdk AppServer.
 * Start: node skills/mentra-bridge/bridge.cjs  |  Port: 7010
 */
'use strict';
const { AppServer } = require('@mentra/sdk');
const fs = require('fs');
const path = require('path');
const { normalizeForTts } = require('./tts-normalize.cjs');

// -- 1. Config (env + disk) ---------------------------------------------------
const OPENCLAW_URL = process.env.OPENCLAW_URL || `http://localhost:${process.env.OPENCLAW_PORT || 18789}`;
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const MENTRA_PORT = parseInt(process.env.MENTRA_BRIDGE_PORT || '7010', 10);
const PACKAGE_NAME = process.env.MENTRA_PACKAGE_NAME || 'mentra-claw';
const API_KEY = process.env.MENTRAOS_API_KEY || process.env.MENTRA_API_KEY || '';
const MAX_DISPLAY = 220, MAX_HISTORY = 20, CTX_WINDOW = 10;
const TIMEOUT_MS = 30000, ECHO_COOLDOWN_MS = 3000;

const AGENT_DIR = path.join(process.env.HOME || '/home/aepod', '.openclaw', 'agents', 'main', 'agent');

function loadJson(f, fb) { try { return JSON.parse(fs.readFileSync(path.join(AGENT_DIR, f), 'utf8')); } catch { return fb; } }
function loadText(f, fb) { try { return fs.readFileSync(path.join(AGENT_DIR, f), 'utf8').trim(); } catch { return fb; } }

const TTS_CONFIG = loadJson('tts.json', { voiceId: 'Wq15xSaY3gWvazBRaGEU', modelId: 'eleven_flash_v2_5' });
const AGENT_CONFIG = loadJson('config.json', { maxTokens: 256, temperature: 0.7 });
const SYSTEM_PROMPT = loadText('SYSTEM.md', 'You are ClawFT, a concise smart glasses AI assistant. Keep responses to 2-3 sentences.');
const VISION_MODEL = AGENT_CONFIG.model?.vision || process.env.MENTRA_VISION_MODEL || '';
const MAX_TOKENS = AGENT_CONFIG.maxTokens || 256;

console.log(`[bridge] TTS voice=${TTS_CONFIG.voiceId} model=${TTS_CONFIG.modelId}`);
console.log(`[bridge] System prompt: ${SYSTEM_PROMPT.substring(0, 60)}...`);
console.log(`[bridge] Max tokens: ${MAX_TOKENS}, Vision: ${VISION_MODEL || '(default)'}`);
if (!API_KEY) { console.error('[bridge] MENTRAOS_API_KEY not set'); process.exit(1); }

// -- 2. Global controls (PTT, mic, audio — toggled via HTTP) ------------------
const controls = { micEnabled: true, audioEnabled: true, pttMode: true, pttActive: false };

// -- 3. SessionState (history, locks, echo detection) -------------------------
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
    this.speakingEndAt = 0;
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

  lock() {
    if (this.isProcessing) return false;
    this.isProcessing = true;
    return true;
  }
  unlock() { this.isProcessing = false; }

  startSpeaking() { this.isSpeaking = true; this.speakingEndAt = 0; }
  stopSpeaking()  { this.isSpeaking = false; this.speakingEndAt = Date.now(); }

  shouldIgnoreTranscription() {
    if (this.isSpeaking) return true;
    if (this.speakingEndAt && Date.now() - this.speakingEndAt < ECHO_COOLDOWN_MS) return true;
    return false;
  }

  recordSpoken(text) { this.lastSpokenText = text; this.lastSpokenAt = Date.now(); }
  touch() { this.lastActivity = Date.now(); }
}

// -- 4. Helpers ---------------------------------------------------------------
function formatForGlasses(text) {
  let c = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return c.length > MAX_DISPLAY ? c.substring(0, MAX_DISPLAY - 3) + '...' : c;
}

function toBase64(buf) { return Buffer.from(buf).toString('base64'); }

// -- 5. queryOpenClaw() — system prompt + conversation context ----------------
async function queryOpenClaw(message, state, opts = {}) {
  const { imageBase64, model } = opts;
  const messages = [];
  if (SYSTEM_PROMPT) messages.push({ role: 'system', content: SYSTEM_PROMPT });
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
    const res = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENCLAW_TOKEN}` },
      body: JSON.stringify(body), signal: ac.signal,
    });
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`OpenClaw ${res.status}: ${t.substring(0, 200)}`); }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response';
  } finally { clearTimeout(timer); }
}

// -- 6. OpenClawBridge extends AppServer --------------------------------------
/** @type {Map<string, SessionState>} */
const sessionStates = new Map();

class OpenClawBridge extends AppServer {
  constructor() { super({ packageName: PACKAGE_NAME, apiKey: API_KEY, port: MENTRA_PORT }); }

  async onSession(session, sessionId, userId) {
    console.log(`[bridge] SESSION ${sessionId} user=${userId} caps=${JSON.stringify(session.capabilities || {})}`);

    const hasDisplay = session.capabilities?.hasDisplay !== false && !!session.layouts;
    const hasAudio   = session.capabilities?.hasSpeaker !== false && !!session.audio;
    const state = new SessionState(sessionId, userId);
    sessionStates.set(sessionId, state);

    const show = async (text) => {
      if (!hasDisplay) return;
      try { await session.layouts.showTextWall(text); }
      catch (e) { console.log('[bridge] showText err:', e.message); }
    };

    const speak = async (raw) => {
      if (!hasAudio || !controls.audioEnabled) return;
      const text = normalizeForTts(raw);
      if (!text) return;
      state.startSpeaking();
      state.recordSpoken(text);
      try {
        const ttsOpts = { voice_id: TTS_CONFIG.voiceId, model_id: TTS_CONFIG.modelId };
        if (TTS_CONFIG.voiceSettings) ttsOpts.voice_settings = TTS_CONFIG.voiceSettings;
        await session.audio.speak(text, ttsOpts);
      } catch (e) {
        console.error('[bridge] TTS err:', e?.message);
      } finally {
        state.stopSpeaking();
      }
    };

    const stopAudio = async () => {
      if (!hasAudio) return;
      try { if (session.audio.stop) await session.audio.stop(); }
      catch (e) { console.error('[bridge] stop err:', e?.message); }
      state.stopSpeaking();
    };

    if (hasDisplay) await show('WeaveLogic AI\nReady');
    if (hasAudio)   await speak('Ready');

    // -- Transcription --------------------------------------------------------
    if (session.events && session.events.onTranscription) {
      session.events.onTranscription(async (data) => {
        if (!data.isFinal) return;
        if (!controls.micEnabled) return;
        if (controls.pttMode && !controls.pttActive) return;
        if (state.shouldIgnoreTranscription()) {
          console.log('[bridge] Speaking/cooldown, ignoring transcription');
          return;
        }
        if (!state.lock()) { console.log('[bridge] Busy, skip'); return; }
        try {
          state.addMessage('user', data.text);
          await show('Thinking...');
          const resp = await queryOpenClaw(data.text, state);
          state.addMessage('assistant', resp);
          await show(formatForGlasses(resp));
          await speak(resp);
        } catch (err) {
          console.error('[bridge] Query fail:', err.message);
          await show('Error processing request.\nPlease try again.');
        } finally {
          state.unlock();
        }
      });
    }

    // -- Photo ----------------------------------------------------------------
    if (session.events && session.events.onPhotoTaken) {
      session.events.onPhotoTaken(async (data) => {
        if (!state.lock()) return;
        try {
          await show('Analyzing...');
          await speak('Analyzing photo');
          const b64 = toBase64(data.photoData);
          const resp = await queryOpenClaw('What do you see? Be concise.', state, {
            imageBase64: b64,
            model: VISION_MODEL || undefined,
          });
          state.addMessage('user', '[Photo] What do you see?');
          state.addMessage('assistant', resp);
          await show(formatForGlasses(resp));
          await speak(resp);
        } catch (err) {
          console.error('[bridge] Photo fail:', err.message);
          await show('Could not analyze image.');
        } finally {
          state.unlock();
        }
      });
    }

    // -- Button press ---------------------------------------------------------
    if (session.events && session.events.onButtonPress) {
      session.events.onButtonPress(async (data) => {
        // Short press during audio -> interrupt
        if (data.pressType === 'short' && state.isSpeaking) {
          await stopAudio();
          return;
        }
        if (data.pressType === 'long') {
          await speak('Capturing');
          if (!state.lock()) return;
          try {
            const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
            const b64 = toBase64(photo.photoData);
            const resp = await queryOpenClaw('What do you see? Describe briefly.', state, {
              imageBase64: b64,
              model: VISION_MODEL || undefined,
            });
            state.addMessage('user', '[Button photo] What do you see?');
            state.addMessage('assistant', resp);
            await show(formatForGlasses(resp));
            await speak(resp);
          } catch (err) {
            console.error('[bridge] Capture fail:', err.message);
            await show('Could not capture photo.');
          } finally {
            state.unlock();
          }
        } else {
          // Short press (not during audio) -> listening feedback
          await speak('Listening');
        }
      });
    }

    // -- Misc events ----------------------------------------------------------
    if (session.events && session.events.onHeadPosition) {
      session.events.onHeadPosition(() => state.touch());
    }

    if (session.events && session.events.onPhoneNotifications) {
      session.events.onPhoneNotifications(async (notifs) => {
        if (!notifs || !notifs.length) return;
        for (const n of notifs) {
          console.log(`[bridge] Notification: [${n.app}] ${n.title}`);
          if (n.priority === 'high') {
            await show(`${n.app}: ${n.title}`);
            await speak(`${n.app}: ${n.title}`);
          }
        }
      });
    }

    if (session.events && session.events.onGlassesBattery) {
      session.events.onGlassesBattery(async (d) => {
        if (d.batteryLevel !== undefined && d.batteryLevel <= 10) {
          await speak(`Low battery: ${d.batteryLevel} percent`);
        }
      });
    }

    if (session.events && session.events.onAppMessage) session.events.onAppMessage(() => state.touch());
    if (session.events && session.events.onAppUserJoined) session.events.onAppUserJoined(() => {});
    if (session.events && session.events.onAppUserLeft) session.events.onAppUserLeft(() => {});

    // -- Lifecycle ------------------------------------------------------------
    if (session.events && session.events.onDisconnected) {
      session.events.onDisconnected(() => {
        sessionStates.delete(sessionId);
        console.log(`[bridge] Disconnected: ${sessionId}`);
      });
    }
    if (session.events && session.events.onReconnected) {
      session.events.onReconnected(() => {
        console.log(`[bridge] Reconnected: ${sessionId}`);
        speak('Reconnected').catch(console.error);
      });
    }
    if (session.events && session.events.onError) {
      session.events.onError((e) => {
        console.error(`[bridge] Session err: ${e.message}`);
      });
    }

    try { if (session.dashboard?.content) session.dashboard.content.writeToMain('WeaveLogic AI - Active'); } catch (_) {}
    // SDK timing bug workaround (bug007-fix-v2)
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

// -- 7. main() — Express routes + start ---------------------------------------
async function main() {
  console.log(`[bridge] OpenClaw: ${OPENCLAW_URL} | Starting...`);
  const server = new OpenClawBridge();
  const app = server.getExpressApp();

  // Log buffer (accessible via /logs)
  const logBuf = [];
  const _log = console.log, _err = console.error;
  console.log = (...a) => { const m = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); logBuf.push(m); if (logBuf.length > 200) logBuf.shift(); _log.apply(console, a); };
  console.error = (...a) => { const m = 'ERR: ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); logBuf.push(m); if (logBuf.length > 200) logBuf.shift(); _err.apply(console, a); };

  // Control endpoints
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
  try { const h = await fetch(`${OPENCLAW_URL}/health`, { signal: AbortSignal.timeout(5000) }); console.log(`[bridge] OpenClaw health: ${h.ok ? 'OK' : 'FAIL'}`); }
  catch (_) { console.log('[bridge] OpenClaw health: unreachable (will retry on first request)'); }
}

module.exports = { sessionStates };
main().catch((e) => { console.error('[bridge] Fatal:', e); process.exit(1); });
