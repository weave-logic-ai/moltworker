#!/bin/bash
# scripts/migrate-r2-to-local.sh
# Migrate data from Cloudflare R2 bucket to local filesystem on the VM.
# Uses rclone to download R2 contents with the same path mapping as
# start-openclaw.sh used in the CF Container environment.
#
# R2 paths -> Local paths:
#   r2:moltbot-data/openclaw/   -> /root/.openclaw/
#   r2:moltbot-data/workspace/  -> /root/clawd/
#   r2:moltbot-data/skills/     -> /root/clawd/skills/
#
# Prerequisites:
#   - rclone installed (apt install rclone)
#   - R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID in .env or environment
#
# Usage: bash scripts/migrate-r2-to-local.sh [--dry-run]

set -e

DRY_RUN=false
ENV_FILE="/opt/moltworker/.env"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --env-file=*) ENV_FILE="${arg#*=}" ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

echo "=== R2 to Local Filesystem Migration ==="

# Source .env for R2 credentials
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Validate R2 credentials
if [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ] || [ -z "$CF_ACCOUNT_ID" ]; then
  echo "ERROR: R2 credentials not found."
  echo "Required environment variables:"
  echo "  R2_ACCESS_KEY_ID"
  echo "  R2_SECRET_ACCESS_KEY"
  echo "  CF_ACCOUNT_ID"
  echo ""
  echo "Set them in $ENV_FILE or export before running."
  exit 1
fi

# Check rclone is installed
if ! command -v rclone &>/dev/null; then
  echo "Installing rclone..."
  curl -fsSL https://rclone.org/install.sh | bash
fi

# --- Configure rclone ---
RCLONE_CONF="/tmp/rclone-migrate.conf"

cat > "$RCLONE_CONF" << EOF
[r2]
type = s3
provider = Cloudflare
access_key_id = ${R2_ACCESS_KEY_ID}
secret_access_key = ${R2_SECRET_ACCESS_KEY}
endpoint = https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com
acl = private
no_check_bucket = true
EOF

R2_BUCKET="${R2_BUCKET_NAME:-moltbot-data}"
RCLONE_FLAGS="--config=$RCLONE_CONF --transfers=16 --fast-list --s3-no-check-bucket"

echo "R2 bucket: $R2_BUCKET"
echo "Dry run: $DRY_RUN"
echo ""

# --- Path mappings (mirrors start-openclaw.sh) ---
declare -A PATHS=(
  ["openclaw/"]="/root/.openclaw/"
  ["workspace/"]="/root/clawd/"
  ["skills/"]="/root/clawd/skills/"
)

TOTAL_FILES=0

for r2_path in "${!PATHS[@]}"; do
  local_path="${PATHS[$r2_path]}"
  echo "--- Checking r2:${R2_BUCKET}/${r2_path} ---"

  # Count files in R2 path
  FILE_COUNT=$(rclone ls "r2:${R2_BUCKET}/${r2_path}" $RCLONE_FLAGS 2>/dev/null | wc -l || echo 0)

  if [ "$FILE_COUNT" -eq 0 ]; then
    echo "  No files found, skipping."
    continue
  fi

  echo "  Found $FILE_COUNT files"
  TOTAL_FILES=$((TOTAL_FILES + FILE_COUNT))

  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] Would copy to $local_path"
    echo "  Files:"
    rclone ls "r2:${R2_BUCKET}/${r2_path}" $RCLONE_FLAGS 2>/dev/null | head -20
    REMAINING=$((FILE_COUNT - 20))
    if [ "$REMAINING" -gt 0 ]; then
      echo "  ... and $REMAINING more files"
    fi
  else
    echo "  Copying to $local_path ..."
    mkdir -p "$local_path"
    rclone copy "r2:${R2_BUCKET}/${r2_path}" "$local_path" \
      $RCLONE_FLAGS \
      --progress \
      --exclude='*.lock' \
      --exclude='*.tmp' \
      --exclude='.git/**' \
      --exclude='node_modules/**' \
      2>&1
    echo "  Done."
  fi
  echo ""
done

# --- Cleanup ---
rm -f "$RCLONE_CONF"

echo "=== Migration Summary ==="
echo "Total files: $TOTAL_FILES"
if [ "$DRY_RUN" = true ]; then
  echo "Mode: DRY RUN (no files copied)"
else
  echo "Mode: LIVE (files copied)"
  echo ""
  echo "Verify:"
  for r2_path in "${!PATHS[@]}"; do
    local_path="${PATHS[$r2_path]}"
    if [ -d "$local_path" ]; then
      LOCAL_COUNT=$(find "$local_path" -type f 2>/dev/null | wc -l)
      echo "  $local_path: $LOCAL_COUNT files"
    fi
  done
fi
echo ""
echo "Next: run 'bash scripts/openclaw-config.sh' to patch gateway config."
