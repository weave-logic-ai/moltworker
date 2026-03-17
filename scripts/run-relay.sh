#!/bin/bash
# pm2 wrapper for the Mentra bridge WebSocket relay server.
# Usage: pm2 start scripts/run-relay.sh --name mentra-relay
cd /opt/moltworker
exec node skills/mentra-bridge/relay-server.cjs
