import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  resolveConfig,
  configFromEnv,
  MENTRA_CHANNEL_DEFAULTS,
  MAX_DISPLAY_CHARS,
  OPENCLAW_QUERY_TIMEOUT_MS,
  MAX_RESPONSE_TOKENS,
} from './config';

describe('MENTRA_CHANNEL_DEFAULTS', () => {
  it('has correct default values', () => {
    expect(MENTRA_CHANNEL_DEFAULTS.apiKey).toBe('');
    expect(MENTRA_CHANNEL_DEFAULTS.packageName).toBe('mentra-claw');
    expect(MENTRA_CHANNEL_DEFAULTS.port).toBe(7010);
    expect(MENTRA_CHANNEL_DEFAULTS.visionModel).toBe('');
    expect(MENTRA_CHANNEL_DEFAULTS.defaultModel).toBe('');
    expect(MENTRA_CHANNEL_DEFAULTS.enabled).toBe(true);
  });
});

describe('exported constants', () => {
  it('MAX_DISPLAY_CHARS is 220', () => {
    expect(MAX_DISPLAY_CHARS).toBe(220);
  });

  it('OPENCLAW_QUERY_TIMEOUT_MS is 30000', () => {
    expect(OPENCLAW_QUERY_TIMEOUT_MS).toBe(30_000);
  });

  it('MAX_RESPONSE_TOKENS is 256', () => {
    expect(MAX_RESPONSE_TOKENS).toBe(256);
  });
});

describe('validateConfig', () => {
  it('catches missing apiKey', () => {
    const result = validateConfig({ packageName: 'test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'apiKey is required (set MENTRAOS_API_KEY or MENTRA_API_KEY)',
    );
  });

  it('catches empty apiKey', () => {
    const result = validateConfig({ apiKey: '', packageName: 'test' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('catches whitespace-only apiKey', () => {
    const result = validateConfig({ apiKey: '   ', packageName: 'test' });
    expect(result.valid).toBe(false);
  });

  it('catches missing packageName', () => {
    const result = validateConfig({ apiKey: 'key123' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('packageName is required');
  });

  it('catches invalid port (too low)', () => {
    const result = validateConfig({ apiKey: 'key', packageName: 'test', port: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('port'))).toBe(true);
  });

  it('catches invalid port (too high)', () => {
    const result = validateConfig({ apiKey: 'key', packageName: 'test', port: 70000 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('port'))).toBe(true);
  });

  it('catches non-integer port', () => {
    const result = validateConfig({ apiKey: 'key', packageName: 'test', port: 70.5 });
    expect(result.valid).toBe(false);
  });

  it('passes with valid config', () => {
    const result = validateConfig({
      apiKey: 'key123',
      packageName: 'my-app',
      port: 8080,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts port undefined (optional)', () => {
    const result = validateConfig({
      apiKey: 'key123',
      packageName: 'test',
    });
    expect(result.valid).toBe(true);
  });
});

describe('resolveConfig', () => {
  it('merges partial config with defaults', () => {
    const config = resolveConfig({ apiKey: 'my-key' });
    expect(config.apiKey).toBe('my-key');
    expect(config.packageName).toBe('mentra-claw');
    expect(config.port).toBe(7010);
    expect(config.enabled).toBe(true);
  });

  it('overrides defaults with provided values', () => {
    const config = resolveConfig({
      apiKey: 'key',
      packageName: 'custom-app',
      port: 9090,
      visionModel: 'gpt-4o',
    });
    expect(config.packageName).toBe('custom-app');
    expect(config.port).toBe(9090);
    expect(config.visionModel).toBe('gpt-4o');
  });

  it('throws on invalid config', () => {
    expect(() => resolveConfig({})).toThrow('Invalid Mentra channel config');
  });

  it('throws with descriptive error message', () => {
    expect(() => resolveConfig({ apiKey: '' })).toThrow('apiKey is required');
  });
});

describe('configFromEnv', () => {
  it('reads MENTRAOS_API_KEY', () => {
    const config = configFromEnv({ MENTRAOS_API_KEY: 'key-from-env' });
    expect(config.apiKey).toBe('key-from-env');
  });

  it('falls back to MENTRA_API_KEY', () => {
    const config = configFromEnv({ MENTRA_API_KEY: 'fallback-key' });
    expect(config.apiKey).toBe('fallback-key');
  });

  it('prefers MENTRAOS_API_KEY over MENTRA_API_KEY', () => {
    const config = configFromEnv({
      MENTRAOS_API_KEY: 'primary',
      MENTRA_API_KEY: 'fallback',
    });
    expect(config.apiKey).toBe('primary');
  });

  it('reads MENTRA_PACKAGE_NAME', () => {
    const config = configFromEnv({ MENTRA_PACKAGE_NAME: 'my-pkg' });
    expect(config.packageName).toBe('my-pkg');
  });

  it('reads MENTRA_BRIDGE_PORT as number', () => {
    const config = configFromEnv({ MENTRA_BRIDGE_PORT: '9090' });
    expect(config.port).toBe(9090);
  });

  it('ignores non-numeric MENTRA_BRIDGE_PORT', () => {
    const config = configFromEnv({ MENTRA_BRIDGE_PORT: 'abc' });
    expect(config.port).toBeUndefined();
  });

  it('reads MENTRA_VISION_MODEL', () => {
    const config = configFromEnv({ MENTRA_VISION_MODEL: 'gpt-4o' });
    expect(config.visionModel).toBe('gpt-4o');
  });

  it('reads MENTRA_DEFAULT_MODEL', () => {
    const config = configFromEnv({ MENTRA_DEFAULT_MODEL: 'claude-3' });
    expect(config.defaultModel).toBe('claude-3');
  });

  it('returns empty partial when no env vars set', () => {
    const config = configFromEnv({});
    expect(Object.keys(config)).toHaveLength(0);
  });

  it('skips undefined env vars', () => {
    const config = configFromEnv({ MENTRAOS_API_KEY: undefined });
    expect(config.apiKey).toBeUndefined();
  });
});
