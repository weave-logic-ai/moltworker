/**
 * Mentra Channel Plugin for OpenClaw
 *
 * Registers "mentra" as a proper channel so glasses conversations appear in
 * the dashboard. Routes messages through `openclaw agent --to` (not /v1/chat).
 *
 * Exports MentraChannel class (start/stop/onIncoming/onOutgoing).
 * Run standalone: MENTRAOS_API_KEY=xxx node index.js
 */
'use strict';
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const SDK_PATH = '/opt/moltworker/skills/mentra-bridge/node_modules/@mentra/sdk';
const TTS_PATH = '/opt/moltworker/skills/mentra-bridge/tts-normalize.cjs';
const MAX_DISPLAY = 220, MAX_HISTORY = 20, CTX_WINDOW = 10;
const TIMEOUT_MS = 30000, ECHO_COOLDOWN_MS = 3000;
const AGENT_DIR = path.join(process.env.HOME || '/home/aepod', '.openclaw', 'agents', 'main', 'agent');

const loadJson = (f, fb) => { try { return JSON.parse(fs.readFileSync(path.join(AGENT_DIR, f), 'utf8')); } catch { return fb; } };
const loadText = (f, fb) => { try { return fs.readFileSync(path.join(AGENT_DIR, f), 'utf8').trim(); } catch { return fb; } };

class SessionState {
  constructor(sid, uid) {
    Object.assign(this, { sessionId: sid, userId: uid, startTime: Date.now(),
      lastActivity: Date.now(), messageCount: 0, history: [],
      isProcessing: false, isSpeaking: false, speakingEndAt: 0,
      lastSpokenText: '', lastSpokenAt: 0 });
  }
  addMessage(role, content) {
    this.history.push({ role, content, timestamp: Date.now() });
    if (this.history.length > MAX_HISTORY) this.history = this.history.slice(-MAX_HISTORY);
    this.messageCount++; this.lastActivity = Date.now();
  }
  buildContext() { return this.history.slice(-CTX_WINDOW).map(m => ({ role: m.role, content: m.content })); }
  lock() { if (this.isProcessing) return false; this.isProcessing = true; return true; }
  unlock() { this.isProcessing = false; }
  startSpeaking() { this.isSpeaking = true; this.speakingEndAt = 0; }
  stopSpeaking() { this.isSpeaking = false; this.speakingEndAt = Date.now(); }
  shouldIgnore() { return this.isSpeaking || (this.speakingEndAt && Date.now() - this.speakingEndAt < ECHO_COOLDOWN_MS); }
  recordSpoken(t) { this.lastSpokenText = t; this.lastSpokenAt = Date.now(); }
  touch() { this.lastActivity = Date.now(); }
}

