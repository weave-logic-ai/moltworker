# WeaveLogic OpenClaw MentraOS Bridge — Claude Code Build Prompt

## CONTEXT & MISSION

You are building a **MentraOS smart glasses augment** on top of a forked
Cloudflare moltworker repo. The goal is to bridge Mentra Live smart glasses
(camera, mic, display) to a self-hosted OpenClaw AI agent running in a
Cloudflare Sandbox container.

**Repository:** `https://github.com/weave-logic-ai/moltworker`
**Owner:** WeaveLogic AI
**Base:** Fork of `cloudflare/moltworker` — do NOT remove or break any
existing functionality.

When complete, a user wearing Mentra Live glasses will be able to:
- Speak → OpenClaw processes via Claude AI → response on glasses HUD
- Take a photo → OpenClaw describes what it sees → response on HUD
- Set reminders by voice → fires as glasses notifications
- Access OpenClaw's full 5,400+ skill ecosystem hands-free
```

Given the length of this document, let me put it in a proper artifact:

Here is the complete Claude Code prompt document:

---

# WeaveLogic OpenClaw MentraOS — Claude Code Prompt

**Copy everything below this line and paste it as your first message in Claude Code.**

---
```
You are building a MentraOS smart glasses augment on top of the WeaveLogic
fork of cloudflare/moltworker at https://github.com/weave-logic-ai/moltworker

MISSION: Bridge Mentra Live glasses (mic, camera, display) to the OpenClaw
AI agent already running in the Cloudflare Sandbox container.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE #1: READ BEFORE WRITING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing any code, read these files:
- src/index.ts
- src/types.ts
- package.json
- wrangler.jsonc

Do not write a single line until you have read them all.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE #2: ADDITIVE CHANGES ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Only these existing files may be modified:
- src/index.ts (add 2 lines: import + route mount)
- src/types.ts (add 2 optional env vars)
- package.json (add @mentraos/sdk dependency)

Do NOT touch: Dockerfile, start-openclaw.sh, wrangler.jsonc,
src/gateway/*, src/auth/*, src/client/*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILES TO CREATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── 1. src/mentra/display-format.ts ─────────────────────────────────────────

Formats OpenClaw text responses for Mentra Live glasses HUD.
Glasses display: ~40 chars wide, ~6 lines, 220 char safe limit.

export function formatForGlasses(text: string): string {
  let clean = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (clean.length > 220) clean = clean.substring(0, 217) + '...';
  return clean;
}

── 2. src/mentra/glass-bridge.ts ───────────────────────────────────────────

Routes I/O between MentraOS glasses and the OpenClaw gateway.
The gateway runs inside the Cloudflare Sandbox on the same Worker.
Uses /api/chat endpoint with Bearer token auth.
Supports optional base64 imageData for vision queries.
30 second timeout via AbortSignal.

── 3. src/mentra/augment.ts ────────────────────────────────────────────────

MentraOS AppServer class named OpenClawAugment.
package name: com.weavelogic.openclaw
Constructor takes: { gatewayUrl, gatewayToken, apiKey, port }

onSession handler must:
1. Show 'WeaveLogic AI\nReady' on connect
2. onTranscription: skip if !isFinal, show 'Thinking...', call
   queryOpenClaw, show formatForGlasses(response)
3. onPhoto: show 'Analyzing...', call queryOpenClaw with imageData,
   message: 'What do you see? Be concise.', show formatted response
4. onButtonPress: show 'Listening...'
All handlers catch errors and show user-friendly message on glasses.

── 4. src/mentra/index.ts ──────────────────────────────────────────────────

Barrel export of all mentra/* modules.

── 5. src/routes/mentra.ts ─────────────────────────────────────────────────

Hono routes mounted at /mentra/*
GET  /mentra/health  → { status:'ok', service:'WeaveLogic...', version, timestamp }
GET  /mentra/status  → { bridge, mentraConfigured, openClawConfigured, version }
POST /mentra/webhook → receive MentraOS events, forward transcriptions to
                       /api/chat, return { success, response }

── 6. skills/mentra-vision/SKILL.md ────────────────────────────────────────

Documents the mentra-vision OpenClaw skill.
Explains: captures photo from glasses, use cases (what am I looking at,
read this text, identify object), usage command, requirements.

── 7. skills/mentra-vision/scripts/capture.js ──────────────────────────────

Node.js script that POSTs to ${MENTRA_BRIDGE_URL}/mentra/capture
with { sessionId }, receives { imageData, mimeType }, saves to
/tmp/glasses-{timestamp}.jpg, console.logs the file path (OpenClaw
reads stdout), exits 0 on success, 1 on error.
Has 10s timeout via AbortController.

── 8. .github/workflows/deploy.yml ─────────────────────────────────────────

GitHub Actions workflow:
- Trigger: push to main, PRs to main
- Jobs:
  typecheck: npm ci → npx tsc --noEmit
  deploy: (main only, needs typecheck) npm ci → npm run build →
          cloudflare/wrangler-action@v3 deploy
          uses: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID secrets
  preview: (PRs only, needs typecheck) wrangler versions upload

── 9. WEAVELOGIC.md ────────────────────────────────────────────────────────

Documents WeaveLogic additions, new file list, architecture diagram,
new required secrets (MENTRA_API_KEY, WORKER_URL), Mentra Marketplace
registration steps, how to sync with upstream moltworker.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFICATIONS TO EXISTING FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/index.ts:
  ADD import: import { mentraRoutes } from './routes/mentra';
  ADD route mount: app.route('/mentra', mentraRoutes);
  Place after existing route mounts, before export default.

src/types.ts (or wherever Env interface is defined):
  ADD optional: MENTRA_API_KEY?: string;
  ADD optional: WORKER_URL?: string;

package.json:
  ADD to dependencies: "@mentraos/sdk": "^2.0.0"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Read existing files (src/index.ts, src/types.ts, package.json, wrangler.jsonc)
2. Update package.json, run npm install
3. Create display-format.ts (no deps)
4. Create glass-bridge.ts (no deps)
5. Create augment.ts (imports display-format, glass-bridge)
6. Create mentra/index.ts (barrel)
7. Create routes/mentra.ts (imports hono, types)
8. Update src/index.ts (add import + route mount)
9. Update src/types.ts (add env vars)
10. Create skills/mentra-vision/SKILL.md
11. Create skills/mentra-vision/scripts/capture.js
12. Create .github/workflows/deploy.yml (check if exists first)
13. Create WEAVELOGIC.md
14. Run: npx tsc --noEmit (fix all errors)
15. Run: npm run build (must succeed)
16. Commit with message: "feat: add WeaveLogic MentraOS bridge layer"
17. Push to main

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Worker runs in V8 isolate with nodejs_compat — no Node-only APIs in
  Worker files. Container scripts (skills/) can use full Node.js.
- TypeScript strict — match existing tsconfig settings
- No new npm deps beyond @mentraos/sdk
- npm run build MUST succeed before committing
- If @mentraos/sdk types are incomplete, use type assertions not ts-ignore

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRETS NEEDED AFTER DEPLOY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Remind user to set via wrangler secret put:
  ANTHROPIC_API_KEY, MOLTBOT_GATEWAY_TOKEN, CF_ACCESS_TEAM_DOMAIN,
  CF_ACCESS_AUD, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID,
  MENTRA_API_KEY, WORKER_URL

GitHub Actions secrets needed:
  CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFY AFTER DEPLOY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
curl https://your-worker.workers.dev/mentra/health
curl https://your-worker.workers.dev/mentra/status