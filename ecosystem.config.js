// ecosystem.config.js
// pm2 process configuration for moltworker services on GCP VM.

module.exports = {
  apps: [
    {
      name: 'openclaw',
      script: 'openclaw',
      args: 'gateway --port 18789 --verbose --bind lan',
      env: {
        OPENCLAW_GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN,
        ANTHROPIC_BASE_URL: process.env.AI_GATEWAY_BASE_URL,
        ANTHROPIC_API_KEY: process.env.AI_GATEWAY_API_KEY,
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: 'mentra-bridge',
      script: 'skills/mentra-bridge/mentra-bridge.js',
      env: {
        MENTRAOS_API_KEY: process.env.MENTRA_API_KEY,
        MENTRA_PACKAGE_NAME: 'mentra-claw',
        OPENCLAW_URL: 'http://localhost:18789',
        OPENCLAW_GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN,
      },
      restart_delay: 5000,
      max_restarts: 10,
      wait_ready: true,
    },
  ],
};
