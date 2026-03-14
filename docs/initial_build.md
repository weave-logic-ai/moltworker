# Moltworker: Technical Implementation

## Overview

Moltworker (`moltbot-sandbox`) is a Cloudflare Worker that runs a personal AI assistant (OpenClaw) inside a Cloudflare Sandbox container. The Worker acts as a reverse proxy and orchestration layer: it handles authentication, manages the container lifecycle, proxies HTTP/WebSocket traffic to the AI gateway, and provides integration bridges for external devices (MentraOS smart glasses, CDP browser automation).

**Repository:** `weave-logic-ai/moltworker`
**License:** Apache-2.0

---

## Architecture

```
                         +--------------------------+
                         |   Cloudflare Edge        |
                         |                          |
  User / Glasses / CDP   |   +------------------+   |
  ---------------------->|   | Hono Worker       |   |
                         |   | (src/index.ts)    |   |
                         |   +--------+---------+   |
                         |            |              |
                         |   +--------v---------+   |
                         |   | Cloudflare Sandbox|   |   +-------------+
                         |   | (Durable Object)  |   |   | R2 Bucket   |
                         |   |                   |<----->| moltbot-data|
                         |   |  OpenClaw Gateway  |   |   +-------------+
                         |   |  port 18789        |   |
                         |   +-------------------+   |
                         +--------------------------+
```

### Key components:

1. **Hono Worker** (TypeScript) -- Entry point, routing, auth, proxy
2. **Cloudflare Sandbox** -- Docker container running OpenClaw v2026.2.3
3. **R2 Bucket** -- Persistent storage for config, workspace, and skills
4. **Cloudflare Access** -- JWT-based authentication for admin routes
5. **Browser Rendering** -- Headless Chrome via CDP shim

---

## Project Structure

```
moltworker/
  src/
    index.ts              # Main Worker entry point (Hono app)
    types.ts              # MoltbotEnv interface, AppEnv, JWT types
    config.ts             # Constants (port 18789, timeouts, R2 bucket name)
    auth/
      middleware.ts       # Cloudflare Access JWT verification
      jwt.ts              # JWT decoding/validation via jose
    gateway/
      process.ts          # Container process lifecycle (find, start, wait)
      env.ts              # Builds env vars to pass into container
      env.test.ts         # Unit tests for env building
      r2.ts               # Rclone configuration for R2 persistence
      sync.ts             # Manual R2 sync (config, workspace, skills)
      sync.test.ts        # Sync tests
    mentra/
      augment.ts          # OpenClawAugment MentraOS AppServer class
      glass-bridge.ts     # HTTP bridge: Worker -> OpenClaw /api/chat
      display-format.ts   # Formats AI responses for glasses HUD (~220 chars)
      index.ts            # Re-exports
    routes/
      index.ts            # Route re-exports
      public.ts           # Unauthenticated routes (health, status, logos)
      api.ts              # Admin API (devices, storage, gateway restart)
      admin-ui.ts         # React admin UI (device management dashboard)
      debug.ts            # Debug routes (env, logs, config inspection)
      mentra.ts           # MentraOS webhook + status endpoints
      cdp.ts              # CDP WebSocket shim (Browser Rendering)
    assets/
      loading.html        # Loading page shown during container cold start
      config-error.html   # Error page for missing env vars
    utils/
      logging.ts          # Sensitive param redaction

  skills/
    cloudflare-browser/   # Browser automation skill (screenshots, video)
    mentra-vision/        # Smart glasses camera capture + vision analysis

  start-openclaw.sh       # Container startup script (R2 restore, onboard, patch, sync, gateway)
  Dockerfile              # Container image (sandbox:0.7.0, Node 22, OpenClaw, rclone)
  wrangler.jsonc          # Worker config (container, DO, R2, Browser bindings)
  package.json            # Dependencies (hono, jose, react, puppeteer)

  .github/workflows/
    deploy.yml            # Typecheck -> Deploy to Cloudflare (push to main)
    test.yml              # Lint, format, typecheck, unit tests, E2E matrix

  test/e2e/               # E2E tests via cctr/plwr (Terraform + Playwright)
```

---

## What Has Been Built

### 1. Worker Layer (TypeScript/Hono)

**Entry point** (`src/index.ts`): A Hono app that handles all inbound traffic.

