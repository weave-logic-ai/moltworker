#!/bin/bash
# terraform/scripts/startup.sh
# VM startup script: installs Node.js 22, pm2, openclaw, cloudflared.
# Runs once on first boot; subsequent deploys use CI/CD pipeline.

set -e

# Install essential packages (git not included in base Debian image)
apt-get update && apt-get install -y git curl

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pm2
npm install -g pm2

# Install OpenClaw
npm install -g openclaw@latest

# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared focal main' | tee /etc/apt/sources.list.d/cloudflared.list
apt-get update && apt-get install -y cloudflared

# Create app directory
mkdir -p /opt/moltworker
cd /opt/moltworker

# Clone repo (first boot only)
if [ ! -d ".git" ]; then
  git clone https://github.com/weave-logic-ai/moltworker.git .
fi

# Install bridge dependencies
cd /opt/moltworker/skills/mentra-bridge
npm install @mentra/sdk
cd /opt/moltworker

# Setup pm2 to survive reboots
pm2 startup systemd

echo "Startup complete. Configure .env and start services with pm2."
