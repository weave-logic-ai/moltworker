#!/bin/bash
# terraform/scripts/startup.sh
# VM metadata startup script for c4a-standard-1 (ARM64 Debian 12).
# Runs once on first boot; subsequent deploys use CI/CD or scripts/deploy.sh.

set -e

# Install essentials (git not in base Debian image)
apt-get update -qq && apt-get install -y git curl

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pm2 + OpenClaw
npm install -g pm2 openclaw@latest

# Install cloudflared (ARM64 binary — apt repo doesn't support ARM Debian)
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Clone repo
mkdir -p /opt/moltworker
cd /opt/moltworker
if [ ! -d ".git" ]; then
  git clone https://github.com/weave-logic-ai/moltworker.git .
fi

# Install mentra-bridge deps
cd skills/mentra-bridge && npm install @mentra/sdk && cd /opt/moltworker

# pm2 auto-start on boot
pm2 startup systemd -u root --hp /root

echo "Startup complete. Configure .env and start services with pm2."
