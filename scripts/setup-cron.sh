#!/bin/bash
# scripts/setup-cron.sh
# Install health check cron job and log rotation.
# Idempotent: safe to run multiple times.
#
# Usage: bash scripts/setup-cron.sh

set -e

HEALTH_SCRIPT="/opt/moltworker/scripts/health-check.sh"
LOG_FILE="/var/log/moltworker-health.log"
CRON_ENTRY="*/5 * * * * ${HEALTH_SCRIPT} >> ${LOG_FILE} 2>&1"
CRON_MARKER="# moltworker-health-check"

echo "=== Setting up Moltworker Health Check Cron ==="

# --- Ensure health check script is executable ---
if [ -f "$HEALTH_SCRIPT" ]; then
  chmod +x "$HEALTH_SCRIPT"
  echo "Health check script: $HEALTH_SCRIPT"
else
  echo "ERROR: $HEALTH_SCRIPT not found."
  echo "Run this script from the VM after deploying."
  exit 1
fi

# --- Create log file with proper permissions ---
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
echo "Log file: $LOG_FILE"

# --- Add cron entry (idempotent) ---
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

if echo "$CURRENT_CRON" | grep -qF "$CRON_MARKER"; then
  echo "Cron entry already exists, updating..."
  # Remove old entry and add new one
  NEW_CRON=$(echo "$CURRENT_CRON" | grep -vF "$CRON_MARKER")
  echo "${NEW_CRON}
${CRON_ENTRY} ${CRON_MARKER}" | crontab -
else
  echo "Adding cron entry..."
  echo "${CURRENT_CRON}
${CRON_ENTRY} ${CRON_MARKER}" | crontab -
fi

echo "Cron installed: every 5 minutes"

# --- Setup log rotation ---
LOGROTATE_CONF="/etc/logrotate.d/moltworker-health"

cat > "$LOGROTATE_CONF" << 'EOF'
/var/log/moltworker-health.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

echo "Log rotation configured: $LOGROTATE_CONF (daily, 7 days retention)"

# --- Verify ---
echo ""
echo "=== Verification ==="
echo "Cron entries:"
crontab -l 2>/dev/null | grep -F "moltworker" || echo "  (none found)"
echo ""
echo "Logrotate config:"
cat "$LOGROTATE_CONF"
echo ""
echo "Setup complete. Health checks will run every 5 minutes."
echo "View logs: tail -f $LOG_FILE"
