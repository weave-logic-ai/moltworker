#!/bin/bash
# scripts/deploy.sh
# Deploy latest code to the VM and restart services.
# Run on the VM: sudo bash scripts/deploy.sh

set -e

echo "=== Deploying moltworker ==="

cd /opt/moltworker

echo "Pulling latest..."
git pull

echo "Installing dependencies..."
npm install --omit=dev

echo "Installing mentra-bridge deps..."
cd skills/mentra-bridge && npm install @mentra/sdk && cd /opt/moltworker

echo "Restarting services..."
pm2 restart all
pm2 save

echo "=== Deploy complete ==="
pm2 list
