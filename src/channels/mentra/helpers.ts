/**
 * Shared helper functions for the Mentra channel.
 *
 * Extracted from index.ts to keep files under 500 lines.
 */

import type { MentraSession, MentraResponse, SessionCapabilities } from './types';
import { formatForGlasses } from '../../mentra/display-format';

// ---------------------------------------------------------------------------
// Capability Detection
// ---------------------------------------------------------------------------

/** Detect session capabilities with safe defaults */
export function detectCapabilities(session: MentraSession): SessionCapabilities {
  return {
    hasDisplay: session.capabilities?.hasDisplay !== false && !!session.layouts,
    hasSpeaker: session.capabilities?.hasSpeaker !== false && !!session.audio,
    hasCamera: session.capabilities?.hasCamera !== false && !!session.camera,
    hasMicrophone: session.capabilities?.hasMicrophone !== false,
  };
}

// ---------------------------------------------------------------------------
// Display Helper
// ---------------------------------------------------------------------------

/** Create a safe text display helper */
export function createShowText(
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

// ---------------------------------------------------------------------------
// Response Formatting
// ---------------------------------------------------------------------------

/** Build a MentraResponse with formatted display text and audio text */
export function buildResponse(rawText: string): MentraResponse {
  return {
    text: rawText,
    displayText: formatForGlasses(rawText),
    audioText: rawText,
  };
}

// ---------------------------------------------------------------------------
// Data Conversion
// ---------------------------------------------------------------------------

/** Convert ArrayBuffer to base64 string */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
