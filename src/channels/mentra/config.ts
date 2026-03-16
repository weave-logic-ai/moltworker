/**
 * Mentra channel configuration schema, defaults, and validation.
 *
 * Provides the default config values and a validation function that ensures
 * all required fields are present and within acceptable ranges.
 */

import type { MentraChannelConfig } from './types';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default configuration values for the Mentra channel */
export const MENTRA_CHANNEL_DEFAULTS: MentraChannelConfig = {
  apiKey: '',
  packageName: 'mentra-claw',
  port: 7010,
  visionModel: '',
  defaultModel: '',
  enabled: true,
};

/** Maximum characters for the glasses HUD display */
export const MAX_DISPLAY_CHARS = 220;

/** Timeout in milliseconds for OpenClaw API requests */
export const OPENCLAW_QUERY_TIMEOUT_MS = 30_000;

/** Maximum tokens to request from the AI model */
export const MAX_RESPONSE_TOKENS = 256;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a Mentra channel configuration object.
 * Returns a result with `valid: true` if all required fields are present
 * and values are within acceptable ranges.
 */
export function validateConfig(config: Partial<MentraChannelConfig>): ValidationResult {
  const errors: string[] = [];

  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('apiKey is required (set MENTRAOS_API_KEY or MENTRA_API_KEY)');
  }

  if (!config.packageName || config.packageName.trim() === '') {
    errors.push('packageName is required');
  }

  if (config.port !== undefined) {
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      errors.push(`port must be an integer between 1 and 65535 (got ${config.port})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merges a partial config with defaults and validates the result.
 * Throws an Error if validation fails.
 */
export function resolveConfig(partial: Partial<MentraChannelConfig>): MentraChannelConfig {
  const config: MentraChannelConfig = {
    ...MENTRA_CHANNEL_DEFAULTS,
    ...partial,
  };

  const result = validateConfig(config);
  if (!result.valid) {
    throw new Error(`Invalid Mentra channel config: ${result.errors.join('; ')}`);
  }

  return config;
}

// ---------------------------------------------------------------------------
// Environment Variable Resolution
// ---------------------------------------------------------------------------

/**
 * Reads Mentra channel config from environment variables.
 * Returns a partial config with only the values that were set in the environment.
 */
export function configFromEnv(env: Record<string, string | undefined>): Partial<MentraChannelConfig> {
  const config: Partial<MentraChannelConfig> = {};

  const apiKey = env.MENTRAOS_API_KEY || env.MENTRA_API_KEY;
  if (apiKey) config.apiKey = apiKey;

  if (env.MENTRA_PACKAGE_NAME) config.packageName = env.MENTRA_PACKAGE_NAME;

  if (env.MENTRA_BRIDGE_PORT) {
    const port = parseInt(env.MENTRA_BRIDGE_PORT, 10);
    if (!isNaN(port)) config.port = port;
  }

  if (env.MENTRA_VISION_MODEL) config.visionModel = env.MENTRA_VISION_MODEL;
  if (env.MENTRA_DEFAULT_MODEL) config.defaultModel = env.MENTRA_DEFAULT_MODEL;

  return config;
}

// ---------------------------------------------------------------------------
// Example Config (for openclaw.json reference)
// ---------------------------------------------------------------------------

/**
 * Example openclaw.json channels.mentra configuration.
 * This shows how the Mentra channel would appear in the OpenClaw config.
 */
export const EXAMPLE_OPENCLAW_CONFIG = {
  channels: {
    mentra: {
      enabled: true,
      apiKey: '${MENTRAOS_API_KEY}',
      packageName: 'mentra-claw',
      port: 7010,
      visionModel: '',
      defaultModel: '',
    },
  },
} as const;
