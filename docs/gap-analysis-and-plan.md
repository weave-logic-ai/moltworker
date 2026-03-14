# Moltworker Gap Analysis & Execution Plan

**Date:** 2026-03-14
**Scope:** Deploy WeaveLogic MentraOS bridge on Cloudflare, close all gaps, self-maintaining

---

## 1. Current State Summary

### What Works (Verified Locally)
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- All 83 unit tests pass (7 test files)
- Linter passes (oxlint, 0 warnings/errors)
- Vite build succeeds (Worker bundle + client SPA)
- Full Hono routing: public, admin, debug, CDP, mentra endpoints
- MentraOS bridge code: `src/mentra/` — augment, glass-bridge, display-format
- Mentra routes: `/mentra/health`, `/mentra/status`, `/mentra/webhook`
- Gateway process lifecycle: find, start, wait, kill, restart
- R2 persistence: rclone restore on boot, 30s background sync, manual sync API
- AI provider chain: CF AI Gateway > Legacy Gateway > Anthropic > OpenAI
- Auth: CF Access JWT validation, gateway token injection, device pairing
- CDP browser automation shim (Puppeteer via Browser Rendering binding)
- Admin UI: React SPA at `/_admin/` with device management, storage status
- Container: Dockerfile based on `cloudflare/sandbox:0.7.0`, Node 22, OpenClaw v2026.2.3
- CI/CD: `deploy.yml` (typecheck -> deploy/preview), `test.yml` (lint+format+typecheck+test+E2E)
- Fork is 4 commits ahead of `cloudflare/moltworker` upstream, 0 behind

### What's Not Working / Gaps