- **Request logging middleware** -- Logs every request with redacted sensitive params
- **Sandbox initialization** -- Gets or creates a Durable Object-backed sandbox instance
- **Environment validation** -- Returns 503 with helpful HTML/JSON if required secrets are missing
- **Cloudflare Access middleware** -- Validates JWTs for protected routes
- **WebSocket proxying** -- Full duplex relay with error message transformation (converts internal gateway errors like "gateway token mismatch" into user-friendly messages with helpful URLs)
- **Loading page** -- When the container is cold-starting, browser requests get a loading page while the gateway boots in the background (up to 3 minute startup timeout)

**Route structure:**

| Path | Auth | Handler | Purpose |
|------|------|---------|---------|
| `/sandbox-health` | None | public.ts | Health check |
| `/api/status` | None | public.ts | Worker status |
| `/logo.png`, `/logo-small.png` | None | public.ts | Static assets |
| `/mentra/health` | None | mentra.ts | Bridge health check |
| `/mentra/status` | None | mentra.ts | Bridge config status |
| `/mentra/webhook` | None | mentra.ts | Glasses event receiver |
| `/cdp` | CDP_SECRET query param | cdp.ts | Chrome DevTools WebSocket |
| `/api/admin/devices` | CF Access | api.ts | List paired/pending devices |
| `/api/admin/devices/:id/approve` | CF Access | api.ts | Approve device |
| `/api/admin/devices/approve-all` | CF Access | api.ts | Approve all pending |
| `/api/admin/storage` | CF Access | api.ts | R2 storage status |
| `/api/admin/storage/sync` | CF Access | api.ts | Trigger manual R2 sync |
| `/api/admin/gateway/restart` | CF Access | api.ts | Kill + restart gateway |
| `/_admin/*` | CF Access | admin-ui.ts | React admin dashboard |
| `/debug/*` | CF Access + DEBUG_ROUTES | debug.ts | Debug inspection |
| `/*` (catch-all) | CF Access | index.ts | Proxy to OpenClaw gateway |

### 2. Container Layer (Docker/Bash)

**Dockerfile** -- Based on `cloudflare/sandbox:0.7.0`:
- Installs Node.js 22.13.1 (replaces base image Node 20)
- Installs pnpm, rclone, OpenClaw v2026.2.3
- Copies `start-openclaw.sh` and custom skills
- Exposes port 18789

**Startup script** (`start-openclaw.sh`) -- Five-phase boot:

1. **R2 Restore** -- If R2 is configured, restores config, workspace, and skills from backup via rclone. Handles legacy `clawdbot.json` -> `openclaw.json` migration.

2. **Onboard** -- If no config exists, runs `openclaw onboard --non-interactive` with detected AI provider credentials (Cloudflare AI Gateway > Anthropic > OpenAI priority).

3. **Config Patch** -- Node.js inline script patches `openclaw.json`:
   - Sets gateway port, auth token, trusted proxies
   - Configures chat channels (Telegram, Discord, Slack)
   - Handles Cloudflare AI Gateway model overrides (`CF_AI_GATEWAY_MODEL`)
   - Handles legacy/OpenRouter model overrides (`AI_GATEWAY_MODEL`)
   - Dev mode settings

4. **Background Sync** -- Every 30 seconds, checks for changed files and uploads to R2 via rclone. Syncs config, workspace (excluding node_modules/.git), and skills.

5. **Gateway Start** -- Launches `openclaw gateway` on port 18789 with token auth (or device pairing if no token).

### 3. AI Provider Configuration

Supports four provider paths (in priority order):

| Provider | Env Vars | Notes |
|----------|----------|-------|
| Cloudflare AI Gateway | `CLOUDFLARE_AI_GATEWAY_API_KEY` + `CF_AI_GATEWAY_ACCOUNT_ID` + `CF_AI_GATEWAY_GATEWAY_ID` | Native integration, supports `CF_AI_GATEWAY_MODEL` override |
| OpenRouter / Legacy Gateway | `AI_GATEWAY_API_KEY` + `AI_GATEWAY_BASE_URL` | Any OpenAI-compatible endpoint, supports `AI_GATEWAY_MODEL` override |
| Direct Anthropic | `ANTHROPIC_API_KEY` | Optional `ANTHROPIC_BASE_URL` |
| Direct OpenAI | `OPENAI_API_KEY` | |

**Model override format:** `provider/model-id` (e.g., `anthropic/claude-sonnet-4-5`, `google/gemini-2.5-pro-preview`). The startup script creates a custom provider entry in `openclaw.json` and sets it as the default model.

The `buildEnvVars()` function (`src/gateway/env.ts`) maps Worker secrets to container environment variables. The legacy gateway path routes through `ANTHROPIC_BASE_URL` for SDK compatibility.

