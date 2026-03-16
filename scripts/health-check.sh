#!/bin/bash
# scripts/health-check.sh
# Cron-compatible health probe for moltworker services.
# Exit 0 = healthy, 1 = one or more checks failed.
#
# Cron: */5 * * * * /opt/moltworker/scripts/health-check.sh >> /var/log/moltworker-health.log 2>&1
#
# Environment:
#   ALERT_WEBHOOK_URL  - Discord/Slack webhook URL (optional)

set -euo pipefail

if [ -f /opt/moltworker/.env ]; then
  set -a; source /opt/moltworker/.env; set +a
fi

FAILURES=()
TIMESTAMP=$(date -Iseconds)

# Check 1: OpenClaw gateway (/health returns JSON)
if curl -sf --max-time 5 "http://localhost:18789/health" | grep -q '"ok":true' 2>/dev/null; then
  :
else
  FAILURES+=("OpenClaw gateway not healthy on localhost:18789")
fi

# Check 2: Mentra bridge
if curl -sf --max-time 5 "http://localhost:7010/" >/dev/null 2>&1; then
  :
else
  FAILURES+=("Mentra bridge not responding on localhost:7010")
fi

# Check 3: cloudflared
if systemctl is-active cloudflared >/dev/null 2>&1 || pgrep -f cloudflared >/dev/null 2>&1; then
  :
else
  FAILURES+=("cloudflared is not running")
fi

# Check 4: pm2 processes
if command -v pm2 &>/dev/null; then
  PM2_STOPPED=$(pm2 jlist 2>/dev/null | node -e "
    const p = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    p.filter(x => x.pm2_env.status !== 'online').forEach(x => console.log(x.name + ':' + x.pm2_env.status));
  " 2>/dev/null || echo "")
  while IFS= read -r line; do
    [ -n "$line" ] && FAILURES+=("pm2 process $line")
  done <<< "$PM2_STOPPED"
fi

# Report
if [ ${#FAILURES[@]} -eq 0 ]; then
  echo "[$TIMESTAMP] HEALTHY"
  exit 0
fi

FAIL_MSG="[$TIMESTAMP] UNHEALTHY: ${#FAILURES[@]} check(s) failed"
for f in "${FAILURES[@]}"; do FAIL_MSG+="\n  - $f"; done
echo -e "$FAIL_MSG"

# Webhook alert
if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
  HOST=$(hostname 2>/dev/null || echo "moltworker")
  BODY=""
  for f in "${FAILURES[@]}"; do BODY+="\\n- $f"; done
  if echo "$ALERT_WEBHOOK_URL" | grep -q "discord"; then
    PAYLOAD="{\"content\": \"**Moltworker Alert** ($HOST)\\n$BODY\"}"
  else
    PAYLOAD="{\"text\": \"Moltworker Alert ($HOST)\\n$BODY\"}"
  fi
  curl -sf --max-time 10 -H "Content-Type: application/json" -d "$PAYLOAD" "$ALERT_WEBHOOK_URL" >/dev/null 2>&1 || true
fi

exit 1
