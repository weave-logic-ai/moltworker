#!/usr/bin/env node
/**
 * MentraOS AppServer Bridge
 *
 * Runs inside the Cloudflare Container alongside OpenClaw gateway.
 * Receives events from Mentra Live glasses via WebSocket and forwards
 * them to OpenClaw's /v1/chat/completions on localhost:18789.
 *
 * Handles: transcription, photos, buttons, head position, notifications,
 * battery, location, app-to-app messaging, and lifecycle events.
 */

const { AppServer } = require('@mentra/sdk');

// OpenClaw can be on localhost (same container) or via Worker URL (separate container)
const OPENCLAW_URL = process.env.OPENCLAW_URL || `http://localhost:${process.env.OPENCLAW_PORT || 18789}`;
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const MENTRA_PORT = parseInt(process.env.MENTRA_BRIDGE_PORT || '7010', 10);
const PACKAGE_NAME = process.env.MENTRA_PACKAGE_NAME || 'mentra-claw';
const API_KEY = process.env.MENTRAOS_API_KEY || process.env.MENTRA_API_KEY || '';
const VISION_MODEL = process.env.MENTRA_VISION_MODEL || '';
const DEFAULT_MODEL = process.env.MENTRA_DEFAULT_MODEL || '';
const MAX_DISPLAY_CHARS = 220;

if (!API_KEY) {
  console.error('[mentra-bridge] MENTRAOS_API_KEY or MENTRA_API_KEY not set, exiting');
  process.exit(1);
}

/**
 * Format text for glasses HUD (~40 chars wide, ~6 lines)
 */
function formatForGlasses(text) {
  let clean = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (clean.length > MAX_DISPLAY_CHARS) clean = clean.substring(0, MAX_DISPLAY_CHARS - 3) + '...';
  return clean;
}

/**
 * Call OpenClaw's Chat Completions API on localhost
 */
