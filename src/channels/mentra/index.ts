/**
 * MentraChannel -- OpenClaw Channel Plugin for Mentra Live Smart Glasses.
 *
 * Bridges voice transcription, camera capture, button events, and sensor data
 * to the OpenClaw agent via /v1/chat/completions.
 *
 * Week 2: SessionState (context-aware responses), AudioPipeline (managed TTS),
 * createMentraChannel() factory function.
 */

import type {
  MentraChannelConfig,
  MentraSession,
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
  configFromEnv,
  OPENCLAW_QUERY_TIMEOUT_MS,
  MAX_RESPONSE_TOKENS,
} from './config';
import { SessionState } from './session-state';
import { AudioPipeline } from './audio-pipeline';
import { detectCapabilities, createShowText, buildResponse, arrayBufferToBase64 } from './helpers';

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
// Factory Function
// ---------------------------------------------------------------------------

/**
 * Create a MentraChannel from environment variables.
 *
 * Reads MENTRAOS_API_KEY, MENTRA_PACKAGE_NAME, MENTRA_BRIDGE_PORT, etc.
 * from the provided env object, merges with defaults, and returns a
 * ready-to-init MentraChannel instance.
 */
export function createMentraChannel(
  env: Record<string, string | undefined>,
): MentraChannel {
  const channelConfig = configFromEnv(env);
  const openclawConfig: OpenClawGatewayConfig = {
    url: env.OPENCLAW_URL || `http://localhost:${env.OPENCLAW_PORT || '18789'}`,
    token: env.OPENCLAW_GATEWAY_TOKEN || '',
  };

  return new MentraChannel(channelConfig, openclawConfig);
}

// ---------------------------------------------------------------------------
// MentraChannel
// ---------------------------------------------------------------------------

/** Bridges Mentra Live smart glasses to the OpenClaw AI agent. */
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
 * Internal AppServer stub. In production this needs `extends AppServer`
 * from '@mentra/sdk' to connect to MentraOS Cloud.  We do NOT import
 * @mentra/sdk here because it is a runtime-only CommonJS dependency that
 * is not available in the TypeScript build (see mentra-bridge.cjs).
 */
