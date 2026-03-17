import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMentraChannel,
  MentraChannel,
  resolveConfig,
  validateConfig,
  configFromEnv,
  MENTRA_CHANNEL_DEFAULTS,
  SessionState,
  AudioPipeline,
} from './index';
import type { OpenClawGatewayConfig } from './index';

describe('createMentraChannel', () => {
  it('creates a MentraChannel from env vars', () => {
    const env = {
      MENTRAOS_API_KEY: 'test-key-123',
      MENTRA_PACKAGE_NAME: 'my-app',
      MENTRA_BRIDGE_PORT: '8080',
      OPENCLAW_URL: 'http://localhost:9999',
      OPENCLAW_GATEWAY_TOKEN: 'gw-token',
    };
    const channel = createMentraChannel(env);
    expect(channel).toBeInstanceOf(MentraChannel);
    expect(channel.resolvedConfig.apiKey).toBe('test-key-123');
    expect(channel.resolvedConfig.packageName).toBe('my-app');
    expect(channel.resolvedConfig.port).toBe(8080);
  });

  it('uses default OpenClaw URL when not provided', () => {
    const env = {
      MENTRAOS_API_KEY: 'key',
    };
    const channel = createMentraChannel(env);
    expect(channel).toBeInstanceOf(MentraChannel);
  });

  it('uses OPENCLAW_PORT for URL when OPENCLAW_URL not set', () => {
    const env = {
      MENTRAOS_API_KEY: 'key',
      OPENCLAW_PORT: '12345',
    };
    // Should not throw -- just constructs the channel
    const channel = createMentraChannel(env);
    expect(channel).toBeInstanceOf(MentraChannel);
  });

  it('throws when apiKey is missing', () => {
    expect(() => createMentraChannel({})).toThrow('apiKey is required');
  });
});

describe('MentraChannel', () => {
  let channel: MentraChannel;
  const openclawConfig: OpenClawGatewayConfig = {
    url: 'http://localhost:18789',
    token: 'test-token',
  };

  beforeEach(() => {
    channel = new MentraChannel(
      { apiKey: 'test-key' },
      openclawConfig,
    );
  });

  describe('lifecycle', () => {
    it('init creates the server', async () => {
      await channel.init();
      // After init, start should not throw
      await expect(channel.start()).resolves.toBeUndefined();
    });

    it('start throws if not initialized', async () => {
      await expect(channel.start()).rejects.toThrow('Call init() first');
    });

    it('stop works without init', async () => {
      await expect(channel.stop()).resolves.toBeUndefined();
    });

    it('full lifecycle: init -> start -> stop', async () => {
      await channel.init();
      await channel.start();
      await channel.stop();
      // After stop, start should throw (server is null)
      await expect(channel.start()).rejects.toThrow('Call init() first');
    });
  });

  describe('sessionCount', () => {
    it('returns 0 initially', () => {
      expect(channel.sessionCount).toBe(0);
    });
  });

  describe('resolvedConfig', () => {
    it('returns the resolved configuration', () => {
      const config = channel.resolvedConfig;
      expect(config.apiKey).toBe('test-key');
      expect(config.packageName).toBe('mentra-claw'); // default
      expect(config.port).toBe(7010); // default
    });
  });
});

describe('re-exports', () => {
  it('exports resolveConfig', () => {
    expect(typeof resolveConfig).toBe('function');
  });

  it('exports validateConfig', () => {
    expect(typeof validateConfig).toBe('function');
  });

  it('exports configFromEnv', () => {
    expect(typeof configFromEnv).toBe('function');
  });

  it('exports MENTRA_CHANNEL_DEFAULTS', () => {
    expect(MENTRA_CHANNEL_DEFAULTS).toBeDefined();
    expect(MENTRA_CHANNEL_DEFAULTS.packageName).toBe('mentra-claw');
  });

  it('exports SessionState class', () => {
    expect(typeof SessionState).toBe('function');
  });

  it('exports AudioPipeline class', () => {
    expect(typeof AudioPipeline).toBe('function');
  });
});

describe('config validation integration', () => {
  it('MentraChannel throws on invalid config', () => {
    const openclawConfig: OpenClawGatewayConfig = {
      url: 'http://localhost:18789',
      token: '',
    };
    expect(
      () => new MentraChannel({}, openclawConfig),
    ).toThrow('Invalid Mentra channel config');
  });

  it('MentraChannel throws on invalid port', () => {
    const openclawConfig: OpenClawGatewayConfig = {
      url: 'http://localhost:18789',
      token: '',
    };
    expect(
      () => new MentraChannel({ apiKey: 'key', port: -1 }, openclawConfig),
    ).toThrow('port');
  });
});