async function queryOpenClaw(message, options = {}) {
  const { imageBase64, model } = options;

  const messages = [];

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: message },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: message });
  }

  const body = {
    messages,
    max_tokens: 256,
  };
  if (model) body.model = model;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenClaw ${res.status}: ${text.substring(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response';
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

// ============================================================
// AppServer
// ============================================================

class OpenClawBridge extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: API_KEY,
      port: MENTRA_PORT,
    });
  }

  async onSession(session, sessionId, userId) {
    console.log(`[mentra-bridge] Session started: ${sessionId} (user: ${userId})`);
    console.log(`[mentra-bridge] Capabilities:`, JSON.stringify(session.capabilities || {}));

    const hasDisplay = session.capabilities?.hasDisplay !== false && session.layouts;
    const hasAudio = session.capabilities?.hasSpeaker !== false;

    // Helper: show on display if available, speak if audio available
    const showText = async (text) => {
      if (hasDisplay) {
        try { await session.layouts.showTextWall(text); } catch (e) { /* no display */ }
      }
    };
    const speakText = async (text) => {
      if (hasAudio && session.audio) {
        try { await session.audio.speak(text); } catch (e) { console.error('[mentra-bridge] TTS error:', e.message); }
      }
    };

    // Ready message
    if (hasDisplay) await showText('WeaveLogic AI\nReady');
    if (hasAudio) await speakText('Ready');

    // ── Transcription (voice → AI → audio response) ──────────────────
    session.events.onTranscription(async (data) => {
      if (!data.isFinal) return;

      console.log(`[mentra-bridge] Transcription: "${data.text}" (lang: ${data.transcribeLanguage}, confidence: ${data.confidence})`);
      await showText('Thinking...');

      try {
        const response = await queryOpenClaw(data.text);
        await showText(formatForGlasses(response));
        await speakText(response);
      } catch (err) {
        console.error('[mentra-bridge] Transcription query failed:', err.message);
        await showText('Sorry, try again.');
        await speakText('Sorry, something went wrong. Please try again.');
      }
    });

    // ── Photo (camera → AI vision → audio) ──────────────────
    session.events.onPhotoTaken(async (data) => {
      console.log(`[mentra-bridge] Photo received: ${data.mimeType}, ${data.photoData.byteLength} bytes`);
      await showText('Analyzing...');
      await speakText('Analyzing photo');

      try {
        const base64 = arrayBufferToBase64(data.photoData);
        const model = VISION_MODEL || undefined;
        const response = await queryOpenClaw('What do you see? Be concise.', { imageBase64: base64, model });
        await showText(formatForGlasses(response));
        await speakText(response);
      } catch (err) {
        console.error('[mentra-bridge] Photo query failed:', err.message);
        await speakText('Could not analyze image. Please try again.');
      }
    });

    // ── Button press ──────────────────────────────────────────
    session.events.onButtonPress(async (data) => {
      console.log(`[mentra-bridge] Button: ${data.buttonId} ${data.pressType}`);

      if (data.pressType === 'long') {
        await speakText('Capturing');
        try {
          const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
          const base64 = arrayBufferToBase64(photo.photoData);
          const model = VISION_MODEL || undefined;
          const response = await queryOpenClaw('What do you see? Describe briefly.', { imageBase64: base64, model });
          await showText(formatForGlasses(response));
          await speakText(response);
        } catch (err) {
          console.error('[mentra-bridge] Photo capture failed:', err.message);
          await speakText('Could not capture photo.');
        }
      } else {
        await speakText('Listening');
      }
    });

    // ── Head position ─────────────────────────────────────────
    session.events.onHeadPosition(async (data) => {
      console.log(`[mentra-bridge] Head position: ${data.position}`);
      // Could trigger actions based on head up/down
    });

    // ── Phone notifications ───────────────────────────────────
    session.events.onPhoneNotifications(async (notifications) => {
      if (!notifications || notifications.length === 0) return;

      for (const notif of notifications) {
        console.log(`[mentra-bridge] Notification: [${notif.app}] ${notif.title}`);

        if (notif.priority === 'high') {
          await showText(`${notif.app}: ${notif.title}`);
          await speakText(`${notif.app}: ${notif.title}`);
        }
      }
    });

    // ── Battery status ────────────────────────────────────────
    session.events.onGlassesBattery(async (data) => {
      if (data.batteryLevel !== undefined && data.batteryLevel <= 10) {
        console.log(`[mentra-bridge] Low battery: ${data.batteryLevel}%`);
        await speakText(`Low battery: ${data.batteryLevel} percent`);
      }
    });

    // ── App-to-app messaging ──────────────────────────────────
    session.events.onAppMessage(async (message) => {
      console.log(`[mentra-bridge] App message from ${message.senderUserId}:`, message.payload);
    });

    session.events.onAppUserJoined(async (joinedUserId) => {
      console.log(`[mentra-bridge] User joined: ${joinedUserId}`);
    });

    session.events.onAppUserLeft(async (leftUserId) => {
      console.log(`[mentra-bridge] User left: ${leftUserId}`);
    });

    // ── Lifecycle events ──────────────────────────────────────
    session.events.onDisconnected(() => {
      console.log(`[mentra-bridge] Session disconnected: ${sessionId}`);
    });

    session.events.onReconnected(() => {
      console.log(`[mentra-bridge] Session reconnected: ${sessionId}`);
      speakText('Reconnected').catch(console.error);
    });

    session.events.onError((error) => {
      console.error(`[mentra-bridge] Session error: ${error.message}`);
    });

    // ── Dashboard ─────────────────────────────────────────────
    try {
      if (session.dashboard && session.dashboard.content) {
        session.dashboard.content.writeToMain('WeaveLogic AI - Active');
      }
    } catch (e) {
      // Dashboard may not be supported on all devices
    }

    console.log(`[mentra-bridge] All event handlers registered for ${sessionId}`);
  }

  // ── Tool calls (AI-triggered actions) ────────────────────────
  async onToolCall(toolCall) {
    console.log(`[mentra-bridge] Tool call: ${toolCall.toolId}`, toolCall.toolParameters);

    switch (toolCall.toolId) {
      case 'ask_ai': {
        const question = toolCall.toolParameters?.question || 'No question provided';
        try {
          return await queryOpenClaw(question);
        } catch (err) {
          return `Error: ${err.message}`;
        }
      }
      case 'capture_photo': {
        return 'Photo capture triggered via tool call. Use the camera button on your glasses.';
      }
      default:
        return undefined;
    }
  }
}

// ============================================================
// Start
// ============================================================

async function main() {
  // Wait briefly then start (OpenClaw may be in a separate container)
  console.log(`[mentra-bridge] OpenClaw URL: ${OPENCLAW_URL}`);
  console.log(`[mentra-bridge] Starting bridge...`);

  const server = new OpenClawBridge();

  // Add webview route before starting
  const app = server.getExpressApp();
  app.get('/webview', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WeaveLogic AI</title>
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }
  h1 { color: #e94560; font-size: 1.5em; }
  .status { background: #16213e; padding: 15px; border-radius: 10px; margin: 10px 0; }
  .active { border-left: 3px solid #0f3460; }
  p { line-height: 1.6; }
</style>
</head><body>
<h1>WeaveLogic AI</h1>
<div class="status active">
  <p><strong>Status:</strong> Connected</p>
  <p><strong>Model:</strong> Google Gemini 2.0 Flash</p>
  <p><strong>Provider:</strong> OpenRouter</p>
</div>
<div class="status">
  <p><strong>Voice Commands:</strong> Speak naturally — your voice is transcribed and sent to the AI.</p>
  <p><strong>Camera:</strong> Long-press the button to capture and analyze what you see.</p>
  <p><strong>Short Press:</strong> Activates listening mode.</p>
</div>
</body></html>`);
  });

  await server.start();
  console.log(`[mentra-bridge] AppServer running on port ${MENTRA_PORT}`);
  console.log(`[mentra-bridge] Package: ${PACKAGE_NAME}`);
  console.log(`[mentra-bridge] Forwarding to OpenClaw on localhost:${OPENCLAW_PORT}`);
}

main().catch((err) => {
  console.error('[mentra-bridge] Fatal error:', err);
  process.exit(1);
});
