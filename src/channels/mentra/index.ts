/**
 * MentraChannel — OpenClaw Channel Plugin for Mentra Live Smart Glasses
 *
 * Implements the OpenClaw channel interface using the @mentra/sdk AppServer pattern.
 * Bridges voice transcription, camera capture, button events, and other glasses
 * sensor data to the OpenClaw agent via /v1/chat/completions.
 *
 * Based on the working implementation in skills/mentra-bridge/mentra-bridge.js,
 * rewritten in TypeScript with proper types and lifecycle management.
 *
 * Usage:
 *   const channel = new MentraChannel(config, openclawConfig);
 *   await channel.init();
 *   await channel.start();
 *   // ... channel is now listening for glasses connections
 *   await channel.stop();
 */

import type {
  MentraChannelConfig,
  MentraSession,
  MentraResponse,
  SessionCapabilities,
  TranscriptionData,
  ButtonPressData,
  PhotoTakenData,
  HeadPositionData,
  PhoneNotification,
  BatteryData,
  AppMessageData,
  OpenClawCompletionRequest,
  OpenClawCompletionResponse,
  OpenClawMessage,
  ToolCall,
} from './types';
import {
  resolveConfig,
  MAX_DISPLAY_CHARS,
  OPENCLAW_QUERY_TIMEOUT_MS,
  MAX_RESPONSE_TOKENS,
} from './config';
import { formatForGlasses } from '../../mentra/display-format';

// ---------------------------------------------------------------------------
// OpenClaw Gateway Config
// ---------------------------------------------------------------------------

export interface OpenClawGatewayConfig {
  /** URL of the OpenClaw gateway (e.g., 'http://localhost:18789') */
  url: string;

  /** Bearer token for gateway authentication */
  token: string;
}

// ---------------------------------------------------------------------------
// MentraChannel
// ---------------------------------------------------------------------------

/**
 * MentraChannel bridges Mentra Live smart glasses to the OpenClaw AI agent.
 *
 * Lifecycle:
 *   1. constructor() — stores config
 *   2. init() — validates config, prepares resources
 *   3. start() — starts the AppServer, begins accepting connections
 *   4. stop() — shuts down the AppServer, cleans up
 *
 * The AppServer receives WebSocket connections from MentraOS Cloud.
 * Each connection creates a session with event handlers for:
 *   - Voice transcription (onTranscription)
 *   - Photo capture (onPhotoTaken)
 *   - Button press (onButtonPress)
 *   - Head tracking (onHeadPosition)
 *   - Phone notifications (onPhoneNotifications)
 *   - Battery status (onGlassesBattery)
 *   - Multi-user messaging (onAppMessage, onAppUserJoined, onAppUserLeft)
 *   - Lifecycle (onDisconnected, onReconnected, onError)
 */
export class MentraChannel {
  private config: MentraChannelConfig;
  private openclawConfig: OpenClawGatewayConfig;
  private server: MentraAppServer | null = null;
  private activeSessions: Map<string, MentraSession> = new Map();

  constructor(
    channelConfig: Partial<MentraChannelConfig>,
    openclawConfig: OpenClawGatewayConfig,
  ) {
    this.config = resolveConfig(channelConfig);
    this.openclawConfig = openclawConfig;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /** Validate configuration and prepare resources */
  async init(): Promise<void> {
    console.log('[mentra-channel] Initializing...');
    console.log(`[mentra-channel] Package: ${this.config.packageName}`);
    console.log(`[mentra-channel] Port: ${this.config.port}`);
    console.log(`[mentra-channel] OpenClaw URL: ${this.openclawConfig.url}`);
    console.log(`[mentra-channel] Vision model: ${this.config.visionModel || '(default)'}`);
    console.log(`[mentra-channel] Default model: ${this.config.defaultModel || '(default)'}`);

    this.server = new MentraAppServer(this.config, this.openclawConfig, this.activeSessions);
  }

  /** Start the AppServer and begin accepting connections */
  async start(): Promise<void> {
    if (!this.server) {
      throw new Error('MentraChannel not initialized. Call init() first.');
    }

    console.log('[mentra-channel] Starting AppServer...');
    await this.server.start();
    console.log(`[mentra-channel] AppServer running on port ${this.config.port}`);
  }

  /** Stop the AppServer and clean up sessions */
  async stop(): Promise<void> {
    console.log('[mentra-channel] Stopping...');

    this.activeSessions.clear();

    if (this.server) {
      await this.server.stop();
      this.server = null;
    }

    console.log('[mentra-channel] Stopped');
  }

  /** Get the number of active sessions */
  get sessionCount(): number {
    return this.activeSessions.size;
  }

  /** Get the resolved config (for inspection/debugging) */
  get resolvedConfig(): Readonly<MentraChannelConfig> {
    return this.config;
  }
}

// ---------------------------------------------------------------------------
// MentraAppServer
// ---------------------------------------------------------------------------

/**
 * Internal AppServer implementation.
 * Subclasses @mentra/sdk AppServer and implements onSession + onToolCall.
 *
 * NOTE: In a real deployment, this would `extend AppServer` from '@mentra/sdk'.
 * Since @mentra/sdk is not available as a dev dependency in this project,
 * we define the interface and structure here for type safety. The actual
 * SDK import would replace the base class at build time.
 */
class MentraAppServer {
  private config: MentraChannelConfig;
  private openclawConfig: OpenClawGatewayConfig;
  private activeSessions: Map<string, MentraSession>;
  private started = false;

