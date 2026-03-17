/**
 * Mentra Channel Plugin for OpenClaw
 *
 * Registers "mentra" as a channel so it appears in the dashboard.
 * The actual bridge runs separately (skills/mentra-bridge/bridge.cjs)
 * and routes messages through `openclaw agent --to` for session tracking.
 */

const mentraChannelPlugin = {
  channelId: 'mentra',
  displayName: 'Mentra Live',
  description: 'Smart glasses voice + vision channel via MentraOS SDK',

  capabilities: {
    text: true,
    media: true,
    voice: true,
    reactions: false,
    threads: false,
    edit: false,
    delete: false,
  },

  async send(to, text, opts) {
    console.log(`[mentra-channel] send to=${to} text="${text.substring(0, 50)}..."`);
    return { ok: true, messageId: `mentra-${Date.now()}` };
  },
};

const plugin = {
  id: 'mentra',
  name: 'Mentra Live',
  description: 'Mentra Live smart glasses channel for OpenClaw',
  configSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      apiKey: { type: 'string', description: 'MentraOS Cloud API key' },
      packageName: { type: 'string', default: 'mentra-claw' },
      port: { type: 'integer', default: 7010 },
    },
    required: [],
  },

  register(api) {
    console.log('[mentra-plugin] Registering mentra channel');
    api.registerChannel({ plugin: mentraChannelPlugin });
  },
};

export { plugin as default };
export { mentraChannelPlugin };
