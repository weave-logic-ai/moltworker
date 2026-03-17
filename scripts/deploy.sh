#!/bin/bash
# scripts/deploy.sh
# Deploy latest code to the VM and restart services.
# Handles both moltworker app and openclaw gateway.
# Run on the VM: bash scripts/deploy.sh [--openclaw-only | --moltworker-only]

set -e

DEPLOY_OPENCLAW=true
DEPLOY_MOLTWORKER=true

for arg in "$@"; do
  case "$arg" in
    --openclaw-only) DEPLOY_MOLTWORKER=false ;;
    --moltworker-only) DEPLOY_OPENCLAW=false ;;
  esac
done

if [ "$DEPLOY_OPENCLAW" = true ]; then
  echo "=== Deploying OpenClaw (/opt/openclaw) ==="
  cd /opt/openclaw
  git pull
  pnpm install
  pnpm build
  echo "OpenClaw built"
fi

if [ "$DEPLOY_MOLTWORKER" = true ]; then
  echo "=== Deploying Moltworker (/opt/moltworker) ==="
  cd /opt/moltworker
  git pull
  npm install --omit=dev
  cd skills/mentra-bridge && npm install @mentra/sdk && cd /opt/moltworker
  echo "Moltworker updated"
fi

echo "=== Restarting services ==="
pm2 restart all
pm2 save

echo "=== Deploy complete ==="
pm2 list
