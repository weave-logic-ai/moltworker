#!/bin/bash
# scripts/setup-vm.sh
# Manual VM setup script. Mirrors terraform/scripts/startup.sh but intended
# for running interactively on a fresh VM or re-provisioning.

set -e

echo "=== Moltworker VM Setup ==="

# Install Node.js 22
echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
echo "Node.js $(node --version) installed"

# Install pm2 globally
echo "Installing pm2..."
npm install -g pm2

# Install OpenClaw globally
echo "Installing OpenClaw..."
npm install -g openclaw@latest

# Install cloudflared
echo "Installing cloudflared..."
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared focal main' | tee /etc/apt/sources.list.d/cloudflared.list
apt-get update && apt-get install -y cloudflared

# Create app directory and clone repo
echo "Setting up /opt/moltworker..."
mkdir -p /opt/moltworker
cd /opt/moltworker

if [ ! -d ".git" ]; then
  git clone https://github.com/weave-logic-ai/moltworker.git .
  echo "Repository cloned"
else
  echo "Repository already exists, pulling latest..."
  git pull origin main
fi

# Install mentra-bridge dependencies
echo "Installing mentra-bridge dependencies..."
cd /opt/moltworker/skills/mentra-bridge
npm install @mentra/sdk
cd /opt/moltworker

# Configure pm2 to start on boot
echo "Configuring pm2 startup..."
pm2 startup systemd

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "  1. Copy .env.example to /opt/moltworker/.env and fill in secrets"
echo "  2. Run: bash scripts/openclaw-config.sh"
echo "  3. Run: pm2 start ecosystem.config.js"
echo "  4. Run: pm2 save"
