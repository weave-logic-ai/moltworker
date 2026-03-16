#!/bin/bash
# scripts/verify-access.sh
# Verify Cloudflare Tunnel + Access configuration for moltworker.
#
# Checks:
#   1. cloudflared tunnel is running
#   2. Moltworker domain responds (via tunnel)
#   3. /mentra/* path bypasses CF Access (no auth required)
#   4. Admin routes are protected by CF Access (unauthenticated = blocked)
#
# Environment variables:
#   MOLTWORKER_DOMAIN  - domain to test (e.g., moltworker.aepod23.com)
#
# Usage: bash scripts/verify-access.sh

set -e

# Source .env if available
if [ -f /opt/moltworker/.env ]; then
  set -a
  source /opt/moltworker/.env
  set +a
fi

DOMAIN="${MOLTWORKER_DOMAIN:-}"

if [ -z "$DOMAIN" ]; then
  echo "ERROR: MOLTWORKER_DOMAIN not set."
  echo "Export it or add to /opt/moltworker/.env"
  echo "Example: export MOLTWORKER_DOMAIN=moltworker.aepod23.com"
  exit 1
fi

PASS=0
FAIL=0
RESULTS=()

check() {
  local name="$1"
  local status="$2" # 0 = pass, 1 = fail
  local detail="$3"

  if [ "$status" -eq 0 ]; then
    RESULTS+=("[PASS] $name: $detail")
    PASS=$((PASS + 1))
  else
    RESULTS+=("[FAIL] $name: $detail")
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Moltworker Access Verification ==="
echo "Domain: $DOMAIN"
echo ""

# --- Check 1: cloudflared tunnel status ---
echo "Checking cloudflared..."
if systemctl is-active cloudflared >/dev/null 2>&1; then
  check "cloudflared systemd" 0 "service is active"
elif pgrep -f cloudflared >/dev/null 2>&1; then
  check "cloudflared process" 0 "process is running (not systemd)"
else
  check "cloudflared" 1 "not running (systemctl inactive, no process found)"
fi

# --- Check 2: Domain responds via tunnel ---
echo "Checking domain reachability..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  "https://${DOMAIN}/" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
  check "domain reachable" 1 "connection failed (timeout or DNS error)"
elif [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
  # 403/302 = CF Access is protecting it (expected for admin routes)
  # 200 = direct access (maybe bypass or authenticated)
  check "domain reachable" 0 "responds with HTTP $HTTP_CODE"
else
  check "domain reachable" 1 "unexpected HTTP $HTTP_CODE"
fi

# --- Check 3: /mentra/* bypass (no auth required) ---
echo "Checking mentra bypass..."
MENTRA_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  "https://${DOMAIN}/mentra/" 2>/dev/null || echo "000")

if [ "$MENTRA_CODE" = "000" ]; then
  check "mentra bypass" 1 "connection failed"
elif [ "$MENTRA_CODE" = "200" ] || [ "$MENTRA_CODE" = "404" ] || [ "$MENTRA_CODE" = "502" ]; then
  # 200 = mentra bridge responding
  # 404 = reached origin but no matching route (still means bypass works)
  # 502 = reached origin but mentra bridge not running (bypass works, service down)
  check "mentra bypass" 0 "no CF Access challenge (HTTP $MENTRA_CODE)"
elif [ "$MENTRA_CODE" = "403" ] || [ "$MENTRA_CODE" = "302" ]; then
  # 403/302 = CF Access is blocking — bypass is NOT configured
  check "mentra bypass" 1 "CF Access is blocking /mentra/ (HTTP $MENTRA_CODE) — bypass not configured"
else
  check "mentra bypass" 1 "unexpected HTTP $MENTRA_CODE"
fi

# --- Check 4: Admin routes protected by CF Access ---
echo "Checking admin protection..."
# Use a clean curl with no cookies/tokens to simulate unauthenticated access
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  -H "Cookie: " \
  "https://${DOMAIN}/v1/models" 2>/dev/null || echo "000")

if [ "$ADMIN_CODE" = "000" ]; then
  check "admin protection" 1 "connection failed"
elif [ "$ADMIN_CODE" = "403" ] || [ "$ADMIN_CODE" = "302" ]; then
  # 403 = access denied, 302 = redirect to CF Access login
  check "admin protection" 0 "unauthenticated request blocked (HTTP $ADMIN_CODE)"
elif [ "$ADMIN_CODE" = "200" ]; then
  check "admin protection" 1 "unauthenticated request NOT blocked (HTTP 200) — CF Access may be misconfigured"
else
  # Other codes (401, 500, etc.) are ambiguous
  check "admin protection" 0 "returned HTTP $ADMIN_CODE (not 200, likely protected)"
fi

# --- Check 5: Local services responding (run on the VM) ---
echo "Checking local services..."
if curl -s --max-time 5 "http://localhost:18789/v1/models" >/dev/null 2>&1; then
  check "openclaw gateway (local)" 0 "localhost:18789 responding"
else
  check "openclaw gateway (local)" 1 "localhost:18789 not responding"
fi

if curl -s --max-time 5 "http://localhost:7010/" >/dev/null 2>&1; then
  check "mentra bridge (local)" 0 "localhost:7010 responding"
else
  check "mentra bridge (local)" 1 "localhost:7010 not responding"
fi

# --- Report ---
echo ""
echo "=== Results ==="
for result in "${RESULTS[@]}"; do
  echo "  $result"
done
echo ""
echo "Passed: $PASS  Failed: $FAIL  Total: $((PASS + FAIL))"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Some checks failed. Review the output above."
  exit 1
else
  echo "All checks passed."
  exit 0
fi
