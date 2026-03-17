#!/bin/bash
# install-mentra-plugin.sh
#
# Installs the Mentra channel plugin into OpenClaw's extensions directory
# and enables it. Run on the VM where OpenClaw is installed.
#
# Usage:
#   bash scripts/install-mentra-plugin.sh
#
# Prerequisites:
#   - OpenClaw installed (openclaw binary in PATH)
#   - @mentra/sdk installed at /opt/moltworker/skills/mentra-bridge/node_modules/
#   - tts-normalize.cjs at /opt/moltworker/skills/mentra-bridge/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
PLUGIN_SRC="$REPO_DIR/openclaw-plugins/mentra"
OPENCLAW_EXT="/opt/openclaw/dist-runtime/extensions/mentra"

echo "[install-mentra-plugin] Source: $PLUGIN_SRC"
echo "[install-mentra-plugin] Target: $OPENCLAW_EXT"

# -- 1. Verify source files exist --------------------------------------------
for f in openclaw.plugin.json index.js package.json; do
    if [ ! -f "$PLUGIN_SRC/$f" ]; then
        echo "ERROR: Missing $PLUGIN_SRC/$f"
        exit 1
    fi
done

# -- 2. Verify SDK dependency is available ------------------------------------
SDK_PATH="/opt/moltworker/skills/mentra-bridge/node_modules/@mentra/sdk"
if [ ! -d "$SDK_PATH" ]; then
    echo "WARNING: @mentra/sdk not found at $SDK_PATH"
    echo "  The plugin will fail to start without it."
    echo "  Install with: cd /opt/moltworker/skills/mentra-bridge && npm install @mentra/sdk"
fi

TTS_PATH="/opt/moltworker/skills/mentra-bridge/tts-normalize.cjs"
if [ ! -f "$TTS_PATH" ]; then
    echo "WARNING: tts-normalize.cjs not found at $TTS_PATH"
fi

# -- 3. Copy plugin files to extensions directory -----------------------------
echo "[install-mentra-plugin] Copying plugin files..."
mkdir -p "$OPENCLAW_EXT"
cp -v "$PLUGIN_SRC/openclaw.plugin.json" "$OPENCLAW_EXT/"
cp -v "$PLUGIN_SRC/index.js" "$OPENCLAW_EXT/"
cp -v "$PLUGIN_SRC/package.json" "$OPENCLAW_EXT/"

echo "[install-mentra-plugin] Plugin files installed to $OPENCLAW_EXT"

# -- 4. Enable the plugin (if openclaw CLI supports it) -----------------------
if command -v openclaw &>/dev/null; then
    echo "[install-mentra-plugin] Enabling mentra plugin..."
    openclaw plugins enable mentra 2>/dev/null || {
        echo "NOTE: 'openclaw plugins enable' not available. Plugin will be loaded on next start."
    }
else
    echo "NOTE: openclaw CLI not in PATH. Plugin will be loaded when openclaw starts."
fi

# -- 5. Add mentra channel config to openclaw.json if not present -------------
CONFIG_FILE="${HOME}/.openclaw/openclaw.json"
if [ -f "$CONFIG_FILE" ]; then
    # Check if mentra channel is already configured
    if ! node -e "
        const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));
        process.exit(c.channels?.mentra ? 0 : 1);
    " 2>/dev/null; then
        echo "[install-mentra-plugin] Adding mentra channel to openclaw.json..."
        node -e "
            const fs = require('fs');
            const c = JSON.parse(fs.readFileSync('$CONFIG_FILE','utf8'));
            c.channels = c.channels || {};
            c.channels.mentra = {
                enabled: true,
                port: parseInt(process.env.MENTRA_BRIDGE_PORT || '7010', 10),
            };
            fs.writeFileSync('$CONFIG_FILE', JSON.stringify(c, null, 2));
            console.log('[install-mentra-plugin] mentra channel added to config');
        "
    else
        echo "[install-mentra-plugin] mentra channel already in config"
    fi
else
    echo "NOTE: $CONFIG_FILE not found. Configure mentra channel manually."
fi

# -- 6. Restart openclaw if running -------------------------------------------
if pgrep -f "openclaw gateway" > /dev/null 2>&1; then
    echo "[install-mentra-plugin] Restarting openclaw gateway..."
    # Use pm2 if available, otherwise kill + restart
    if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q openclaw; then
        pm2 restart openclaw
    else
        echo "  Sending SIGTERM to openclaw gateway..."
        pkill -f "openclaw gateway" || true
        sleep 2
        echo "  OpenClaw gateway stopped. Start it manually or it will restart via supervisor."
    fi
else
    echo "NOTE: openclaw gateway not running. Start it to activate the mentra channel."
fi

echo ""
echo "[install-mentra-plugin] Done."
echo ""
echo "To run the mentra channel standalone:"
echo "  MENTRAOS_API_KEY=your-key node $OPENCLAW_EXT/index.js"
echo ""
echo "Or from the repo:"
echo "  MENTRAOS_API_KEY=your-key node $PLUGIN_SRC/index.js"
