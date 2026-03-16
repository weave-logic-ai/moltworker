#!/bin/bash
# scripts/verify-access.sh
# Verify moltworker services are reachable through the Cloudflare Tunnel.
#
# Environment:
#   MOLTWORKER_DOMAIN  - domain to test (default: moltworker.aebots.org)

set -e

if [ -f /opt/moltworker/.env ]; then
  set -a; source /opt/moltworker/.env; set +a
fi

DOMAIN="${MOLTWORKER_DOMAIN:-moltworker.aebots.org}"
PASS=0; FAIL=0; RESULTS=()

check() {
  if [ "$2" -eq 0 ]; then
    RESULTS+=("[PASS] $1: $3"); PASS=$((PASS + 1))
  else
    RESULTS+=("[FAIL] $1: $3"); FAIL=$((FAIL + 1))
  fi
}

echo "=== Access Verification ==="
echo "Domain: $DOMAIN"
echo ""

# cloudflared
if systemctl is-active cloudflared >/dev/null 2>&1 || pgrep -f cloudflared >/dev/null 2>&1; then
  check "cloudflared" 0 "running"
else
  check "cloudflared" 1 "not running"
fi

# Domain reachable
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${DOMAIN}/health" 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  check "tunnel health" 0 "HTTP $HTTP"
elif [ "$HTTP" = "302" ] || [ "$HTTP" = "403" ]; then
  check "tunnel health" 0 "CF Access gate (HTTP $HTTP)"
else
  check "tunnel health" 1 "HTTP $HTTP"
fi

# Local services
if curl -sf --max-time 5 "http://localhost:18789/health" | grep -q '"ok":true' 2>/dev/null; then
  check "openclaw (local)" 0 "healthy"
else
  check "openclaw (local)" 1 "not responding"
fi

if curl -sf --max-time 5 "http://localhost:7010/" >/dev/null 2>&1; then
  check "mentra bridge (local)" 0 "responding"
else
  check "mentra bridge (local)" 1 "not responding"
fi

echo ""
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo ""
echo "Passed: $PASS  Failed: $FAIL"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