function stripMd(text) {
  let c = text.replace(/#{1,6}\s/g, '').replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[code]').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n').trim();
  return c.length > MAX_DISPLAY ? c.substring(0, MAX_DISPLAY - 3) + '...' : c;
}

class MentraChannel {
  constructor() {
    this._status = 'stopped';
    this._server = null;
    this._sessions = new Map();
    this._userSessions = new Map();
    this._controls = { micEnabled: true, audioEnabled: true, pttMode: false, pttActive: false };
    this._ttsConfig = loadJson('tts.json', { voiceId: 'Wq15xSaY3gWvazBRaGEU', modelId: 'eleven_flash_v2_5' });
    this._agentCfg = loadJson('config.json', { maxTokens: 256, temperature: 0.7 });
    this._sysPrompt = loadText('SYSTEM.md', 'You are ClawFT, a concise smart glasses AI assistant. Keep responses to 2-3 sentences.');
    this._visionModel = this._agentCfg.model?.vision || process.env.MENTRA_VISION_MODEL || '';
    this._maxTokens = this._agentCfg.maxTokens || 256;
    this._normalize = null;
    this._clawUrl = process.env.OPENCLAW_URL || `http://localhost:${process.env.OPENCLAW_PORT || 18789}`;
    this._clawToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';
    this._clawBin = '/opt/openclaw/openclaw.mjs';
  }

  get name() { return 'mentra'; }
  get displayName() { return 'Mentra Live Glasses'; }
  get status() { return this._status; }
  get supportsThreads() { return false; }
  get supportsMedia() { return true; }
  get controls() { return this._controls; }
  get sessions() { return this._sessions; }

  /** Boot the AppServer and register as mentra channel. */
  async start(config = {}) {
    if (this._status === 'running') return;
    this._status = 'starting';
    const apiKey = config.apiKey || process.env.MENTRAOS_API_KEY || process.env.MENTRA_API_KEY || '';
    const pkg = config.packageName || process.env.MENTRA_PACKAGE_NAME || 'mentra-claw';
    const port = config.port || parseInt(process.env.MENTRA_BRIDGE_PORT || '7010', 10);
    if (!apiKey) { this._status = 'error'; throw new Error('[mentra-channel] Missing apiKey'); }

    const { AppServer } = require(SDK_PATH);
    this._normalize = require(TTS_PATH).normalizeForTts;
    const ch = this;

    class Server extends AppServer {
      constructor() { super({ packageName: pkg, apiKey, port }); }
      async onSession(s, sid, uid) { ch._onSession(s, sid, uid); }
      async onToolCall(tc) {
        if (tc.toolId === 'ask_ai') return ch.onIncoming(tc.toolParameters?.question || 'No question', null);
        if (tc.toolId === 'capture_photo') return 'Use the camera button on your glasses.';
      }
    }

    this._server = new Server();
    this._setupRoutes(this._server.getExpressApp());
    await this._server.start();
    this._status = 'running';
    console.log(`[mentra-channel] Running on :${port} pkg=${pkg}`);
    try { const h = await fetch(`${this._clawUrl}/health`, { signal: AbortSignal.timeout(5000) }); console.log(`[mentra-channel] OpenClaw: ${h.ok ? 'OK' : 'FAIL'}`); }
    catch { console.log('[mentra-channel] OpenClaw: unreachable'); }
  }

  async stop() {
    if (this._status !== 'running') return;
    this._status = 'stopping';
    try { if (this._server?.close) await this._server.close(); } catch (e) { console.error('[mentra-channel] Stop err:', e.message); }
    this._sessions.clear(); this._server = null; this._status = 'stopped';
    console.log('[mentra-channel] Stopped');
  }

  /** Route user message through openclaw agent pipeline. */
  async onIncoming(message, state, opts = {}) {
    if (opts.imageBase64) return this._queryDirect(message, state, opts);
    const target = state ? `mentra-${state.userId.replace(/[^a-zA-Z0-9]/g, '-')}` : 'mentra-default';
    const key = state ? `mentra-${state.userId}` : 'mentra-default';
    const args = ['agent', '--to', target, '--message', message, '--json'];
    const sid = this._userSessions.get(key);
    if (sid) args.push('--session-id', sid);

    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Agent timeout')), TIMEOUT_MS);
      execFile('node', [this._clawBin, ...args], {
        env: { ...process.env, OPENCLAW_GATEWAY_TOKEN: this._clawToken },
        timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024,
      }, (err, stdout) => {
        clearTimeout(t);
        if (err) { this._queryDirect(message, state, opts).then(resolve).catch(reject); return; }
        try {
          const r = JSON.parse(stdout);
          const s = r.result?.meta?.agentMeta?.sessionId || r.sessionId;
          if (s) this._userSessions.set(key, s);
          resolve(r.result?.payloads?.[0]?.text || r.message || r.content || r.choices?.[0]?.message?.content || 'No response');
        } catch { resolve(stdout.trim() || 'No response'); }
      });
    });
  }

  /** Send response to glasses via TTS + display. */
  async onOutgoing({ content, session, state }) {
    if (!session) return;
    const hasDisp = session.capabilities?.hasDisplay !== false && !!session.layouts;
    const hasAud = session.capabilities?.hasSpeaker !== false && !!session.audio;
    if (hasDisp) { try { await session.layouts.showTextWall(stripMd(content)); } catch (e) { console.log('[mentra-channel] show err:', e.message); } }
    if (hasAud && this._controls.audioEnabled && this._normalize) {
      const txt = this._normalize(content);
      if (txt) {
        if (state) { state.startSpeaking(); state.recordSpoken(txt); }
        try {
          const o = { voice_id: this._ttsConfig.voiceId, model_id: this._ttsConfig.modelId };
          if (this._ttsConfig.voiceSettings) o.voice_settings = this._ttsConfig.voiceSettings;
          await session.audio.speak(txt, o);
        } catch (e) { console.error('[mentra-channel] TTS err:', e?.message); }
        finally { if (state) state.stopSpeaking(); }
      }
    }
  }

  // -- Internal --------------------------------------------------------------

  _speak(session, state, raw) {
    if (!session.capabilities?.hasSpeaker !== false || !session.audio || !this._controls.audioEnabled || !this._normalize) return Promise.resolve();
    const txt = this._normalize(raw); if (!txt) return Promise.resolve();
    state.startSpeaking(); state.recordSpoken(txt);
    const o = { voice_id: this._ttsConfig.voiceId, model_id: this._ttsConfig.modelId };
    if (this._ttsConfig.voiceSettings) o.voice_settings = this._ttsConfig.voiceSettings;
    return session.audio.speak(txt, o).catch(e => console.error('[mentra-channel] TTS err:', e?.message)).finally(() => state.stopSpeaking());
  }

  _onSession(session, sessionId, userId) {
    console.log(`[mentra-channel] SESSION ${sessionId} user=${userId}`);
    const state = new SessionState(sessionId, userId);
    this._sessions.set(sessionId, state);
    const hasD = session.capabilities?.hasDisplay !== false && !!session.layouts;
    const hasA = session.capabilities?.hasSpeaker !== false && !!session.audio;
    const show = (t) => hasD ? session.layouts.showTextWall(t).catch(() => {}) : Promise.resolve();
    const speak = (t) => hasA ? this._speak(session, state, t) : Promise.resolve();
    const stopAudio = async () => { if (hasA && session.audio.stop) try { await session.audio.stop(); } catch {} state.stopSpeaking(); };

    show('WeaveLogic AI\nReady'); if (hasA) speak('Ready');

    // Transcription -> agent pipeline -> response
    if (session.events?.onTranscription) session.events.onTranscription(async (d) => {
      if (!d.isFinal || !this._controls.micEnabled) return;
      if (this._controls.pttMode && !this._controls.pttActive) return;
      if (state.shouldIgnore() || !state.lock()) return;
      try {
        state.addMessage('user', d.text); await show('Thinking...');
        const resp = await this.onIncoming(d.text, state);
        state.addMessage('assistant', resp);
        await this.onOutgoing({ chatId: `mentra:${userId}`, content: resp, session, state });
      } catch (e) { console.error('[mentra-channel] Query fail:', e.message); await show('Error. Try again.'); }
      finally { state.unlock(); }
    });

    // Photo analysis
    if (session.events?.onPhotoTaken) session.events.onPhotoTaken(async (d) => {
      if (!state.lock()) return;
      try {
        await show('Analyzing...'); await speak('Analyzing photo');
        const resp = await this.onIncoming('What do you see? Be concise.', state, { imageBase64: Buffer.from(d.photoData).toString('base64'), model: this._visionModel || undefined });
        state.addMessage('user', '[Photo] What do you see?'); state.addMessage('assistant', resp);
        await this.onOutgoing({ chatId: `mentra:${userId}`, content: resp, session, state });
      } catch (e) { console.error('[mentra-channel] Photo fail:', e.message); await show('Could not analyze.'); }
      finally { state.unlock(); }
    });

    // Button: short=interrupt/listen, long=capture
    if (session.events?.onButtonPress) session.events.onButtonPress(async (d) => {
      if (d.pressType === 'short' && state.isSpeaking) { await stopAudio(); return; }
      if (d.pressType === 'long') {
        await speak('Capturing'); if (!state.lock()) return;
        try {
          const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
          const resp = await this.onIncoming('What do you see? Describe briefly.', state, { imageBase64: Buffer.from(photo.photoData).toString('base64'), model: this._visionModel || undefined });
          state.addMessage('user', '[Button photo]'); state.addMessage('assistant', resp);
          await this.onOutgoing({ chatId: `mentra:${userId}`, content: resp, session, state });
        } catch (e) { console.error('[mentra-channel] Capture fail:', e.message); await show('Could not capture.'); }
        finally { state.unlock(); }
      } else { await speak('Listening'); }
    });

    // Misc events
    if (session.events?.onHeadPosition) session.events.onHeadPosition(() => state.touch());
    if (session.events?.onPhoneNotifications) session.events.onPhoneNotifications(async (n) => {
      if (!n?.length) return;
      for (const x of n) { if (x.priority === 'high') { await show(`${x.app}: ${x.title}`); await speak(`${x.app}: ${x.title}`); } }
    });
    if (session.events?.onGlassesBattery) session.events.onGlassesBattery(async (d) => { if (d.batteryLevel <= 10) await speak(`Low battery: ${d.batteryLevel} percent`); });
    if (session.events?.onAppMessage) session.events.onAppMessage(() => state.touch());
    if (session.events?.onAppUserJoined) session.events.onAppUserJoined(() => {});
    if (session.events?.onAppUserLeft) session.events.onAppUserLeft(() => {});
    if (session.events?.onDisconnected) session.events.onDisconnected(() => { this._sessions.delete(sessionId); console.log(`[mentra-channel] Disconnected: ${sessionId}`); });
    if (session.events?.onReconnected) session.events.onReconnected(() => { console.log(`[mentra-channel] Reconnected: ${sessionId}`); speak('Reconnected'); });
    if (session.events?.onError) session.events.onError(e => console.error(`[mentra-channel] Err: ${e.message}`));

    try { if (session.dashboard?.content) session.dashboard.content.writeToMain('WeaveLogic AI - Active'); } catch {}
    try { if (session.updateSubscriptions) session.updateSubscriptions(); else if (session._updateSubscriptions) session._updateSubscriptions(); } catch {}
    console.log(`[mentra-channel] Handlers registered for ${sessionId}`);
  }

  async _queryDirect(message, state, opts = {}) {
    const msgs = [];
    if (this._sysPrompt) msgs.push({ role: 'system', content: this._sysPrompt });
    if (state) for (const m of state.buildContext()) { if (m.content !== message) msgs.push(m); }
    if (opts.imageBase64) {
      msgs.push({ role: 'user', content: [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${opts.imageBase64}` } }] });
    } else { msgs.push({ role: 'user', content: message }); }
    const body = { messages: msgs, max_tokens: this._maxTokens };
    if (opts.model) body.model = opts.model;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(`${this._clawUrl}/v1/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this._clawToken}` },
        body: JSON.stringify(body), signal: ac.signal,
      });
      if (!r.ok) { const x = await r.text().catch(() => ''); throw new Error(`OpenClaw ${r.status}: ${x.substring(0, 200)}`); }
      const d = await r.json(); return d.choices?.[0]?.message?.content || 'No response';
    } finally { clearTimeout(t); }
  }

  _setupRoutes(app) {
    app.use(require('express').json());
    app.get('/control', (_, r) => r.json(this._controls));
    app.post('/control/mic', (q, r) => { if (q.body.enabled !== undefined) this._controls.micEnabled = !!q.body.enabled; r.json(this._controls); });
    app.post('/control/audio', (q, r) => { if (q.body.enabled !== undefined) this._controls.audioEnabled = !!q.body.enabled; r.json(this._controls); });
    app.post('/control/ptt', (q, r) => { if (q.body.mode !== undefined) this._controls.pttMode = !!q.body.mode; if (q.body.active !== undefined) this._controls.pttActive = !!q.body.active; r.json(this._controls); });
    app.get('/channel/status', (_, r) => {
      const list = []; for (const [sid, st] of this._sessions) list.push({ sessionId: sid, userId: st.userId, messageCount: st.messageCount, lastActivity: st.lastActivity, isProcessing: st.isProcessing });
      r.json({ channel: 'mentra', status: this._status, sessions: list, controls: this._controls });
    });
  }
}

// Standalone entrypoint
if (require.main === module) {
  const ch = new MentraChannel();
  ch.start({ apiKey: process.env.MENTRAOS_API_KEY || process.env.MENTRA_API_KEY, packageName: process.env.MENTRA_PACKAGE_NAME, port: parseInt(process.env.MENTRA_BRIDGE_PORT || '7010', 10) })
    .catch(e => { console.error('[mentra-channel] Fatal:', e); process.exit(1); });
  const shutdown = async () => { await ch.stop(); process.exit(0); };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}

module.exports = { MentraChannel, SessionState };
