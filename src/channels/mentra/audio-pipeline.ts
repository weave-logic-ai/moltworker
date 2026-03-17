/**
 * Audio pipeline for Mentra channel.
 *
 * Manages voice I/O for a single session, including TTS output,
 * predefined sound playback, interrupt support, and busy guards.
 *
 * Wraps the MentraOS session.audio API with error handling, playback
 * state tracking, and interrupt-on-button-press behavior.
 */

import type { MentraSession } from './types';

// ---------------------------------------------------------------------------
// Sound Definitions
// ---------------------------------------------------------------------------

/**
 * Predefined sound names that map to audio URLs.
 * These are short feedback sounds for different interaction states.
 *
 * In production, these would be hosted on a CDN or bundled as assets.
 * The URLs below are placeholders that should be replaced with actual
 * hosted audio files during deployment.
 */
const SOUND_MAP: Record<string, string> = {
  /** Session connected acknowledgment — short ascending chime */
  connect: 'https://assets.mentra.glass/sounds/connect.mp3',
  /** Error occurred — short low tone */
  error: 'https://assets.mentra.glass/sounds/error.mp3',
  /** Incoming notification — subtle ping */
  notification: 'https://assets.mentra.glass/sounds/notification.mp3',
  /** Processing indicator — short beep */
  thinking: 'https://assets.mentra.glass/sounds/thinking.mp3',
};

// ---------------------------------------------------------------------------
// AudioPipeline
// ---------------------------------------------------------------------------

/**
 * Manages audio I/O for a single Mentra session.
 *
 * Features:
 * - TTS speak() with error handling and busy guard
 * - Predefined sound playback by name
 * - Playback state tracking (isPlaying flag)
 * - Interrupt support (stopAudio cancels current playback)
 * - Graceful degradation when speaker is unavailable
 */
export class AudioPipeline {
  private session: MentraSession;
  private hasSpeaker: boolean;
  private _isPlaying = false;
  private _isSpeaking = false;
  private _onSpeakingChange?: (speaking: boolean) => void;

  constructor(session: MentraSession, hasSpeaker: boolean) {
    this.session = session;
    this.hasSpeaker = hasSpeaker;
  }

  /**
   * Register a callback that fires when TTS speaking state changes.
   * Used by SessionState to track speaking/cooldown for echo detection.
   */
  set onSpeakingChange(cb: ((speaking: boolean) => void) | undefined) {
    this._onSpeakingChange = cb;
  }

  // -----------------------------------------------------------------------
  // TTS
  // -----------------------------------------------------------------------

  /**
   * Speak text via TTS with error handling and busy guard.
   *
   * If audio is already playing, the current playback is stopped before
   * the new speak begins (interrupt behavior).
   *
   * Notifies the onSpeakingChange callback so that session state can
   * track speaking/cooldown for echo detection.
   *
   * @param text - Text to speak
   * @param options - Optional TTS configuration (voice_id, model_id, voice_settings)
   * @returns true if speak completed successfully
   */
  async speak(
    text: string,
    options?: { voice_id?: string; model_id?: string; voice_settings?: Record<string, unknown> },
  ): Promise<boolean> {
    if (!this.hasSpeaker) {
      console.log('[audio-pipeline] No speaker available, skipping TTS');
      return false;
    }

    // Interrupt any current playback
    if (this._isPlaying || this._isSpeaking) {
      await this.stopAudio();
    }

    this._isSpeaking = true;
    this._isPlaying = true;
    this._onSpeakingChange?.(true);

    try {
      await this.session.audio.speak(text, options);
      return true;
    } catch (err) {
      console.error(
        '[audio-pipeline] TTS error:',
        (err as Error).message,
      );
      return false;
    } finally {
      this._isSpeaking = false;
      this._isPlaying = false;
      this._onSpeakingChange?.(false);
    }
  }

  // -----------------------------------------------------------------------
  // Sound Playback
  // -----------------------------------------------------------------------

  /**
   * Play a predefined audio feedback sound by name.
   *
   * Known sound names: 'connect', 'error', 'notification', 'thinking'
   *
   * @param soundName - Name of the predefined sound
   * @returns true if playback completed successfully
   */
  async playSound(soundName: string): Promise<boolean> {
    if (!this.hasSpeaker) {
      return false;
    }

    const url = SOUND_MAP[soundName];
    if (!url) {
      console.warn(`[audio-pipeline] Unknown sound: ${soundName}`);
      return false;
    }

    this._isPlaying = true;

    try {
      await this.session.audio.play(url, { volume: 0.7 });
      return true;
    } catch (err) {
      console.error(
        `[audio-pipeline] playSound(${soundName}) error:`,
        (err as Error).message,
      );
      return false;
    } finally {
      this._isPlaying = false;
    }
  }

  // -----------------------------------------------------------------------
  // Interrupt / Stop
  // -----------------------------------------------------------------------

  /**
   * Stop any current audio playback (TTS or sound).
   * This is the interrupt handler — can be triggered by button press
   * during active audio output.
   */
  async stopAudio(): Promise<void> {
    if (!this.hasSpeaker) return;

    try {
      await this.session.audio.stop();
    } catch (err) {
      console.error(
        '[audio-pipeline] stopAudio error:',
        (err as Error).message,
      );
    } finally {
      this._isPlaying = false;
      this._isSpeaking = false;
    }
  }

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  /** Whether any audio is currently playing (TTS or sound) */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** Whether TTS is currently speaking */
  get isSpeaking(): boolean {
    return this._isSpeaking;
  }
}
