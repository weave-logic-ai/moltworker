#!/bin/bash
# scripts/setup-vm.sh
# One-time VM setup for a fresh c4a-standard-1 (ARM64) Debian 12 instance.
# Run as root: sudo bash scripts/setup-vm.sh

set -e

echo "=== Moltworker VM Setup ==="

# Install essentials
echo "Installing git and curl..."
apt-get update -qq && apt-get install -y git curl

# Install Node.js 22
echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
echo "Node.js $(node --version) installed"

# Install pm2
echo "Installing pm2..."
npm install -g pm2

# Install OpenClaw
echo "Installing OpenClaw..."
npm install -g openclaw@latest

# Install cloudflared (ARM64 binary — apt repo doesn't support ARM Debian)
echo "Installing cloudflared..."
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Clone repo
echo "Setting up /opt/moltworker..."
mkdir -p /opt/moltworker
cd /opt/moltworker
if [ ! -d ".git" ]; then
  git clone https://github.com/weave-logic-ai/moltworker.git .
else
  echo "Repo exists, pulling latest..."
  git pull
fi

# Install mentra-bridge dependencies
echo "Installing mentra-bridge deps..."
cd /opt/moltworker/skills/mentra-bridge
npm install @mentra/sdk
cd /opt/moltworker

# pm2 startup
pm2 startup systemd -u root --hp /root

echo ""
echo "=== Setup Complete ==="
echo "Versions:"
echo "  Node:        $(node --version)"
echo "  pm2:         $(pm2 --version 2>/dev/null)"
echo "  OpenClaw:    $(openclaw --version 2>&1 | head -1)"
echo "  cloudflared: $(cloudflared --version 2>&1)"
echo ""
echo "Next steps:"
echo "  1. Create /opt/moltworker/.env from .env.example"
echo "  2. Create wrapper scripts: scripts/run-openclaw.sh, scripts/run-mentra-bridge.sh"
echo "  3. pm2 start scripts/run-openclaw.sh --name openclaw --interpreter bash"
echo "  4. pm2 start scripts/run-mentra-bridge.sh --name mentra-bridge --interpreter bash"
echo "  5. pm2 save"
echo "  6. Set up cloudflared tunnel (token from CF dashboard)"
