#!/bin/bash
# pm2 wrapper for the MentraOS <-> OpenClaw bridge.
# Usage:  pm2 start scripts/run-bridge.sh --name mentra-bridge
#   or:   bash scripts/run-bridge.sh
set -euo pipefail

# Source environment from the deployed .env
set -a
source /opt/moltworker/.env
set +a

# Export bridge-specific vars from the .env values
export MENTRAOS_API_KEY="${MENTRA_API_KEY}"
export OPENCLAW_URL="http://localhost:18789"
export OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN}"
export MENTRA_PACKAGE_NAME="mentra-claw"
export HOME=/home/aepod

cd /opt/moltworker
exec node skills/mentra-bridge/bridge.cjs
