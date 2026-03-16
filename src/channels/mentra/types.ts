/**
 * TypeScript types for the Mentra OpenClaw channel plugin.
 *
 * Defines the interfaces for channel configuration, messages, responses,
 * session capabilities, and event handlers based on the @mentra/sdk AppServer API.
 */

// ---------------------------------------------------------------------------
// Channel Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for the Mentra channel plugin.
 * Corresponds to the `channels.mentra` section in openclaw.json.
 */
export interface MentraChannelConfig {
  /** MentraOS Cloud API key (MENTRAOS_API_KEY or MENTRA_API_KEY) */
  apiKey: string;

  /** App package name registered with MentraOS Cloud */
  packageName: string;

  /** Port the AppServer listens on for WebSocket connections from MentraOS Cloud */
  port: number;

  /** Vision-capable model override for photo analysis (e.g., 'gpt-4o', 'gemini-2.0-flash') */
  visionModel: string;

  /** Default text model override */
  defaultModel: string;

  /** Whether the channel is enabled */
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * A message from Mentra glasses to the OpenClaw agent.
 * Constructed from transcription events, photo events, or button actions.
 */
export interface MentraMessage {
  /** Transcribed text or constructed prompt */
  text: string;

  /** Base64-encoded JPEG image data from glasses camera (optional) */
  imageBase64?: string;

  /** MentraOS user identifier */
  userId: string;

  /** MentraOS session identifier */
  sessionId: string;
}

/**
 * A response from the OpenClaw agent back to the Mentra glasses.
 * Contains both display-formatted and audio-formatted versions.
 */
export interface MentraResponse {
  /** Raw response text from the AI model */
  text: string;

  /** Text formatted for glasses HUD (~40 chars wide, ~6 lines, 220 char max) */
  displayText: string;

  /** Text to be spoken via TTS (may differ from displayText -- full response) */
  audioText: string;
}

// ---------------------------------------------------------------------------
// Session Capabilities
// ---------------------------------------------------------------------------

/**
 * Hardware capabilities of the connected Mentra glasses session.
 * Determined at session start from session.capabilities.
 */
export interface SessionCapabilities {
  /** Whether the glasses have a display (HUD) */
  hasDisplay: boolean;

  /** Whether the glasses have a speaker for TTS output */
  hasSpeaker: boolean;

  /** Whether the glasses have a camera */
  hasCamera: boolean;

  /** Whether the glasses have a microphone for transcription */
  hasMicrophone: boolean;
}

// ---------------------------------------------------------------------------
// Event Data Types (from @mentra/sdk)
// ---------------------------------------------------------------------------

/** Transcription event data from glasses microphone */
export interface TranscriptionData {
  /** Transcribed text */
  text: string;

  /** Whether this is the final (non-interim) transcription */
  isFinal: boolean;

  /** Language code (e.g., 'en-US') */
  transcribeLanguage: string;

  /** Speech start timestamp */
  startTime?: number;

  /** Speech end timestamp */
  endTime?: number;

  /** Confidence score (0-1) */
  confidence?: number;

  /** Transcription provider used */
  provider?: string;
}

/** Button press event data */
export interface ButtonPressData {
  /** Button identifier (e.g., 'main') */
  buttonId: string;

  /** Press type */
  pressType: 'short' | 'long';
}

/** Photo capture event data */
export interface PhotoTakenData {
  /** Raw photo data as ArrayBuffer */
  photoData: ArrayBuffer;

  /** MIME type of the photo (e.g., 'image/jpeg') */
  mimeType: string;
}

/** Head position tracking data */
export interface HeadPositionData {
  /** Head position */
  position: 'up' | 'down' | 'center';
}

/** Phone notification forwarded to glasses */
export interface PhoneNotification {
  /** Source app name */
  app: string;

  /** Notification title */
  title: string;

  /** Notification body content */
  content?: string;

  /** Priority level */
  priority?: 'high' | 'normal' | 'low';
}

/** Battery status data */
export interface BatteryData {
  /** Battery level percentage (0-100) */
  batteryLevel: number;

  /** Whether the glasses are charging */
  isCharging?: boolean;
}

/** App-to-app message */
export interface AppMessageData {
  /** Sender's MentraOS user ID */
  senderUserId: string;

  /** Message payload (arbitrary JSON) */
  payload: unknown;
}

// ---------------------------------------------------------------------------
// Event Handlers Interface
// ---------------------------------------------------------------------------

/**
 * All event handler types supported by the Mentra channel.
 * Maps to session.events.* methods from @mentra/sdk.
 */
export interface MentraEventHandlers {
  /** Voice transcription (interim and final) */
  onTranscription: (data: TranscriptionData) => Promise<void> | void;

  /** Language-specific transcription */
  onTranscriptionForLanguage: (lang: string, data: TranscriptionData) => Promise<void> | void;

  /** Hardware button press */
  onButtonPress: (data: ButtonPressData) => Promise<void> | void;

  /** Photo captured from glasses camera */
  onPhotoTaken: (data: PhotoTakenData) => Promise<void> | void;

