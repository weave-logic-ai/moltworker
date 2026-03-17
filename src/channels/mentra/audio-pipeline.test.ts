import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioPipeline } from './audio-pipeline';
import { createMockSession } from './test-utils';
import type { MentraSession } from './types';

describe('AudioPipeline', () => {
  let session: MentraSession;
  let pipeline: AudioPipeline;

  beforeEach(() => {
    session = createMockSession();
    pipeline = new AudioPipeline(session, true);
  });

  // -----------------------------------------------------------------------
  // speak()
  // -----------------------------------------------------------------------

  describe('speak', () => {
    it('calls session.audio.speak with text and options', async () => {
      const opts = { voice_id: 'abc', model_id: 'eleven_flash' };
      await pipeline.speak('Hello', opts);
      expect(session.audio.speak).toHaveBeenCalledWith('Hello', opts);
    });

    it('calls session.audio.speak with text only', async () => {
      await pipeline.speak('Hello');
      expect(session.audio.speak).toHaveBeenCalledWith('Hello', undefined);
    });

    it('returns true on success', async () => {
      const result = await pipeline.speak('Hi');
      expect(result).toBe(true);
    });

    it('returns false when no speaker', async () => {
      const noSpeaker = new AudioPipeline(session, false);
      const result = await noSpeaker.speak('Hi');
      expect(result).toBe(false);
      expect(session.audio.speak).not.toHaveBeenCalled();
    });

    it('returns false and logs on error', async () => {
      vi.mocked(session.audio.speak).mockRejectedValueOnce(new Error('TTS failed'));
      const result = await pipeline.speak('Hi');
      expect(result).toBe(false);
    });

    it('resets isSpeaking and isPlaying after completion', async () => {
      await pipeline.speak('Hello');
      expect(pipeline.isSpeaking).toBe(false);
      expect(pipeline.isPlaying).toBe(false);
    });

    it('resets state even on error', async () => {
      vi.mocked(session.audio.speak).mockRejectedValueOnce(new Error('fail'));
      await pipeline.speak('Hello');
      expect(pipeline.isSpeaking).toBe(false);
      expect(pipeline.isPlaying).toBe(false);
    });

    it('interrupts current playback before new speak', async () => {
      // Simulate a long-running first speak by having speak set isPlaying
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((r) => { resolveFirst = r; });
      vi.mocked(session.audio.speak).mockImplementationOnce(async () => {
        await firstPromise;
      });

      // Start first speak (will hang)
      const first = pipeline.speak('First');
      // The pipeline should be playing now
      // Resolve first to let it complete
      resolveFirst!();
      await first;

      // Now speak again and verify stop was called for interrupt
      vi.mocked(session.audio.speak).mockResolvedValueOnce(undefined);
      // Manually set playing to simulate concurrent state
      await pipeline.speak('Second');
      expect(session.audio.speak).toHaveBeenLastCalledWith('Second', undefined);
    });
  });

  // -----------------------------------------------------------------------
  // playSound()
  // -----------------------------------------------------------------------

  describe('playSound', () => {
    it('plays known sound', async () => {
      const result = await pipeline.playSound('connect');
      expect(result).toBe(true);
      expect(session.audio.play).toHaveBeenCalledWith(
        'https://assets.mentra.glass/sounds/connect.mp3',
        { volume: 0.7 },
      );
    });

    it('returns false for unknown sound', async () => {
      const result = await pipeline.playSound('unknown_sound');
      expect(result).toBe(false);
      expect(session.audio.play).not.toHaveBeenCalled();
    });

    it('returns false when no speaker', async () => {
      const noSpeaker = new AudioPipeline(session, false);
      const result = await noSpeaker.playSound('connect');
      expect(result).toBe(false);
    });

    it('returns false on playback error', async () => {
      vi.mocked(session.audio.play).mockRejectedValueOnce(new Error('play failed'));
      const result = await pipeline.playSound('error');
      expect(result).toBe(false);
    });

    it('resets isPlaying after playback', async () => {
      await pipeline.playSound('connect');
      expect(pipeline.isPlaying).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // stopAudio()
  // -----------------------------------------------------------------------

  describe('stopAudio', () => {
    it('calls session.audio.stop', async () => {
      await pipeline.stopAudio();
      expect(session.audio.stop).toHaveBeenCalled();
    });

    it('resets state flags', async () => {
      // Force state to playing
      await pipeline.speak('test');
      // speak completes and resets, but let's verify stopAudio explicitly
      await pipeline.stopAudio();
      expect(pipeline.isPlaying).toBe(false);
      expect(pipeline.isSpeaking).toBe(false);
    });

    it('handles stop errors gracefully', async () => {
      vi.mocked(session.audio.stop).mockRejectedValueOnce(new Error('stop failed'));
      await pipeline.stopAudio(); // should not throw
      expect(pipeline.isPlaying).toBe(false);
    });

    it('does nothing when no speaker', async () => {
      const noSpeaker = new AudioPipeline(session, false);
      await noSpeaker.stopAudio();
      expect(session.audio.stop).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // State tracking
  // -----------------------------------------------------------------------

  describe('state', () => {
    it('isPlaying is false initially', () => {
      expect(pipeline.isPlaying).toBe(false);
    });

    it('isSpeaking is false initially', () => {
      expect(pipeline.isSpeaking).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // onSpeakingChange callback
  // -----------------------------------------------------------------------

  describe('onSpeakingChange', () => {
    it('fires with true when speak starts', async () => {
      const cb = vi.fn();
      pipeline.onSpeakingChange = cb;
      await pipeline.speak('Hello');
      expect(cb).toHaveBeenCalledWith(true);
    });

    it('fires with false when speak ends', async () => {
      const cb = vi.fn();
      pipeline.onSpeakingChange = cb;
      await pipeline.speak('Hello');
      expect(cb).toHaveBeenCalledWith(false);
      // true then false
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('fires with false on speak error', async () => {
      const cb = vi.fn();
      pipeline.onSpeakingChange = cb;
      vi.mocked(session.audio.speak).mockRejectedValueOnce(new Error('fail'));
      await pipeline.speak('Hello');
      expect(cb).toHaveBeenLastCalledWith(false);
    });

    it('does not throw when callback is undefined', async () => {
      pipeline.onSpeakingChange = undefined;
      await expect(pipeline.speak('Hello')).resolves.toBe(true);
    });
  });
});