| # | Gap | Severity | Category |
|---|-----|----------|----------|
| G1 | **No initial deploy has happened** — Worker not deployed to Cloudflare | CRITICAL | Deploy |
| G2 | **GitHub Actions secrets not configured** — deploy.yml needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID + all wrangler secrets | CRITICAL | Deploy |
| G3 | **WORKER_URL unknown** — can't be set until first deploy reveals the worker subdomain | HIGH | Deploy |
| G4 | **`@mentraos/sdk` does not exist** — original prompt references wrong package name; real SDK is `@mentra/sdk` v2.1.29 but is NOT compatible with CF Workers (requires express/ws). Custom HTTP bridge is the correct approach. | LOW | Integration |
| G5 | **MentraOS augment not registered** — no Mentra Marketplace registration at `console.mentra.glass` (not `developer.mentra.com` as WEAVELOGIC.md states) | HIGH | Integration |
| G5b | **WEAVELOGIC.md has wrong portal URL** — references `developer.mentra.com`, real portal is `console.mentra.glass` | LOW | Docs |
| G5c | **Real SDK event names differ** — real SDK uses `onPhotoTaken` (not `onPhoto`), `showTextWall()` (not `sendText()`) — custom bridge should document these differences | LOW | Docs |
| G5d | **Experimental `3.0.0-hono` branch** of `@mentra/sdk` exists — Hono-based version could become Worker-compatible; worth tracking | LOW | Future |
| G6 | **Deploy workflow missing AI Gateway secrets** — only passes ANTHROPIC_API_KEY, not AI_GATEWAY_* vars | HIGH | CI/CD |
| G7 | **E2E tests require dedicated infrastructure** — E2E_* prefixed secrets not set, E2E currently non-blocking (continue-on-error) but will fail | MEDIUM | CI/CD |
| G8 | **Security: Command injection in /debug/cli** (upstream issue #299) — user-controlled `cmd` query param passed to `sandbox.startProcess()` | CRITICAL | Security |
| G9 | **Security: Secrets visible in process args** (upstream issue #300) — `openclaw gateway --token $TOKEN` visible via `ps` | HIGH | Security |
| G10 | **Gateway double-spawn race** (upstream issue #289) — concurrent requests can start multiple gateway processes | MEDIUM | Reliability |
| G11 | **Container not started before containerFetch** (upstream issue #291) — missing `sandbox.start()` in some code paths | MEDIUM | Reliability |
| G12 | **WebSocket close code 1006 forwarding** (upstream issue #260) — reserved code causes crash | MEDIUM | Reliability |
| G13 | **Memory leak in OpenClaw container** (upstream issue #253) — linear memory growth | MEDIUM | Operations |
| G14 | **SANDBOX_SLEEP_AFTER doesn't work** (upstream issue #244) — DO alarms keep container awake | LOW | Operations |
| G15 | **No health monitoring or auto-recovery** — if gateway crashes, no automated restart until next request | MEDIUM | Self-maintenance |
| G16 | **No alerting** — no notification when deploy fails, container crashes, or memory spikes | MEDIUM | Self-maintenance |
| G17 | **Mentra webhook has no auth** — `/mentra/webhook` POST is public, no MENTRA_API_KEY verification | HIGH | Security |
| G18 | **`queryOpenClaw` calls self via public URL** — webhook handler creates circular request through the Worker, adding latency and auth overhead | MEDIUM | Architecture |
| G19 | **R2 persistence uses rclone with S3 credentials** — since Nov 2025, `sandbox.mountBucket()` FUSE mount is available, eliminating need for R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID secrets entirely | LOW | Simplification |
| G20 | **Sandbox backup/restore API available** — since Feb 2026, can snapshot container state before sleep, reducing cold start data loss risk | LOW | Future |

---

## 2. Deployment Plan (Get It Rolling)

### Phase 1: Pre-Deploy Setup (Manual, ~30 min)

**1.1 Create Cloudflare Resources**
```bash
# Ensure Workers Paid plan is active ($5/mo)
# Enable Cloudflare Containers in dashboard:
# https://dash.cloudflare.com/?to=/:account/workers/containers

# Create AI Gateway (optional but recommended):
# https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/create-gateway
```

**1.2 Set Wrangler Secrets (minimum viable)**
```bash
# AI Provider (pick ONE path)
npx wrangler secret put ANTHROPIC_API_KEY          # Direct Anthropic

# Gateway token (REQUIRED)
export MOLTBOT_GATEWAY_TOKEN=$(openssl rand -hex 32)
echo "Save this token: $MOLTBOT_GATEWAY_TOKEN"
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN

# Auth (REQUIRED for admin UI)
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN      # e.g., myteam.cloudflareaccess.com
npx wrangler secret put CF_ACCESS_AUD              # from Access app settings

# R2 persistence (RECOMMENDED)
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put CF_ACCOUNT_ID
```

**1.3 First Deploy (Local)**
```bash
npm install
npm run build
npx wrangler deploy
# Output: https://moltbot-sandbox.<subdomain>.workers.dev
```

**1.4 Post-Deploy Configuration**
```bash
# Set WORKER_URL now that we know the subdomain
npx wrangler secret put WORKER_URL
# Enter: https://moltbot-sandbox.<subdomain>.workers.dev

# Enable Cloudflare Access on the worker
# Dashboard > Workers > moltbot-sandbox > Settings > Domains & Routes > Enable CF Access

# Verify deployment
curl https://moltbot-sandbox.<subdomain>.workers.dev/sandbox-health
curl https://moltbot-sandbox.<subdomain>.workers.dev/mentra/health
```

### Phase 2: GitHub Actions CI/CD (~15 min)

**2.1 Configure GitHub Secrets**
Add to `weave-logic-ai/moltworker` repo > Settings > Secrets:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Wrangler API token with Workers/R2 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your CF account ID |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `MOLTBOT_GATEWAY_TOKEN` | Same token from step 1.2 |
| `CF_ACCESS_TEAM_DOMAIN` | Your CF Access team domain |
| `CF_ACCESS_AUD` | Your CF Access audience tag |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `MENTRA_API_KEY` | MentraOS API key (once registered) |
| `WORKER_URL` | Full worker URL |

**2.2 Fix deploy.yml — Add Missing AI Gateway Secrets**
Add to `deploy.yml` secrets and env sections:
```yaml
secrets: |
  ...existing...
  AI_GATEWAY_API_KEY
  AI_GATEWAY_BASE_URL
  AI_GATEWAY_MODEL
  CLOUDFLARE_AI_GATEWAY_API_KEY
  CF_AI_GATEWAY_ACCOUNT_ID
  CF_AI_GATEWAY_GATEWAY_ID
  CF_AI_GATEWAY_MODEL
env:
  ...existing...
  AI_GATEWAY_API_KEY: ${{ secrets.AI_GATEWAY_API_KEY }}
  AI_GATEWAY_BASE_URL: ${{ secrets.AI_GATEWAY_BASE_URL }}
  AI_GATEWAY_MODEL: ${{ secrets.AI_GATEWAY_MODEL }}
  CLOUDFLARE_AI_GATEWAY_API_KEY: ${{ secrets.CLOUDFLARE_AI_GATEWAY_API_KEY }}
  CF_AI_GATEWAY_ACCOUNT_ID: ${{ secrets.CF_AI_GATEWAY_ACCOUNT_ID }}
  CF_AI_GATEWAY_GATEWAY_ID: ${{ secrets.CF_AI_GATEWAY_GATEWAY_ID }}
  CF_AI_GATEWAY_MODEL: ${{ secrets.CF_AI_GATEWAY_MODEL }}
```

### Phase 3: Verify End-to-End (~20 min)

1. Push to main → watch deploy.yml run in GitHub Actions
2. Hit `/sandbox-health` — should return `{ status: "ok" }`
3. Wait 1-2 min for container cold start
4. Open `/?token=YOUR_TOKEN` — should show OpenClaw Control UI
5. Visit `/_admin/` — should prompt CF Access login, then show admin panel
6. Hit `/mentra/health` — should return `{ status: "ok" }`
7. POST to `/mentra/webhook` with test payload:
   ```bash
   curl -X POST https://your-worker/mentra/webhook \
     -H 'Content-Type: application/json' \
     -d '{"type":"transcription","text":"Hello, what time is it?"}'
   ```
8. Check R2 — `/_admin/` should show "R2 configured, last backup: ..."

---

## 3. Security Fixes (Must-Do Before Production)

### G8: Command Injection in /debug/cli (CRITICAL)

**File:** `src/routes/debug.ts:129-150`

The `/debug/cli` endpoint passes user input directly to `sandbox.startProcess(cmd)`. An attacker with CF Access could run arbitrary commands in the container.

**Fix:** Allowlist approach — only permit specific OpenClaw CLI commands:
```typescript
const ALLOWED_COMMANDS = [
  'openclaw --help',
  'openclaw --version',
  'openclaw devices list',
  'openclaw config show',
];

debug.get('/cli', async (c) => {
  const cmd = c.req.query('cmd') || 'openclaw --help';
  if (!ALLOWED_COMMANDS.some(allowed => cmd.startsWith(allowed))) {
    return c.json({ error: 'Command not allowed' }, 403);
  }
  // ...existing logic
});
```

### G9: Secrets in Process Arguments (HIGH)

**File:** `start-openclaw.sh:364-369`

The gateway token is passed as `--token "$OPENCLAW_GATEWAY_TOKEN"` which is visible in `ps aux`.

**Fix:** Use environment variable instead of CLI arg:
```bash
# Instead of:
exec openclaw gateway --port 18789 --verbose --allow-unconfigured --bind lan --token "$OPENCLAW_GATEWAY_TOKEN"
# Use:
export OPENCLAW_GATEWAY_TOKEN="$OPENCLAW_GATEWAY_TOKEN"
exec openclaw gateway --port 18789 --verbose --allow-unconfigured --bind lan
```
(Verify OpenClaw reads `OPENCLAW_GATEWAY_TOKEN` env var — most CLIs support this)

### G17: Mentra Webhook Has No Auth (HIGH)

**File:** `src/routes/mentra.ts:38-72`

The `/mentra/webhook` endpoint is public. Anyone can POST and trigger AI queries using your API key.

**Fix:** Add API key verification:
```typescript
mentraRoutes.post('/webhook', async (c) => {
  // Verify MENTRA_API_KEY if configured
  const expectedKey = c.env.MENTRA_API_KEY;
  if (expectedKey) {
    const authHeader = c.req.header('Authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    if (providedKey !== expectedKey) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
  // ...existing logic
});
```

---

## 4. Reliability Fixes

### G10: Gateway Double-Spawn (MEDIUM)

**File:** `src/gateway/process.ts:56-138`

Two concurrent requests can both see "no existing process" and both start new processes.

**Fix:** Use a Durable Object alarm or a lightweight lock:
```typescript
// In ensureMoltbotGateway, add coordination via DO storage
const startKey = 'gateway-starting';
const existing = await sandbox.storage?.get(startKey);
if (existing && Date.now() - existing < STARTUP_TIMEOUT_MS) {
  // Another request is starting the gateway, wait for it
  await findAndWaitForExisting();
}
await sandbox.storage?.put(startKey, Date.now());
```

### G12: WebSocket Close Code 1006 (MEDIUM)

**File:** `src/index.ts:393-413`

Code 1006 is a reserved WebSocket close code that cannot be sent programmatically.

**Fix:** Map reserved codes to valid ones:
```typescript
containerWs.addEventListener('close', (event) => {
  let code = event.code;
  // 1006 is "Abnormal Closure" — reserved, cannot be sent
  if (code === 1006) code = 1011; // "Unexpected Condition"
  serverWs.close(code, reason);
});
```

### G18: Circular Self-Request in Webhook (MEDIUM)

**File:** `src/routes/mentra.ts:44`

The webhook constructs `gatewayUrl` from the Worker's own URL, causing a circular HTTP request through the entire Worker stack (including auth middleware).

**Fix:** Use `sandbox.containerFetch()` to call the gateway directly:
```typescript
mentraRoutes.post('/webhook', async (c) => {
  const sandbox = c.get('sandbox');
  // Call gateway directly inside container, bypassing Worker proxy
  const response = await sandbox.containerFetch(
    new Request(`http://localhost:18789/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({ message, imageData: body.imageData }),
    }),
    18789
  );
  // ...
});
```

---

## 5. MentraOS Integration Completion

### G4: @mentraos/sdk Does Not Exist — Real SDK is @mentra/sdk

**Research finding:** The original build prompt references `@mentraos/sdk` — this package does **not exist** on npm (returns 404). The real SDK is `@mentra/sdk` v2.1.29, published by the Mentra team.

However, `@mentra/sdk` depends on `express`, `ws`, `axios` and requires a long-lived Node.js/Bun server process with persistent WebSocket connections to `wss://cloud.mentraos.com/app-ws`. This is **fundamentally incompatible** with Cloudflare Workers (V8 isolates, request-response lifecycle, no outbound persistent WebSockets).

**Decision:** Do NOT install `@mentra/sdk` as a Worker dependency. The custom HTTP bridge in `src/mentra/` is the architecturally correct approach.

**Important:** There is an experimental `3.0.0-hono` branch of `@mentra/sdk` on npm. Since Hono is Worker-native, this could eventually enable direct SDK usage in Workers. Track this for future integration.

**Real SDK event/method differences (for documentation accuracy):**
| This codebase | Real @mentra/sdk |
|---------------|------------------|
| `onPhoto(session, event)` | `session.events.onPhotoTaken(callback)` |
| `session.sendText(text)` | `session.layouts.showTextWall(text)` |
| `onTranscription(session, event)` | `session.events.onTranscription(callback)` |
| `onButtonPress(session)` | `session.events.onButtonPress(callback)` |

**Action items:**
1. Update WEAVELOGIC.md to document the HTTP webhook bridge rationale
2. Note that the real SDK uses different event/method names
3. Monitor `@mentra/sdk@3.0.0-hono` for Worker compatibility

### G5: Mentra Marketplace Registration

**Critical correction:** The developer portal is at `console.mentra.glass` (NOT `developer.mentra.com` as stated in WEAVELOGIC.md). The app store is at `apps.mentra.glass`.

**After deploy succeeds:**
1. Go to https://console.mentra.glass
2. Register augment: `com.weavelogic.openclaw`
3. Set webhook URL: `https://moltbot-sandbox.<subdomain>.workers.dev/mentra/webhook`
4. Permissions: microphone, camera, display, notifications
5. Submit for review
6. Set `MENTRA_API_KEY` (environment variable name: `MENTRAOS_API_KEY` in the real SDK)

**Real documentation references:**
- SDK docs: https://cloud-docs.mentra.glass/sdk/getting-started
- App dev overview: https://docs.mentraglass.com/app-devs/getting-started/overview
- Example app: https://github.com/Mentra-Community/MentraOS-Cloud-Example-App

---

## 6. Self-Maintenance Plan

### 6.1 Automated Health Checks (Cron)

Add a scheduled Worker trigger that runs every 5 minutes:

```jsonc
// wrangler.jsonc - add triggers
"triggers": {
  "crons": ["*/5 * * * *"]
}
```

```typescript
// src/index.ts - add scheduled handler
export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    // Check gateway health
    const sandbox = getSandbox(env.Sandbox, 'moltbot', { keepAlive: true });
    const process = await findExistingMoltbotProcess(sandbox);
    if (!process || process.status !== 'running') {
      console.error('[CRON] Gateway not running, restarting...');
      ctx.waitUntil(ensureMoltbotGateway(sandbox, env));
    }
    // Check memory usage
    const memInfo = await sandbox.exec('cat /proc/meminfo | head -5');
    console.log('[CRON] Memory:', memInfo.stdout);
  }
};
```

### 6.2 Upstream Sync Automation

Create a GitHub Action that checks for upstream changes weekly:

```yaml
# .github/workflows/upstream-sync.yml
name: Upstream Sync Check
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly Monday
  workflow_dispatch:

jobs:
  check-upstream:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: |
          git remote add upstream https://github.com/cloudflare/moltworker.git || true
          git fetch upstream main
          BEHIND=$(git rev-list HEAD..upstream/main --count)
          if [ "$BEHIND" -gt 0 ]; then
            echo "::warning::$BEHIND commits behind upstream"
            # Create issue if not already exists
            gh issue list --label "upstream-sync" --state open | grep -q "." || \
              gh issue create --title "Upstream sync: $BEHIND commits behind" \
                --label "upstream-sync" \
                --body "cloudflare/moltworker has $BEHIND new commits. Run: git fetch upstream && git merge upstream/main"
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 6.3 Dependabot / Security Updates

Already configured (Dependabot PRs visible in workflow runs). Ensure auto-merge for patch versions:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]
```

### 6.4 Container Memory Watchdog

Add to `start-openclaw.sh` after the sync loop:
```bash
# Memory watchdog — restart gateway if RSS > 3GB (out of 4GB container)
(
  while true; do
    sleep 300  # Check every 5 min
    RSS_KB=$(ps -o rss= -p $(pgrep -f "openclaw gateway" | head -1) 2>/dev/null || echo 0)
    if [ "$RSS_KB" -gt 3145728 ]; then  # 3GB in KB
      echo "[WATCHDOG] Memory limit exceeded (${RSS_KB}KB), restarting gateway"
      pkill -f "openclaw gateway"
      # The startup script exec's the gateway, so this kills the container
      # The Worker will restart it on next request
    fi
  done
) &
```

---

## 7. Execution Order (Priority-Ordered)

### Immediate (Before First Deploy)
| # | Task | Est. | Depends On |
|---|------|------|------------|
| 1 | Fix G8: Command injection in /debug/cli | 15 min | - |
| 2 | Fix G17: Add auth to /mentra/webhook | 10 min | - |
| 3 | Fix G9: Remove token from process args | 10 min | - |
| 4 | Fix G12: WebSocket close code 1006 | 5 min | - |
| 5 | Fix G6: Add AI Gateway secrets to deploy.yml | 5 min | - |

### Deploy Day
| # | Task | Est. | Depends On |
|---|------|------|------------|
| 6 | Phase 1: Pre-deploy setup (manual) | 30 min | 1-5 |
| 7 | Phase 2: GitHub Actions secrets | 15 min | 6 |
| 8 | Phase 3: Verify end-to-end | 20 min | 7 |

### Post-Deploy (Week 1)
| # | Task | Est. | Depends On |
|---|------|------|------------|
| 9 | Fix G18: Direct container fetch in webhook | 30 min | 8 |
| 10 | Fix G10: Gateway double-spawn guard | 45 min | 8 |
| 11 | Add cron health check (6.1) | 30 min | 8 |
| 12 | Add memory watchdog (6.4) | 15 min | 8 |
| 13 | Register MentraOS Marketplace (G5) | 30 min | 8 |

### Post-Deploy (Week 2)
| # | Task | Est. | Depends On |
|---|------|------|------------|
| 14 | Add upstream sync workflow (6.2) | 15 min | 8 |
| 15 | Configure Dependabot (6.3) | 10 min | 8 |
| 16 | Set up E2E test infrastructure (G7) | 2 hr | 8 |
| 17 | Test MentraOS end-to-end with real glasses | 2 hr | 13 |

---

## 8. Architecture Notes

### Why the Current Architecture Is Sound

```
Glasses → MentraOS Cloud → /mentra/webhook → Worker → sandbox.containerFetch → OpenClaw → Claude
                                                ↓
                                         formatForGlasses()
                                                ↓
Glasses ← MentraOS Cloud ← JSON response ← Worker ← OpenClaw response
```

- The Worker is a thin proxy/orchestrator — it doesn't run AI inference
- The container (OpenClaw) handles all AI interaction, skills, and conversation state
- R2 provides persistence across container restarts
- CF Access provides auth for admin operations
- The MentraOS bridge is correctly implemented as HTTP webhooks (not native SDK) because Workers are V8 isolates

### Cost Estimate (24/7 Running)
- Workers Paid plan: $5/mo
- Container (standard-1, 4GB RAM): ~$30/mo
- R2 storage: ~$0.50/mo (small data)
- Browser Rendering: Free tier (light usage)
- AI API costs: Variable (usage-dependent)
- **Total infrastructure: ~$35-36/mo**

### Self-Maintenance Capabilities (Once Complete)
1. **Auto-restart:** Cron trigger checks gateway health every 5 min
2. **Memory watchdog:** Kills runaway processes before OOM
3. **R2 sync:** Automatic backup every 30s (already implemented)
4. **Upstream sync:** Weekly check for cloudflare/moltworker updates
5. **Dependency updates:** Dependabot PRs with auto-merge for patches
6. **CI/CD:** Push to main triggers typecheck → build → deploy
