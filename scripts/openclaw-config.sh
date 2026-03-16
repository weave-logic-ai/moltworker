#!/bin/bash
# scripts/openclaw-config.sh
# Patches openclaw.json with gateway config, channel config, and auth token.
# Adapted from start-openclaw.sh's PATCH CONFIG section for VM use (no R2/rclone).

set -e

CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-/root/.openclaw}"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"

echo "Patching OpenClaw config at: $CONFIG_FILE"
mkdir -p "$CONFIG_DIR"

# Source .env if it exists (for local use outside pm2)
if [ -f /opt/moltworker/.env ]; then
  set -a
  source /opt/moltworker/.env
  set +a
fi

node << 'EOFPATCH'
const fs = require('fs');

const configPath = process.env.OPENCLAW_CONFIG_DIR
  ? process.env.OPENCLAW_CONFIG_DIR + '/openclaw.json'
  : '/root/.openclaw/openclaw.json';

console.log('Patching config at:', configPath);
let config = {};

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.log('Starting with empty config');
}

config.gateway = config.gateway || {};
config.channels = config.channels || {};

// Gateway configuration
config.gateway.port = 18789;
config.gateway.mode = 'local';

if (process.env.OPENCLAW_GATEWAY_TOKEN) {
  config.gateway.auth = config.gateway.auth || {};
  config.gateway.auth.mode = 'token';
  config.gateway.auth.token = process.env.OPENCLAW_GATEWAY_TOKEN;
  console.log('Gateway token set (length: ' + process.env.OPENCLAW_GATEWAY_TOKEN.length + ')');
}

// Telegram configuration
if (process.env.TELEGRAM_BOT_TOKEN) {
  const dmPolicy = process.env.TELEGRAM_DM_POLICY || 'pairing';
  config.channels.telegram = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    enabled: true,
    dmPolicy: dmPolicy,
  };
  if (process.env.TELEGRAM_DM_ALLOW_FROM) {
    config.channels.telegram.allowFrom = process.env.TELEGRAM_DM_ALLOW_FROM.split(',');
  } else if (dmPolicy === 'open') {
    config.channels.telegram.allowFrom = ['*'];
  }
  console.log('Telegram channel configured');
}

// Discord configuration
if (process.env.DISCORD_BOT_TOKEN) {
  const dmPolicy = process.env.DISCORD_DM_POLICY || 'pairing';
  const dm = { policy: dmPolicy };
  if (dmPolicy === 'open') {
    dm.allowFrom = ['*'];
  }
  config.channels.discord = {
    token: process.env.DISCORD_BOT_TOKEN,
    enabled: true,
    dm: dm,
  };
  console.log('Discord channel configured');
}

// Slack configuration
if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN) {
  config.channels.slack = {
    botToken: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    enabled: true,
  };
  console.log('Slack channel configured');
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Configuration patched successfully');
EOFPATCH
