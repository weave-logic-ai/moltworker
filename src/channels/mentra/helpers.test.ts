import { describe, it, expect } from 'vitest';
import { detectCapabilities, buildResponse, arrayBufferToBase64 } from './helpers';
import { createMockSession } from './test-utils';

describe('detectCapabilities', () => {
  it('detects all capabilities on full session', () => {
    const session = createMockSession();
    const caps = detectCapabilities(session);
    expect(caps.hasDisplay).toBe(true);
    expect(caps.hasSpeaker).toBe(true);
    expect(caps.hasCamera).toBe(true);
    expect(caps.hasMicrophone).toBe(true);
  });

  it('detects no display when layouts missing', () => {
    const session = createMockSession({ hasLayouts: false });
    const caps = detectCapabilities(session);
    expect(caps.hasDisplay).toBe(false);
  });

  it('detects no speaker when audio missing', () => {
    const session = createMockSession({ hasAudio: false });
    const caps = detectCapabilities(session);
    expect(caps.hasSpeaker).toBe(false);
  });

  it('detects no camera when camera missing', () => {
    const session = createMockSession({ hasCamera: false });
    const caps = detectCapabilities(session);
    expect(caps.hasCamera).toBe(false);
  });

  it('detects no display when capability explicitly false', () => {
    const session = createMockSession({
      capabilities: { hasDisplay: false },
    });
    const caps = detectCapabilities(session);
    expect(caps.hasDisplay).toBe(false);
  });

  it('detects no speaker when capability explicitly false', () => {
    const session = createMockSession({
      capabilities: { hasSpeaker: false },
    });
    const caps = detectCapabilities(session);
    expect(caps.hasSpeaker).toBe(false);
  });

  it('detects no microphone when capability explicitly false', () => {
    const session = createMockSession({
      capabilities: { hasMicrophone: false },
    });
    const caps = detectCapabilities(session);
    expect(caps.hasMicrophone).toBe(false);
  });

  it('handles empty capabilities object', () => {
    const session = createMockSession({ capabilities: {} });
    const caps = detectCapabilities(session);
    // With layouts/audio/camera present but no explicit capability flags,
    // defaults to true (not false)
    expect(caps.hasDisplay).toBe(true);
    expect(caps.hasSpeaker).toBe(true);
    expect(caps.hasCamera).toBe(true);
    expect(caps.hasMicrophone).toBe(true);
  });
});

describe('buildResponse', () => {
  it('returns text, displayText, and audioText', () => {
    const result = buildResponse('Hello world');
    expect(result.text).toBe('Hello world');
    expect(result.audioText).toBe('Hello world');
    expect(typeof result.displayText).toBe('string');
  });

  it('strips markdown formatting for display', () => {
    const result = buildResponse('**bold** and *italic*');
    expect(result.displayText).toBe('bold and italic');
  });

  it('truncates long text for display', () => {
    const longText = 'A'.repeat(300);
    const result = buildResponse(longText);
    expect(result.displayText.length).toBeLessThanOrEqual(220);
    expect(result.displayText).toContain('...');
  });

  it('preserves full text in audioText', () => {
    const longText = 'A'.repeat(300);
    const result = buildResponse(longText);
    expect(result.audioText).toBe(longText);
  });

  it('strips markdown links', () => {
    const result = buildResponse('Check [this link](https://example.com)');
    expect(result.displayText).toBe('Check this link');
  });

  it('replaces code blocks', () => {
    const result = buildResponse('Here:\n```js\nconsole.log("hi")\n```\nDone');
    expect(result.displayText).toContain('[code]');
  });

  it('strips inline code backticks', () => {
    const result = buildResponse('Use `npm install` to start');
    expect(result.displayText).toBe('Use npm install to start');
  });

  it('strips heading markers', () => {
    const result = buildResponse('## Title\nContent');
    expect(result.displayText).toBe('Title\nContent');
  });
});

describe('arrayBufferToBase64', () => {
  it('converts empty buffer', () => {
    const buf = new ArrayBuffer(0);
    expect(arrayBufferToBase64(buf)).toBe('');
  });

  it('converts known bytes', () => {
    // "Hi" in bytes is [72, 105]
    const buf = new Uint8Array([72, 105]).buffer;
    const b64 = arrayBufferToBase64(buf);
    expect(b64).toBe(btoa('Hi'));
  });

  it('converts binary data', () => {
    const buf = new Uint8Array([0, 255, 128, 64]).buffer;
    const b64 = arrayBufferToBase64(buf);
    // Verify round-trip: decode and check bytes
    const decoded = atob(b64);
    expect(decoded.charCodeAt(0)).toBe(0);
    expect(decoded.charCodeAt(1)).toBe(255);
    expect(decoded.charCodeAt(2)).toBe(128);
    expect(decoded.charCodeAt(3)).toBe(64);
  });

  it('produces valid base64 string', () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const b64 = arrayBufferToBase64(buf);
    // Base64 should only contain valid characters
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
