#!/bin/bash
# terraform/scripts/startup.sh
# VM metadata startup script for c4a-standard-1 (ARM64 Debian 12).
# Runs once on first boot; subsequent deploys use scripts/deploy.sh.

set -e

# Install essentials
apt-get update -qq && apt-get install -y git curl

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pnpm + pm2
npm install -g pnpm pm2

# Install cloudflared (ARM64 binary)
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Clone moltworker
mkdir -p /opt/moltworker
cd /opt/moltworker
if [ ! -d ".git" ]; then
  git clone https://github.com/weave-logic-ai/moltworker.git .
fi

# Clone and build openclaw
mkdir -p /opt/openclaw
if [ ! -d "/opt/openclaw/.git" ]; then
  git clone -b clawft-production https://github.com/weave-logic-ai/openclaw.git /opt/openclaw
fi
cd /opt/openclaw
pnpm install
pnpm build

# Install mentra-bridge deps
cd /opt/moltworker/skills/mentra-bridge && npm install @mentra/sdk && cd /opt/moltworker

# pm2 auto-start (will be configured for the deploy user later)
echo "Startup complete. Configure .env, set up pm2, and cloudflared tunnel."