class MentraAppServer {
  private config: MentraChannelConfig;
  private openclawConfig: OpenClawGatewayConfig;
  private activeSessions: Map<string, MentraSession>;
  private sessionStates: Map<string, SessionState> = new Map();
  private audioPipelines: Map<string, AudioPipeline> = new Map();
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
    this.sessionStates.clear();
    this.audioPipelines.clear();
    console.log('[mentra-server] AppServer stopped');
  }

  // -----------------------------------------------------------------------
  // onSession -- main session handler
  // -----------------------------------------------------------------------

  /** Called by the SDK when a user opens the app on their glasses. */
  async onSession(session: MentraSession, sessionId: string, userId: string): Promise<void> {
    console.log(`[mentra-session] SESSION: ${sessionId} user=${userId} caps=${JSON.stringify(session.capabilities || {})}`);

    this.activeSessions.set(sessionId, session);

    const caps = detectCapabilities(session);
    console.log(`[mentra-session] display=${caps.hasDisplay} speaker=${caps.hasSpeaker} camera=${caps.hasCamera}`);

    // Initialize per-session state and audio pipeline
    const state = new SessionState(sessionId, userId, caps);
    this.sessionStates.set(sessionId, state);

    const audio = new AudioPipeline(session, caps.hasSpeaker);
    this.audioPipelines.set(sessionId, audio);

    // Wire echo detection: audio pipeline notifies session state of speaking changes
    audio.onSpeakingChange = (speaking: boolean) => {
      if (speaking) state.startSpeaking();
      else state.stopSpeaking();
    };

    // Create display helper
    const showText = createShowText(session, caps);

    // Send ready message
    await showText('WeaveLogic AI\nReady');
    await audio.speak('Ready');

    // Play connect sound
    await audio.playSound('connect');

    // -- Transcription (voice -> AI -> audio response) --------------------
    // Guard: SDK doesn't guarantee all event handlers exist at runtime.
    if (session.events.onTranscription) {
      session.events.onTranscription(async (data: TranscriptionData) => {
        if (!data.isFinal) return;

        // Block transcription while speaking or in echo cooldown
        if (state.shouldIgnoreTranscription()) {
          console.log('[mentra-session] Speaking/cooldown, ignoring transcription');
          return;
        }

        // Queue: prevent concurrent OpenClaw requests per session
        if (!state.acquireProcessingLock()) {
          console.log(`[mentra-session] Busy, queuing: "${data.text.substring(0, 40)}..."`);
          return;
        }

        try {
          // Record user message
          state.addMessage('user', data.text);

          await showText('Thinking...');

          const response = await this.queryOpenClaw(data.text, state);
          const formatted = buildResponse(response);

          // Record assistant response
          state.addMessage('assistant', response);

          await showText(formatted.displayText);
          await audio.speak(formatted.audioText);
        } catch (err) {
          console.error('[mentra-session] Transcription query failed:', (err as Error).message);
          await audio.playSound('error');
          await audio.speak('Sorry, something went wrong. Please try again.');
        } finally {
          state.releaseProcessingLock();
        }
      });
    }

    // -- Photo (camera -> AI vision -> audio) -----------------------------
    if (session.events.onPhotoTaken) {
      session.events.onPhotoTaken(async (data: PhotoTakenData) => {
        if (!state.acquireProcessingLock()) return;

        try {
          await showText('Analyzing...');
          await audio.speak('Analyzing photo');

          const base64 = arrayBufferToBase64(data.photoData);
          const model = this.config.visionModel || undefined;
          const response = await this.queryOpenClaw('What do you see? Be concise.', state, {
            imageBase64: base64,
            model,
          });
          const formatted = buildResponse(response);

          state.addMessage('user', '[Photo taken] What do you see?');
          state.addMessage('assistant', response);

          await showText(formatted.displayText);
          await audio.speak(formatted.audioText);
        } catch (err) {
          console.error('[mentra-session] Photo query failed:', (err as Error).message);
          await audio.playSound('error');
          await audio.speak('Could not analyze image. Please try again.');
        } finally {
          state.releaseProcessingLock();
        }
      });
    }

    // -- Button press ------------------------------------------------------
    if (session.events.onButtonPress) {
      session.events.onButtonPress(async (data: ButtonPressData) => {
        // Short press during audio -> interrupt (stop audio)
        if (data.pressType === 'short' && audio.isPlaying) {
          await audio.stopAudio();
          return;
        }

        if (data.pressType === 'long') {
          // Long press -> capture photo for AI analysis
          await audio.speak('Capturing');

          if (!state.acquireProcessingLock()) return;

          try {
            const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
            const base64 = arrayBufferToBase64(photo.photoData);
            const model = this.config.visionModel || undefined;
            const response = await this.queryOpenClaw('What do you see? Describe briefly.', state, {
              imageBase64: base64,
              model,
            });
            const formatted = buildResponse(response);

            state.addMessage('user', '[Long press photo] What do you see?');
            state.addMessage('assistant', response);

            await showText(formatted.displayText);
            await audio.speak(formatted.audioText);
          } catch (err) {
            console.error('[mentra-session] Photo capture failed:', (err as Error).message);
            await audio.playSound('error');
            await audio.speak('Could not capture photo.');
          } finally {
            state.releaseProcessingLock();
          }
        } else {
          // Short press (not during audio) -> listening feedback
          await audio.speak('Listening');
        }
      });
    }

    // -- Head position ----------------------------------------------------
    if (session.events.onHeadPosition) {
      session.events.onHeadPosition(async (_data: HeadPositionData) => {
        state.touch();
      });
    }

    // -- Phone notifications ----------------------------------------------
    if (session.events.onPhoneNotifications) {
      session.events.onPhoneNotifications(async (notifications: PhoneNotification[]) => {
        if (!notifications || notifications.length === 0) return;

        for (const notif of notifications) {
          console.log(`[mentra-session] Notification: [${notif.app}] ${notif.title}`);
          if (notif.priority === 'high') {
            await showText(`${notif.app}: ${notif.title}`);
            await audio.playSound('notification');
            await audio.speak(`${notif.app}: ${notif.title}`);
          }
        }
      });
    }

    // -- Battery status ---------------------------------------------------
    if (session.events.onGlassesBattery) {
      session.events.onGlassesBattery(async (data: BatteryData) => {
        if (data.batteryLevel !== undefined && data.batteryLevel <= 10) {
          await audio.speak(`Low battery: ${data.batteryLevel} percent`);
        }
      });
    }

    // -- App-to-app messaging ---------------------------------------------
    if (session.events.onAppMessage) {
      session.events.onAppMessage(async (_message: AppMessageData) => {
        state.touch();
      });
    }
    if (session.events.onAppUserJoined) session.events.onAppUserJoined(async (_userId: string) => {});
    if (session.events.onAppUserLeft) session.events.onAppUserLeft(async (_userId: string) => {});

    // -- Lifecycle events -------------------------------------------------
    if (session.events.onDisconnected) {
      session.events.onDisconnected(() => {
        this.activeSessions.delete(sessionId);
        this.sessionStates.delete(sessionId);
        this.audioPipelines.delete(sessionId);
      });
    }

    if (session.events.onReconnected) {
      session.events.onReconnected(() => {
        this.activeSessions.set(sessionId, session);
        // Re-create audio pipeline for the reconnected session
        const reconnectedAudio = new AudioPipeline(session, caps.hasSpeaker);
        this.audioPipelines.set(sessionId, reconnectedAudio);
        reconnectedAudio.speak('Reconnected').catch(console.error);
      });
    }

    if (session.events.onError) {
      session.events.onError((error: Error) => {
        console.error(`[mentra-session] ${error.message}`);
      });
    }

    try { session.dashboard?.content?.writeToMain('WeaveLogic AI - Active'); } catch { /* unsupported */ }

    // Force subscription update (SDK timing bug workaround)
    // The SDK's bug007-fix-v2 patch may count 0 handlers before we register them.
    // Manually trigger subscription refresh after handlers are set.
    try { await session.updateSubscriptions?.(); } catch { /* optional */ }

    console.log(`[mentra-session] All handlers registered for ${sessionId} (state tracking active)`);
  }

  // -----------------------------------------------------------------------
  // onToolCall -- AI-triggered actions
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
   *
   * When a SessionState is provided, conversation context (last 10 messages)
   * is prepended to the request for context-aware responses.
   */
  private async queryOpenClaw(
    message: string,
    sessionState?: SessionState,
    options: { imageBase64?: string; model?: string } = {},
  ): Promise<string> {
    const { imageBase64, model } = options;

    const messages: OpenClawMessage[] = [];

    // Include conversation context if available
    if (sessionState) {
      const contextMessages = sessionState.buildContextMessages();
      // Only include text-based context (skip the current message which we add below)
      // Exclude the last message if it matches what we're about to send
      for (const ctx of contextMessages) {
        if (ctx.content !== message) {
          messages.push({ role: ctx.role, content: ctx.content });
        }
      }
    }

    // Add the current user message
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

// Re-exports from sibling modules
export { resolveConfig, validateConfig, configFromEnv, MENTRA_CHANNEL_DEFAULTS } from './config';
export { SessionState } from './session-state';
export type { ConversationMessage, SessionMetadata } from './session-state';
export { AudioPipeline } from './audio-pipeline';
