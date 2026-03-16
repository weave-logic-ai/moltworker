#!/bin/bash
# scripts/deploy.sh
# Standalone deploy script for manual use on the VM.
# Pulls latest code, installs deps, and restarts pm2 services.

set -e

echo "=== Deploying moltworker ==="

cd /opt/moltworker

echo "Pulling latest from main..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Restarting pm2 services..."
pm2 restart ecosystem.config.js

echo "Saving pm2 process list..."
pm2 save

echo "=== Deploy complete ==="
