/**
 * Shared test utilities for Mentra channel tests.
 * Provides mock session factories and common helpers.
 */

import { vi } from 'vitest';
import type { MentraSession, SessionCapabilities } from './types';

/**
 * Create a mock MentraSession for testing.
 * All methods are vi.fn() mocks that resolve immediately.
 */
export function createMockSession(
  overrides: Partial<{
    capabilities: Partial<SessionCapabilities>;
    hasLayouts: boolean;
    hasAudio: boolean;
    hasCamera: boolean;
    hasDashboard: boolean;
  }> = {},
): MentraSession {
  const {
    capabilities = { hasDisplay: true, hasSpeaker: true, hasCamera: true, hasMicrophone: true },
    hasLayouts = true,
    hasAudio = true,
    hasCamera = true,
    hasDashboard = true,
  } = overrides;

  const layouts = hasLayouts
    ? {
        showTextWall: vi.fn().mockResolvedValue(undefined),
        showDoubleTextWall: vi.fn().mockResolvedValue(undefined),
        showReferenceCard: vi.fn().mockResolvedValue(undefined),
        showDashboardCard: vi.fn().mockResolvedValue(undefined),
        showBitmapView: vi.fn().mockResolvedValue(undefined),
        clearView: vi.fn().mockResolvedValue(undefined),
      }
    : (undefined as unknown as MentraSession['layouts']);

  const audio = hasAudio
    ? {
        speak: vi.fn().mockResolvedValue(undefined),
        play: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      }
    : (undefined as unknown as MentraSession['audio']);

  const camera = hasCamera
    ? {
        requestPhoto: vi.fn().mockResolvedValue({
          photoData: new ArrayBuffer(4),
          mimeType: 'image/jpeg',
        }),
        startStream: vi.fn().mockResolvedValue(undefined),
        stopStream: vi.fn().mockResolvedValue(undefined),
      }
    : (undefined as unknown as MentraSession['camera']);

  const dashboard = hasDashboard
    ? {
        content: { writeToMain: vi.fn() },
        write: vi.fn().mockResolvedValue(undefined),
        onModeChange: vi.fn(),
      }
    : (undefined as unknown as MentraSession['dashboard']);

  return {
    capabilities,
    isConnected: true,
    layouts,
    audio,
    camera,
    location: {
      subscribeToStream: vi.fn().mockResolvedValue(undefined),
      getLatestLocation: vi.fn().mockResolvedValue({ lat: 0, lng: 0 }),
      unsubscribeFromStream: vi.fn().mockResolvedValue(undefined),
    },
    events: {
      onTranscription: vi.fn().mockReturnValue(vi.fn()),
      onTranscriptionForLanguage: vi.fn().mockReturnValue(vi.fn()),
      onButtonPress: vi.fn().mockReturnValue(vi.fn()),
      onPhotoTaken: vi.fn().mockReturnValue(vi.fn()),
      onHeadPosition: vi.fn().mockReturnValue(vi.fn()),
      onPhoneNotifications: vi.fn().mockReturnValue(vi.fn()),
      onGlassesBattery: vi.fn().mockReturnValue(vi.fn()),
      onAppMessage: vi.fn().mockReturnValue(vi.fn()),
      onAppUserJoined: vi.fn().mockReturnValue(vi.fn()),
      onAppUserLeft: vi.fn().mockReturnValue(vi.fn()),
      onDisconnected: vi.fn().mockReturnValue(vi.fn()),
      onReconnected: vi.fn().mockReturnValue(vi.fn()),
      onConnected: vi.fn().mockReturnValue(vi.fn()),
      onError: vi.fn().mockReturnValue(vi.fn()),
    },
    dashboard,
    settings: {
      get: vi.fn().mockResolvedValue(''),
      has: vi.fn().mockResolvedValue(false),
      on: vi.fn(),
      onChange: vi.fn(),
    },
    updateSubscriptions: vi.fn().mockResolvedValue(undefined),
    broadcastToAppUsers: vi.fn().mockResolvedValue(undefined),
    sendDirectMessage: vi.fn().mockResolvedValue(undefined),
    discoverAppUsers: vi.fn().mockResolvedValue([]),
  };
}

/** Default session capabilities for test sessions */
export const DEFAULT_CAPS: SessionCapabilities = {
  hasDisplay: true,
  hasSpeaker: true,
  hasCamera: true,
  hasMicrophone: true,
};