### 4. MentraOS Smart Glasses Bridge

A bridge layer connecting Mentra Live smart glasses to the OpenClaw AI agent.

**Components:**

- **`/mentra/webhook`** (POST) -- Receives events from MentraOS (transcriptions, photos). Forwards to OpenClaw's `/api/chat` endpoint and returns the response formatted for the glasses HUD.

- **`OpenClawAugment`** class (`src/mentra/augment.ts`) -- MentraOS AppServer interface (`com.weavelogic.openclaw`). Handles:
  - `onConnect` -- Shows "WeaveLogic AI\nReady"
  - `onTranscription` -- Sends voice input to OpenClaw, displays response
  - `onPhoto` -- Sends camera capture for vision analysis
  - `onButtonPress` -- Activates listening mode

- **`formatForGlasses()`** -- Strips markdown, truncates to 220 chars (~40 chars x 6 lines) for the glasses HUD.

- **`queryOpenClaw()`** -- HTTP client that POSTs to the gateway's `/api/chat` with Bearer token auth and 30s timeout. Supports optional base64 `imageData` for vision queries.

- **`mentra-vision` skill** -- OpenClaw skill that captures a photo from connected glasses and runs vision analysis.

### 5. CDP Browser Automation Shim

A WebSocket endpoint (`/cdp`) that implements a subset of the Chrome DevTools Protocol, translating CDP commands to Cloudflare Browser Rendering (Puppeteer) calls.

**Authentication:** Shared secret via `?secret=<CDP_SECRET>` query parameter (not CF Access).

**Supported CDP domains:**
- Browser: getVersion, close
- Target: createTarget, closeTarget, getTargets
- Page: navigate, reload, captureScreenshot, getLayoutMetrics
- Runtime: evaluate
- DOM: getDocument, querySelector, querySelectorAll, getOuterHTML
- Input: dispatchMouseEvent, dispatchKeyEvent, insertText
- Network: enable, disable, setCacheDisabled
- Emulation: setDeviceMetricsOverride, setUserAgentOverride

**Skills:**
- `cloudflare-browser` -- Screenshot capture, multi-page video recording, page navigation
- Uses the CDP shim via WebSocket from inside the container

### 6. R2 Persistence

Data persists across container restarts via R2 (S3-compatible) storage using rclone.

**What's persisted:**
- `/root/.openclaw/` -> `r2:moltbot-data/openclaw/` (config, paired devices)
- `/root/clawd/` -> `r2:moltbot-data/workspace/` (workspace, conversations)
- `/root/clawd/skills/` -> `r2:moltbot-data/skills/` (custom skills)

**Sync mechanisms:**
1. **Restore on boot** -- `start-openclaw.sh` restores from R2 before onboarding
2. **Background sync** -- Every 30s, detects changed files and uploads
3. **Manual sync** -- `POST /api/admin/storage/sync` triggers immediate sync

**rclone setup:** Configured both in the startup script (for boot restore) and from the Worker via `ensureRcloneConfig()` (for API-triggered syncs). Uses S3 protocol against `https://{account_id}.r2.cloudflarestorage.com`.

### 7. Authentication

**Cloudflare Access** (production):
- Protects admin UI, API routes, and the catch-all proxy
- JWT validation via JWKS endpoint (`CF_ACCESS_TEAM_DOMAIN`)
- Audience tag verification (`CF_ACCESS_AUD`)
- Skipped in `DEV_MODE` and `E2E_TEST_MODE`

**Gateway token:**
- `MOLTBOT_GATEWAY_TOKEN` -> `OPENCLAW_GATEWAY_TOKEN` in container
- Injected into WebSocket connections server-side (CF Access redirects strip query params)

### 8. Admin UI

React SPA served at `/_admin/`:
- Device management (list pending, approve, approve-all)
- Storage status and manual sync trigger
- Gateway restart
- Protected by Cloudflare Access
- Built by Vite, served via Cloudflare Assets binding

---

## CI/CD

### test.yml (on push to main / PRs)
1. **Unit job:** lint (oxlint) -> format check (oxfmt) -> typecheck (tsc) -> vitest
2. **E2E matrix** (4 configs: base, telegram, discord, workers-ai):
   - Deploys a temporary Worker via Terraform
   - Runs browser tests via cctr/plwr/Playwright
   - Records video, uploads to `e2e-artifacts-*` branch
   - Comments on PR with video thumbnail
   - Requires `E2E_*` prefixed secrets for dedicated test infrastructure

