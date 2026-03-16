#!/bin/bash
# scripts/health-check.sh
# Cron-compatible health probe for moltworker services.
# Checks OpenClaw gateway, Mentra bridge, cloudflared, and pm2 processes.
# Sends webhook alert on failure.
#
# Exit codes: 0 = all healthy, 1 = one or more checks failed
#
# Environment:
#   ALERT_WEBHOOK_URL  - Discord/Slack incoming webhook URL (optional)
#
# Cron usage:
#   */5 * * * * /opt/moltworker/scripts/health-check.sh >> /var/log/moltworker-health.log 2>&1

set -euo pipefail

# Source .env if available
if [ -f /opt/moltworker/.env ]; then
  set -a
  source /opt/moltworker/.env
  set +a
fi

FAILURES=()
TIMESTAMP=$(date -Iseconds)

# --- Check 1: OpenClaw gateway ---
if curl -sf --max-time 5 "http://localhost:18789/v1/models" >/dev/null 2>&1; then
  : # healthy
else
  FAILURES+=("OpenClaw gateway not responding on localhost:18789")
fi

# --- Check 2: Mentra bridge ---
if curl -sf --max-time 5 "http://localhost:7010/" >/dev/null 2>&1; then
  : # healthy
else
  FAILURES+=("Mentra bridge not responding on localhost:7010")
fi

# --- Check 3: cloudflared ---
if systemctl is-active cloudflared >/dev/null 2>&1; then
  : # healthy via systemd
elif pgrep -f cloudflared >/dev/null 2>&1; then
  : # healthy via process
else
  FAILURES+=("cloudflared is not running")
fi

# --- Check 4: pm2 processes ---
if command -v pm2 &>/dev/null; then
  PM2_JSON=$(pm2 jlist 2>/dev/null || echo "[]")
  PM2_COUNT=$(echo "$PM2_JSON" | node -e "
    const procs = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const stopped = procs.filter(p => p.pm2_env.status !== 'online');
    stopped.forEach(p => console.log(p.name + ':' + p.pm2_env.status));
  " 2>/dev/null || echo "")

  if [ -n "$PM2_COUNT" ]; then
    while IFS= read -r line; do
      if [ -n "$line" ]; then
        FAILURES+=("pm2 process $line")
      fi
    done <<< "$PM2_COUNT"
  fi
else
  FAILURES+=("pm2 not found in PATH")
fi

# --- Report ---
if [ ${#FAILURES[@]} -eq 0 ]; then
  echo "[$TIMESTAMP] HEALTHY: all checks passed"
  exit 0
fi

# Build failure message
FAIL_MSG="[$TIMESTAMP] UNHEALTHY: ${#FAILURES[@]} check(s) failed"
for f in "${FAILURES[@]}"; do
  FAIL_MSG+="\n  - $f"
done

echo -e "$FAIL_MSG"

# --- Send webhook alert ---
if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
  HOSTNAME=$(hostname 2>/dev/null || echo "moltworker-vm")
  PLAIN_FAILURES=""
  for f in "${FAILURES[@]}"; do
    PLAIN_FAILURES+="\\n- $f"
  done

  # Detect webhook type by URL pattern
  if echo "$ALERT_WEBHOOK_URL" | grep -q "discord"; then
    # Discord webhook format
    PAYLOAD=$(cat <<EOFPAYLOAD
{
  "content": "**Moltworker Health Alert** ($HOSTNAME)\\n$PLAIN_FAILURES\\n\\nTimestamp: $TIMESTAMP"
}
EOFPAYLOAD
    )
  else
    # Slack webhook format (also works for generic webhooks)
    PAYLOAD=$(cat <<EOFPAYLOAD
{
  "text": "Moltworker Health Alert ($HOSTNAME)\\n$PLAIN_FAILURES\\n\\nTimestamp: $TIMESTAMP"
}
EOFPAYLOAD
    )
  fi

  curl -sf --max-time 10 \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$ALERT_WEBHOOK_URL" >/dev/null 2>&1 || echo "WARNING: failed to send webhook alert"
fi

exit 1
