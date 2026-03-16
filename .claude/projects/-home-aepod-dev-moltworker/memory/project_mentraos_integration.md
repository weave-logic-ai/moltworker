---
name: MentraOS Integration Architecture
description: Real @mentra/sdk is incompatible with CF Workers; custom HTTP bridge is correct approach. Real portal is console.mentra.glass, not developer.mentra.com.
type: project
---

The real MentraOS SDK is `@mentra/sdk` v2.1.29 (NOT `@mentraos/sdk` which doesn't exist).
The real SDK requires express, ws, and persistent WebSocket connections — incompatible with Cloudflare Workers.
The custom HTTP webhook bridge in `src/mentra/` is the architecturally correct approach.

**Why:** Workers are V8 isolates with request-response lifecycle — no long-lived TCP/WebSocket connections possible.

**How to apply:** Never try to install `@mentra/sdk` in the Worker. The `/mentra/webhook` endpoint receives events from MentraOS Cloud via HTTP POST. Monitor `@mentra/sdk@3.0.0-hono` experimental branch for future Worker-native compatibility.

**Correct URLs:**
- Developer console: `console.mentra.glass` (NOT `developer.mentra.com`)
- App store: `apps.mentra.glass`
- SDK docs: `cloud-docs.mentra.glass/sdk/getting-started`
- GitHub: `github.com/Mentra-Community/MentraOS`

**Real SDK event names differ from our code:**
- Our `onPhoto` = SDK `onPhotoTaken`
- Our `sendText` = SDK `showTextWall`