  /** Head position change (up/down/center) */
  onHeadPosition: (data: HeadPositionData) => Promise<void> | void;

  /** Phone notifications forwarded to glasses */
  onPhoneNotifications: (notifications: PhoneNotification[]) => Promise<void> | void;

  /** Glasses battery status update */
  onGlassesBattery: (data: BatteryData) => Promise<void> | void;

  /** App-to-app messaging */
  onAppMessage: (message: AppMessageData) => Promise<void> | void;

  /** User joined the app session */
  onAppUserJoined: (userId: string) => Promise<void> | void;

  /** User left the app session */
  onAppUserLeft: (userId: string) => Promise<void> | void;

  /** WebSocket connection lost */
  onDisconnected: () => Promise<void> | void;

  /** WebSocket connection restored */
  onReconnected: () => Promise<void> | void;

  /** Session error */
  onError: (error: Error) => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Session Interface (typed version of @mentra/sdk session)
// ---------------------------------------------------------------------------

/**
 * Typed version of the MentraOS session object.
 * Received in AppServer.onSession().
 */
export interface MentraSession {
  capabilities: Partial<SessionCapabilities>;
  isConnected: boolean;

  layouts: {
    showTextWall(text: string): Promise<void>;
    showDoubleTextWall(top: string, bottom: string): Promise<void>;
    showReferenceCard(opts: { title: string; text: string }): Promise<void>;
    showDashboardCard(opts: { left: string; right: string }): Promise<void>;
    showBitmapView(opts: { width: number; height: number; bitmap: ArrayBuffer }): Promise<void>;
    clearView(): Promise<void>;
  };

  audio: {
    speak(text: string, opts?: { language?: string; voice?: string }): Promise<void>;
    play(url: string, opts?: { volume?: number }): Promise<void>;
    stop(): Promise<void>;
  };

  camera: {
    requestPhoto(opts?: { purpose?: string; metadata?: Record<string, string> }): Promise<PhotoTakenData>;
    startStream(opts: { rtmpUrl?: string; managed?: boolean; title?: string }): Promise<void>;
    stopStream(): Promise<void>;
  };

  location: {
    subscribeToStream(
      opts: Record<string, unknown>,
      cb: (loc: { lat: number; lng: number; accuracy?: number }) => void,
    ): Promise<void>;
    getLatestLocation(opts: Record<string, unknown>): Promise<{ lat: number; lng: number; accuracy?: number }>;
    unsubscribeFromStream(): Promise<void>;
  };

  events: {
    onTranscription(handler: (data: TranscriptionData) => void): () => void;
    onTranscriptionForLanguage(lang: string, handler: (data: TranscriptionData) => void): () => void;
    onButtonPress(handler: (data: ButtonPressData) => void): () => void;
    onPhotoTaken(handler: (data: PhotoTakenData) => void): () => void;
    onHeadPosition(handler: (data: HeadPositionData) => void): () => void;
    onPhoneNotifications(handler: (data: PhoneNotification[]) => void): () => void;
    onGlassesBattery(handler: (data: BatteryData) => void): () => void;
    onAppMessage(handler: (data: AppMessageData) => void): () => void;
    onAppUserJoined(handler: (userId: string) => void): () => void;
    onAppUserLeft(handler: (userId: string) => void): () => void;
    onDisconnected(handler: () => void): () => void;
    onReconnected(handler: () => void): () => void;
    onConnected(handler: (settings: unknown) => void): () => void;
    onError(handler: (error: Error) => void): () => void;
  };

  dashboard: {
    content: { writeToMain(text: string): void };
    write(opts: { text: string }, config: { targets: string[] }): Promise<void>;
    onModeChange(handler: (mode: string) => void): void;
  };

  settings: {
    get(key: string, defaultValue?: string): Promise<string>;
    has(key: string): Promise<boolean>;
    on(key: string, handler: (value: unknown) => void): void;
    onChange(handler: (key: string, value: unknown) => void): void;
  };

  updateSubscriptions?(): Promise<void>;

  broadcastToAppUsers(payload: unknown): Promise<void>;
  sendDirectMessage(userId: string, payload: unknown): Promise<void>;
  discoverAppUsers(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// OpenClaw Integration Types
// ---------------------------------------------------------------------------

/** OpenClaw chat completion request (subset of OpenAI API) */
export interface OpenClawCompletionRequest {
  messages: OpenClawMessage[];
  max_tokens?: number;
  model?: string;
}

/** OpenClaw message format */
export type OpenClawMessage =
  | { role: 'user' | 'assistant' | 'system'; content: string }
  | { role: 'user'; content: OpenClawMultimodalContent[] };

/** Multimodal content for vision queries */
export type OpenClawMultimodalContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

/** OpenClaw chat completion response (subset of OpenAI API) */
export interface OpenClawCompletionResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

// ---------------------------------------------------------------------------
// Tool Call Types
// ---------------------------------------------------------------------------

/** Tool call from the AI model */
export interface ToolCall {
  toolId: string;
  toolParameters?: Record<string, unknown>;
}