### deploy.yml (on push to main)
1. **Typecheck** job
2. **Deploy** job: `npm run build` -> `wrangler deploy` with secrets
3. **Preview** job (PRs only): `wrangler versions upload`

---

## Environment Variables

### Required (production)

| Variable | Purpose |
|----------|---------|
| `MOLTBOT_GATEWAY_TOKEN` | Gateway access token |
| `CF_ACCESS_TEAM_DOMAIN` | Cloudflare Access team domain |
| `CF_ACCESS_AUD` | Cloudflare Access audience tag |
| AI provider (one of below) | |

### AI Provider (at least one)

| Variable | Purpose |
|----------|---------|
| `AI_GATEWAY_API_KEY` | OpenRouter / gateway API key |
| `AI_GATEWAY_BASE_URL` | e.g., `https://openrouter.ai/api/v1` |
| `AI_GATEWAY_MODEL` | e.g., `anthropic/claude-sonnet-4-5` |
| `ANTHROPIC_API_KEY` | Direct Anthropic key |
| `OPENAI_API_KEY` | Direct OpenAI key |
| `CLOUDFLARE_AI_GATEWAY_API_KEY` | CF AI Gateway key |
| `CF_AI_GATEWAY_ACCOUNT_ID` | CF account ID |
| `CF_AI_GATEWAY_GATEWAY_ID` | Gateway ID |
| `CF_AI_GATEWAY_MODEL` | e.g., `workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast` |

### R2 Persistence

| Variable | Purpose |
|----------|---------|
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `CF_ACCOUNT_ID` | Cloudflare account ID (for R2 endpoint) |
| `R2_BUCKET_NAME` | Override bucket name (default: `moltbot-data`) |

### Chat Channels (optional)

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_DM_POLICY` | `pairing` (default) or `open` |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `DISCORD_DM_POLICY` | `pairing` (default) or `open` |
| `SLACK_BOT_TOKEN` | Slack bot token |
| `SLACK_APP_TOKEN` | Slack app token |

### Browser / CDP (optional)

| Variable | Purpose |
|----------|---------|
| `CDP_SECRET` | Shared secret for `/cdp` endpoint |
| `WORKER_URL` | Public URL of the worker |

### MentraOS (optional)

| Variable | Purpose |
|----------|---------|
| `MENTRA_API_KEY` | MentraOS integration API key |

### Operational

| Variable | Purpose |
|----------|---------|
| `DEV_MODE` | `true` to skip CF Access + device pairing |
| `E2E_TEST_MODE` | `true` to skip CF Access only |
| `DEBUG_ROUTES` | `true` to enable `/debug/*` |
| `SANDBOX_SLEEP_AFTER` | Container idle timeout (`never`, `10m`, `1h`) |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `hono` | HTTP framework for Cloudflare Workers |
| `jose` | JWT validation (Cloudflare Access tokens) |
| `@cloudflare/sandbox` | Sandbox container management |
| `@cloudflare/puppeteer` | Browser Rendering CDP interface |
| `react` / `react-dom` | Admin UI |
| `vite` / `@cloudflare/vite-plugin` | Build toolchain |
| `vitest` | Unit testing |
| `oxlint` / `oxfmt` | Linting and formatting |
| `wrangler` | Cloudflare Workers CLI |

---

## Current Status

### What's working:
- Worker deploys to Cloudflare via GitHub Actions
- Container boots, onboards OpenClaw, patches config
- AI provider configuration (Anthropic, OpenAI, CF AI Gateway, OpenRouter)
- R2 persistence (restore on boot, background sync, manual sync)
- WebSocket proxying with error transformation
- Admin UI with device management
- CDP browser automation shim
- MentraOS glasses bridge (webhook, vision skill)
- Unit tests passing (83 tests)

### What needs attention:
- **E2E tests blocking deploy** -- The `test.yml` workflow requires `E2E_*` prefixed secrets for dedicated test infrastructure (separate from deploy secrets). These need to be added to GitHub Actions secrets, or E2E needs to be made non-blocking.
- **Deploy workflow missing OpenRouter secrets** -- `deploy.yml` only passes `ANTHROPIC_API_KEY`. Needs `AI_GATEWAY_API_KEY`, `AI_GATEWAY_BASE_URL`, and `AI_GATEWAY_MODEL` added to the secrets list.
- **WORKER_URL** -- Not yet set (depends on first successful deploy to know the URL).
