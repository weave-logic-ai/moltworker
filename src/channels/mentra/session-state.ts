/**
 * Session state management for Mentra channel.
 *
 * Tracks per-session conversation history, metadata, and processing locks
 * to enable context-aware responses and prevent concurrent OpenClaw requests.
 */

import type { SessionCapabilities } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface SessionMetadata {
  userId: string;
  sessionId: string;
  startTime: number;
  messageCount: number;
  lastActivity: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum messages to keep in conversation history */
const MAX_HISTORY_LENGTH = 20;

/** Number of recent messages to include as context for OpenClaw requests */
const CONTEXT_WINDOW_SIZE = 10;

/** Cooldown in ms after TTS finishes before transcription is accepted again */
const ECHO_COOLDOWN_MS = 3000;

// ---------------------------------------------------------------------------
// SessionState
// ---------------------------------------------------------------------------

/**
 * Tracks per-session data including conversation history, metadata,
 * processing locks, and hardware capabilities.
 *
 * Each MentraOS session (one connected pair of glasses) gets its own
 * SessionState instance.
 */
export class SessionState {
  private conversationHistory: ConversationMessage[] = [];
  private _isProcessing = false;
  private _messageCount = 0;
  private _lastActivity: number;
  private _capabilities: SessionCapabilities;
  private _isSpeaking = false;
  private _speakingEndAt = 0;

  readonly userId: string;
  readonly sessionId: string;
  readonly startTime: number;

  constructor(
    sessionId: string,
    userId: string,
    capabilities: SessionCapabilities,
  ) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.startTime = Date.now();
    this._lastActivity = this.startTime;
    this._capabilities = capabilities;
  }

  // -----------------------------------------------------------------------
  // Conversation History
  // -----------------------------------------------------------------------

  /**
   * Add a message to the conversation history.
   * Automatically trims to the last MAX_HISTORY_LENGTH messages.
   */
  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: Date.now(),
    });

    if (this.conversationHistory.length > MAX_HISTORY_LENGTH) {
      this.conversationHistory = this.conversationHistory.slice(
        -MAX_HISTORY_LENGTH,
      );
    }

    this._messageCount++;
    this._lastActivity = Date.now();
  }

  /**
   * Build context messages for the OpenClaw request.
   * Returns the last CONTEXT_WINDOW_SIZE messages as {role, content} pairs,
   * suitable for inclusion in an OpenClaw chat completion request.
   */
  buildContextMessages(): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    const recent = this.conversationHistory.slice(-CONTEXT_WINDOW_SIZE);
    return recent.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /** Get the full conversation history (read-only copy) */
  getHistory(): ReadonlyArray<ConversationMessage> {
    return [...this.conversationHistory];
  }

  /** Get the number of messages in history */
  get historyLength(): number {
    return this.conversationHistory.length;
  }

  // -----------------------------------------------------------------------
  // Processing Lock (busy guard)
  // -----------------------------------------------------------------------

  /**
   * Attempt to acquire the processing lock.
   * Returns true if the lock was acquired, false if already processing.
   * This prevents concurrent OpenClaw queries for the same session.
   */
  acquireProcessingLock(): boolean {
    if (this._isProcessing) {
      return false;
    }
    this._isProcessing = true;
    return true;
  }

  /**
   * Release the processing lock.
   * Should always be called in a finally block after processing completes.
   */
  releaseProcessingLock(): void {
    this._isProcessing = false;
  }

  /** Whether the session is currently processing a request */
  get isProcessing(): boolean {
    return this._isProcessing;
  }

  // -----------------------------------------------------------------------
  // Metadata
  // -----------------------------------------------------------------------

  /** Get session metadata snapshot */
  getMetadata(): SessionMetadata {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      startTime: this.startTime,
      messageCount: this._messageCount,
      lastActivity: this._lastActivity,
    };
  }

  /** Total messages processed in this session */
  get messageCount(): number {
    return this._messageCount;
  }

  /** Timestamp of last activity */
  get lastActivity(): number {
    return this._lastActivity;
  }

  /** Touch last activity without adding a message */
  touch(): void {
    this._lastActivity = Date.now();
  }

  // -----------------------------------------------------------------------
  // Capabilities
  // -----------------------------------------------------------------------

  /** Hardware capabilities snapshot */
  get capabilities(): Readonly<SessionCapabilities> {
    return this._capabilities;
  }

  // -----------------------------------------------------------------------
  // Echo Detection (block transcription while TTS is active + cooldown)
  // -----------------------------------------------------------------------

  /**
   * Mark that TTS has started speaking.
   * While speaking, shouldIgnoreTranscription() returns true.
   */
  startSpeaking(): void {
    this._isSpeaking = true;
    this._speakingEndAt = 0;
  }

  /**
   * Mark that TTS has finished speaking.
   * Starts the echo cooldown period (ECHO_COOLDOWN_MS).
   */
  stopSpeaking(): void {
    this._isSpeaking = false;
    this._speakingEndAt = Date.now();
  }

  /** Whether TTS is currently speaking */
  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Whether transcription should be ignored right now.
   * Returns true if TTS is active or within the 3s echo cooldown window.
   */
  shouldIgnoreTranscription(): boolean {
    if (this._isSpeaking) return true;
    if (this._speakingEndAt && Date.now() - this._speakingEndAt < ECHO_COOLDOWN_MS) return true;
    return false;
  }
}
