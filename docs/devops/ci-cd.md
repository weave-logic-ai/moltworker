# CI/CD Pipeline

## Overview

Two deployment targets with independent pipelines:

1. **GCP VM** — OpenClaw gateway + Mentra bridge (primary compute)
2. **Cloudflare Workers** — Edge agents, routing (optional, keep existing)

## GCP VM Deployment

### Pipeline: Push to main → SSH deploy to VM

```yaml
# .github/workflows/deploy-gcp.yml
name: Deploy to GCP

on:
  push:
    branches: [main]
    paths:
      - 'skills/mentra-bridge/**'
      - 'scripts/**'
      - 'config/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VM
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.GCP_VM_IP }}
          username: deploy
          key: ${{ secrets.GCP_SSH_KEY }}
          script: |
            cd /opt/moltworker
            git pull origin main
            npm install
            pm2 restart ecosystem.config.js
            pm2 save
```

### Process Management (pm2)

```javascript
// ecosystem.config.js
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
```

### Environment Management

```bash
# /opt/moltworker/.env (on VM, managed by Terraform)
AI_GATEWAY_API_KEY=sk-or-v1-...
AI_GATEWAY_BASE_URL=https://openrouter.ai/api/v1
MOLTBOT_GATEWAY_TOKEN=...
MENTRA_API_KEY=...
OPENCLAW_GATEWAY_TOKEN=...
```

## Cloudflare Workers Deployment (Existing)

Keep the existing `deploy.yml` for Worker-only changes:
- Edge agents
- Routing rules
- Static assets

## Terraform Integration

Infrastructure changes deploy via Terraform:
- VM creation/resizing
- Firewall rules
- DNS records
- Cloudflare Tunnel config

See `docs/devops/terraform.md` for details.

## Monitoring

- **pm2 monitoring** — `pm2 monit`, `pm2 logs`
- **Cloudflare dashboard** — Tunnel health, Zero Trust logs
- **Health checks** — HTTP probes via Cloudflare Tunnel
- **Alerts** — pm2 + webhook to Discord/Slack on crash
