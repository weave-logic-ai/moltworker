import { describe, it, expect, beforeEach } from 'vitest';
import { SessionState } from './session-state';
import { DEFAULT_CAPS } from './test-utils';

describe('SessionState', () => {
  let state: SessionState;

  beforeEach(() => {
    state = new SessionState('sess-1', 'user-1', DEFAULT_CAPS);
  });

  // -----------------------------------------------------------------------
  // Conversation History
  // -----------------------------------------------------------------------

  describe('addMessage', () => {
    it('adds a message to history', () => {
      state.addMessage('user', 'Hello');
      const history = state.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello');
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('increments messageCount', () => {
      state.addMessage('user', 'one');
      state.addMessage('assistant', 'two');
      expect(state.messageCount).toBe(2);
    });

    it('updates lastActivity', () => {
      const before = state.lastActivity;
      state.addMessage('user', 'hello');
      expect(state.lastActivity).toBeGreaterThanOrEqual(before);
    });

    it('trims history at 20 messages', () => {
      for (let i = 0; i < 25; i++) {
        state.addMessage('user', `msg-${i}`);
      }
      expect(state.historyLength).toBe(20);
      // The oldest messages should have been dropped
      const history = state.getHistory();
      expect(history[0].content).toBe('msg-5');
      expect(history[19].content).toBe('msg-24');
    });

    it('preserves messageCount even after trim', () => {
      for (let i = 0; i < 25; i++) {
        state.addMessage('user', `msg-${i}`);
      }
      expect(state.messageCount).toBe(25);
      expect(state.historyLength).toBe(20);
    });
  });

  describe('buildContextMessages', () => {
    it('returns empty array when no messages', () => {
      expect(state.buildContextMessages()).toEqual([]);
    });

    it('returns last 10 messages', () => {
      for (let i = 0; i < 15; i++) {
        state.addMessage(i % 2 === 0 ? 'user' : 'assistant', `msg-${i}`);
      }
      const context = state.buildContextMessages();
      expect(context).toHaveLength(10);
      expect(context[0].content).toBe('msg-5');
      expect(context[9].content).toBe('msg-14');
    });

    it('returns all messages when fewer than 10', () => {
      state.addMessage('user', 'hello');
      state.addMessage('assistant', 'hi');
      const context = state.buildContextMessages();
      expect(context).toHaveLength(2);
    });

    it('returns {role, content} without timestamp', () => {
      state.addMessage('user', 'test');
      const ctx = state.buildContextMessages();
      expect(ctx[0]).toEqual({ role: 'user', content: 'test' });
      expect(ctx[0]).not.toHaveProperty('timestamp');
    });
  });

  describe('getHistory', () => {
    it('returns a copy (not a reference)', () => {
      state.addMessage('user', 'original');
      const h1 = state.getHistory();
      state.addMessage('user', 'added');
      const h2 = state.getHistory();
      expect(h1).toHaveLength(1);
      expect(h2).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Processing Lock
  // -----------------------------------------------------------------------

  describe('acquireProcessingLock / releaseProcessingLock', () => {
    it('acquires lock successfully', () => {
      expect(state.acquireProcessingLock()).toBe(true);
      expect(state.isProcessing).toBe(true);
    });

    it('double lock returns false', () => {
      expect(state.acquireProcessingLock()).toBe(true);
      expect(state.acquireProcessingLock()).toBe(false);
    });

    it('release allows re-acquisition', () => {
      state.acquireProcessingLock();
      state.releaseProcessingLock();
      expect(state.isProcessing).toBe(false);
      expect(state.acquireProcessingLock()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Metadata
  // -----------------------------------------------------------------------

  describe('getMetadata', () => {
    it('returns correct metadata', () => {
      state.addMessage('user', 'a');
      state.addMessage('assistant', 'b');
      const meta = state.getMetadata();
      expect(meta.userId).toBe('user-1');
      expect(meta.sessionId).toBe('sess-1');
      expect(meta.startTime).toBeGreaterThan(0);
      expect(meta.messageCount).toBe(2);
      expect(meta.lastActivity).toBeGreaterThanOrEqual(meta.startTime);
    });
  });

  describe('touch', () => {
    it('updates lastActivity without adding a message', () => {
      const before = state.lastActivity;
      state.touch();
      expect(state.lastActivity).toBeGreaterThanOrEqual(before);
      expect(state.messageCount).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Capabilities
  // -----------------------------------------------------------------------

  describe('capabilities', () => {
    it('returns provided capabilities', () => {
      expect(state.capabilities).toEqual(DEFAULT_CAPS);
    });

    it('preserves custom capabilities', () => {
      const caps = { hasDisplay: false, hasSpeaker: false, hasCamera: true, hasMicrophone: true };
      const s = new SessionState('s2', 'u2', caps);
      expect(s.capabilities.hasDisplay).toBe(false);
      expect(s.capabilities.hasSpeaker).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Echo Detection
  // -----------------------------------------------------------------------

  describe('echo detection', () => {
    it('shouldIgnoreTranscription returns false initially', () => {
      expect(state.shouldIgnoreTranscription()).toBe(false);
    });

    it('shouldIgnoreTranscription returns true while speaking', () => {
      state.startSpeaking();
      expect(state.isSpeaking).toBe(true);
      expect(state.shouldIgnoreTranscription()).toBe(true);
    });

    it('shouldIgnoreTranscription returns true during 3s cooldown after speaking', () => {
      state.startSpeaking();
      state.stopSpeaking();
      expect(state.isSpeaking).toBe(false);
      // Immediately after stopSpeaking, still in cooldown
      expect(state.shouldIgnoreTranscription()).toBe(true);
    });

    it('shouldIgnoreTranscription returns false after cooldown expires', () => {
      state.startSpeaking();
      state.stopSpeaking();
      // Manually override the internal speaking end time to simulate elapsed cooldown
      // Access the private field via casting for testing purposes
      (state as unknown as { _speakingEndAt: number })._speakingEndAt = Date.now() - 4000;
      expect(state.shouldIgnoreTranscription()).toBe(false);
    });

    it('startSpeaking resets cooldown timer', () => {
      state.startSpeaking();
      state.stopSpeaking();
      // Start speaking again should clear the end time
      state.startSpeaking();
      // While speaking, isSpeaking is true regardless of previous cooldown
      expect(state.shouldIgnoreTranscription()).toBe(true);
    });
  });
});