  constructor(
    config: MentraChannelConfig,
    openclawConfig: OpenClawGatewayConfig,
    activeSessions: Map<string, MentraSession>,
  ) {
    this.config = config;
    this.openclawConfig = openclawConfig;
    this.activeSessions = activeSessions;
  }

  // -----------------------------------------------------------------------
  // AppServer lifecycle (would be called by @mentra/sdk base class)
  // -----------------------------------------------------------------------

  async start(): Promise<void> {
    // In production, super.start() from @mentra/sdk would be called here.
    // It starts an Express server on this.config.port and connects to
    // MentraOS Cloud via WebSocket with the apiKey.
    this.started = true;
    console.log(`[mentra-server] AppServer started (packageName=${this.config.packageName})`);
  }

  async stop(): Promise<void> {
    this.started = false;
    console.log('[mentra-server] AppServer stopped');
  }

  // -----------------------------------------------------------------------
  // onSession — main session handler
  // -----------------------------------------------------------------------

  /** Called by the SDK when a user opens the app on their glasses. */
  async onSession(session: MentraSession, sessionId: string, userId: string): Promise<void> {
    console.log(`[mentra-session] SESSION: ${sessionId} user=${userId} caps=${JSON.stringify(session.capabilities || {})}`);

    this.activeSessions.set(sessionId, session);

    const caps = detectCapabilities(session);
    console.log(`[mentra-session] display=${caps.hasDisplay} speaker=${caps.hasSpeaker} camera=${caps.hasCamera}`);

    // Create display/audio helpers
    const showText = createShowText(session, caps);
    const speakText = createSpeakText(session, caps);

    // Send ready message
    await showText('WeaveLogic AI\nReady');
    await speakText('Ready');

    session.events.onTranscription(async (data: TranscriptionData) => {
      if (!data.isFinal) return;

      await showText('Thinking...');

      try {
        const response = await this.queryOpenClaw(data.text);
        const formatted = buildResponse(response);
        await showText(formatted.displayText);
        await speakText(formatted.audioText);
      } catch (err) {
        console.error('[mentra-session] Transcription query failed:', (err as Error).message);
        await speakText('Sorry, something went wrong. Please try again.');
      }
    });

    session.events.onPhotoTaken(async (data: PhotoTakenData) => {
      await showText('Analyzing...');
      await speakText('Analyzing photo');

      try {
        const base64 = arrayBufferToBase64(data.photoData);
        const model = this.config.visionModel || undefined;
        const response = await this.queryOpenClaw('What do you see? Be concise.', { imageBase64: base64, model });
        const formatted = buildResponse(response);
        await showText(formatted.displayText);
        await speakText(formatted.audioText);
      } catch (err) {
        console.error('[mentra-session] Photo query failed:', (err as Error).message);
        await speakText('Could not analyze image. Please try again.');
      }
    });

    session.events.onButtonPress(async (data: ButtonPressData) => {

      if (data.pressType === 'long') {
        await speakText('Capturing');
        try {
          const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
          const base64 = arrayBufferToBase64(photo.photoData);
          const model = this.config.visionModel || undefined;
          const response = await this.queryOpenClaw('What do you see? Describe briefly.', {
            imageBase64: base64,
            model,
          });
          const formatted = buildResponse(response);
          await showText(formatted.displayText);
          await speakText(formatted.audioText);
        } catch (err) {
          console.error('[mentra-session] Photo capture failed:', (err as Error).message);
          await speakText('Could not capture photo.');
        }
      } else {
        await speakText('Listening');
      }
    });

    session.events.onHeadPosition(async (_data: HeadPositionData) => {});

    session.events.onPhoneNotifications(async (notifications: PhoneNotification[]) => {
      if (!notifications || notifications.length === 0) return;

      for (const notif of notifications) {
        console.log(`[mentra-session] Notification: [${notif.app}] ${notif.title}`);
        if (notif.priority === 'high') {
          await showText(`${notif.app}: ${notif.title}`);
          await speakText(`${notif.app}: ${notif.title}`);
        }
      }
    });

    session.events.onGlassesBattery(async (data: BatteryData) => {
      if (data.batteryLevel !== undefined && data.batteryLevel <= 10) {
        await speakText(`Low battery: ${data.batteryLevel} percent`);
      }
    });

    session.events.onAppMessage(async (_message: AppMessageData) => {});
    session.events.onAppUserJoined(async (_userId: string) => {});
    session.events.onAppUserLeft(async (_userId: string) => {});

    session.events.onDisconnected(() => { this.activeSessions.delete(sessionId); });
    session.events.onReconnected(() => {
      this.activeSessions.set(sessionId, session);
      speakText('Reconnected').catch(console.error);
    });
    session.events.onError((error: Error) => { console.error(`[mentra-session] ${error.message}`); });

    try { session.dashboard?.content?.writeToMain('WeaveLogic AI - Active'); } catch { /* unsupported */ }

    // Force subscription update (SDK timing bug workaround)
    try { await session.updateSubscriptions?.(); } catch { /* optional */ }

    console.log(`[mentra-session] All handlers registered for ${sessionId}`);
  }

  // -----------------------------------------------------------------------
  // onToolCall — AI-triggered actions
  // -----------------------------------------------------------------------

  /**
   * Called by the SDK when the AI model invokes a tool.
   * Returns the tool result as a string, or undefined if unhandled.
   */
  async onToolCall(toolCall: ToolCall): Promise<string | undefined> {
    console.log(`[mentra-server] Tool call: ${toolCall.toolId}`, toolCall.toolParameters);

    switch (toolCall.toolId) {
      case 'ask_ai': {
        const question = (toolCall.toolParameters?.question as string) || 'No question provided';
        try {
          return await this.queryOpenClaw(question);
        } catch (err) {
          return `Error: ${(err as Error).message}`;
        }
      }
      case 'capture_photo': {
        return 'Photo capture triggered via tool call. Use the camera button on your glasses.';
      }
      default:
        return undefined;
    }
  }

  // -----------------------------------------------------------------------
  // OpenClaw Query
  // -----------------------------------------------------------------------

  /**
   * Send a query to the OpenClaw gateway and return the text response.
   * Supports optional base64 image data for vision queries.
   */
  private async queryOpenClaw(
    message: string,
    options: { imageBase64?: string; model?: string } = {},
  ): Promise<string> {
    const { imageBase64, model } = options;

    const messages: OpenClawMessage[] = [];

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

    const body: OpenClawCompletionRequest = {
      messages,
      max_tokens: MAX_RESPONSE_TOKENS,
    };
    if (model) body.model = model;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENCLAW_QUERY_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.openclawConfig.url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openclawConfig.token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenClaw ${res.status}: ${text.substring(0, 200)}`);
      }

      const data = (await res.json()) as OpenClawCompletionResponse;
      return data.choices?.[0]?.message?.content || 'No response';
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect session capabilities with safe defaults */
function detectCapabilities(session: MentraSession): SessionCapabilities {
  return {
    hasDisplay: session.capabilities?.hasDisplay !== false && !!session.layouts,
    hasSpeaker: session.capabilities?.hasSpeaker !== false && !!session.audio,
    hasCamera: session.capabilities?.hasCamera !== false && !!session.camera,
    hasMicrophone: session.capabilities?.hasMicrophone !== false,
  };
}

/** Create a safe text display helper */
function createShowText(
  session: MentraSession,
  caps: SessionCapabilities,
): (text: string) => Promise<void> {
  return async (text: string) => {
    if (!caps.hasDisplay) return;
    try {
      await session.layouts.showTextWall(text);
    } catch (e) {
      console.log('[mentra-session] showTextWall error:', (e as Error).message);
    }
  };
}

/** Create a safe TTS helper */
function createSpeakText(
  session: MentraSession,
  caps: SessionCapabilities,
): (text: string) => Promise<void> {
  return async (text: string) => {
    if (!caps.hasSpeaker) return;
    try {
      await session.audio.speak(text);
    } catch (e) {
      console.error('[mentra-session] TTS error:', (e as Error).message);
    }
  };
}

/** Build a MentraResponse with formatted display text and audio text */
function buildResponse(rawText: string): MentraResponse {
  return {
    text: rawText,
    displayText: formatForGlasses(rawText),
    audioText: rawText,
  };
}

/** Convert ArrayBuffer to base64 string */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Re-exports from sibling modules
export { resolveConfig, validateConfig, configFromEnv, MENTRA_CHANNEL_DEFAULTS } from './config';
