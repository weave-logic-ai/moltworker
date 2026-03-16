---
name: mentra-planner
description: Planning skill for designing MentraOS features and integration architecture
model: opus
---

# MentraOS Planning Skill

## Before You Plan

**Always search the docs vector index for API capabilities before planning features.** Use InfraNodus MCP tools or memory search to query `docs/mentraOS/` for available APIs, constraints, and integration patterns. If docs are not yet indexed, read the files in `/home/aepod/dev/moltworker/docs/mentraOS/` directly.

```bash
npx @claude-flow/cli@latest memory search --query "mentra camera API capabilities" --namespace mentraOS
```

Or use InfraNodus:

```
mcp__infranodus__retrieve_from_knowledge_base { query: "mentra session events available" }
```

## System Architecture

```
+---------------------+
|  Mentra Live        |
|  Smart Glasses      |
|  (mic, camera, HUD) |
+----------+----------+
           |
           v  WebSocket (wss://uscentralapi.mentra.glass/app-ws)
+----------+----------+
|  MentraOS Cloud     |
|  (event routing)    |
+----------+----------+
           |
           v  WebSocket → HTTP bridge
+----------+----------+
|  Cloudflare         |
|  Container          |
|                     |
|  +---------------+  |
|  | mentra-bridge  |  |  Port 7010 (AppServer)
|  | (Node.js)     |  |
|  +-------+-------+  |
|          |           |
|          v  HTTP /v1/chat/completions
|  +-------+-------+  |
|  | OpenClaw       |  |  Port 18789 (AI Gateway)
|  | Gateway        |  |
|  +---------------+  |
+---------++-----------+
          ||
          vv  API calls
+----------+----------+
|  OpenRouter /       |
|  AI Provider        |
+----------+----------+
           |
           v  Response
+----------+----------+
|  Glasses HUD        |
|  (400x240 display)  |
+---------------------+
```

### Data Flow

1. Glasses capture input (voice, photo, button press, sensors)
2. MentraOS Cloud routes events over WebSocket to the registered AppServer
3. The `mentra-bridge` AppServer (port 7010) receives the event inside the Cloudflare Container
4. Bridge formats a request and sends it to OpenClaw gateway on `localhost:18789`
5. OpenClaw routes the query through the configured AI provider (OpenRouter, etc.)
6. AI response is formatted for the glasses HUD (220 char limit) and sent back
7. Glasses display the formatted text via layout methods

### Worker vs Container

- The **Cloudflare Worker** handles HTTP routing (`src/routes/mentra.ts`), proxies requests to the container, and provides health/status endpoints
- The **Cloudflare Container** runs the actual `mentra-bridge` Node.js process and the OpenClaw gateway as long-lived processes
- The Worker cannot maintain WebSocket connections (V8 isolate constraint), so the bridge inside the container handles the persistent MentraOS Cloud WebSocket

## Constraints Reference

### Display Constraints

| Constraint | Value |
|-----------|-------|
| Resolution | 400x240 pixels |
| Characters per line | ~40 |
| Visible lines | ~6 |
| Safe character limit | **220 characters** |
| Truncation | Append `...` beyond 220 chars |

When planning any feature that displays text, always account for the 220-character ceiling. Multi-step information must be paginated or summarized aggressively.

### Timing Constraints

| Constraint | Value |
|-----------|-------|
| Photo request timeout | 30 seconds |
| API call timeout | 30 seconds |
| Container cold start | ~90 seconds |
| Gateway startup wait | Up to 5 minutes (60 retries x 5s) |

### Rate Limits

| Constraint | Value |
|-----------|-------|
| API requests | 100 req/min |
| WebSocket messages | 50 msg/s |

### WebSocket-Only Event Delivery

MentraOS delivers all glasses events (transcription, photos, buttons, battery, notifications, head position) over WebSocket exclusively. There is no HTTP polling mechanism. Features that need to react to glasses input must use event handlers registered in `onSession()`.

## Container Lifecycle

- **keepAlive**: `true` -- the container stays running between requests
- **Cold start**: ~90 seconds for initial container boot
- **Persistence**: R2 object storage (`moltbot-data` bucket) stores configuration at `openclaw/openclaw.json`
- **Process startup order**: OpenClaw gateway starts first, then `mentra-bridge` waits for gateway readiness before starting the AppServer
- **Health monitoring**: Worker proxies `/mentra/health` to the bridge, and falls back to direct gateway chat if the bridge is unavailable

## Model Routing

- **Provider**: `gw-openrouter` (OpenRouter via AI Gateway)
- **API format**: OpenAI-compatible `/v1/chat/completions`
- **Model IDs**: Must include provider prefix (e.g., `google/gemini-2.0-flash-001`)
- **Vision models**: Set via `MENTRA_VISION_MODEL` env var for photo analysis queries
- **Max tokens**: Default 256 for glasses responses (keep responses short for HUD)

### Model Selection Considerations

- Use fast, cheap models for real-time transcription responses (latency matters)
- Use vision-capable models for photo analysis
- Consider response length -- the HUD can only show 220 chars, so generating long responses wastes tokens
- Set `max_tokens: 256` or lower to avoid unnecessary generation

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Admin access | Cloudflare Access (CF-Access-* headers) |
| Webhook auth | `MENTRA_API_KEY` as Bearer token or x-api-key header |
| Gateway auth | `MOLTBOT_GATEWAY_TOKEN` as Bearer token to OpenClaw |
| Container isolation | Cloudflare Container sandbox |
| Secrets management | Wrangler secrets (never hardcoded) |

### Authentication Flow for Webhook

```
External Request → /mentra/webhook
  → Worker checks Authorization: Bearer <MENTRA_API_KEY>
  → Worker proxies to container bridge on port 7010
  → Bridge proxies to OpenClaw with Authorization: Bearer <MOLTBOT_GATEWAY_TOKEN>
```

## Deployment

### Pipeline

```
Developer → git push → GitHub Actions → wrangler deploy → Cloudflare Workers + Containers
```

### Secrets Management

```bash
# Bulk set secrets
wrangler secret bulk < secrets.json

# Individual secret
wrangler secret put MENTRA_API_KEY
```

### Key Deployment Files

- `wrangler.toml` / `wrangler.jsonc` -- Worker and container configuration
- `.github/workflows/` -- CI/CD pipeline
- `skills/mentra-bridge/app_config.json` -- MentraOS app manifest

## Known Issues and Pitfalls

### DO Deletion Breaks Migrations
Deleting a Durable Object class and recreating it causes migration failures. Avoid removing DO classes from wrangler config once deployed. Instead, deprecate and create new classes.

### AI_GATEWAY_MODEL Environment Variable
Setting `AI_GATEWAY_MODEL` creates a broken provider configuration where the model ID gets double-prefixed. Use the standard model configuration via OpenClaw's config file instead.

### TTS Config Schema Strictness
The TTS (text-to-speech) configuration schema is strict. Invalid or missing fields cause silent failures. Always validate TTS config objects against the expected schema before deploying.

### Container Cold Start
The ~90 second cold start means the first request after idle will be slow. Plan for this in user-facing features -- show a "Starting up..." message on the HUD if the bridge is not yet ready.

### WebSocket Reconnection
The bridge handles `onReconnected` events, but there can be a gap where events are lost. Design features to be resilient to missed events. Do not assume continuous event delivery.

## Planning Checklist

Before designing any new MentraOS feature, verify each item:

- [ ] **Display limits**: Will the output fit in 220 characters? If not, how will it be paginated or summarized?
- [ ] **Event handler availability**: Does the required input event exist? (Check the event handler table in the development skill)
- [ ] **API rate limits**: Will the feature stay under 100 req/min and 50 msg/s?
- [ ] **Offline/disconnect handling**: What happens when the WebSocket drops? How does the feature recover?
- [ ] **Cold start behavior**: What does the user see during the ~90s container startup?
- [ ] **Photo timeout**: If using camera, is the 30-second timeout acceptable for the use case?
- [ ] **Model selection**: Is the chosen model fast enough for real-time use? Does it support vision if needed?
- [ ] **Token efficiency**: Are responses kept short enough for the HUD? Is `max_tokens` set appropriately?
- [ ] **Security**: Are API keys passed via environment variables, never hardcoded?
- [ ] **Error UX**: What does the user see on the HUD when something fails?
- [ ] **Battery impact**: Does the feature poll frequently or use camera/mic continuously? Consider battery drain.
- [ ] **Search docs**: Have you searched `docs/mentraOS/` for relevant API capabilities and constraints?

## Feature Design Template

When planning a new feature, structure your design as follows:

```markdown
## Feature: [Name]

### User Story
As a glasses wearer, I want to [action] so that [benefit].

### Input Event
Which glasses event triggers this feature (transcription, button, photo, etc.).

### Processing
What happens between input and output (AI query, data lookup, computation).

### Display Output
Exact text shown on HUD. Must be under 220 chars.
Show mockup of what appears on the ~40x6 character grid.

### Error States
What the user sees when things go wrong.

### Constraints Verification
- Display: [fits/paginated]
- Latency: [acceptable/needs optimization]
- Rate limits: [within bounds]
- Offline: [graceful degradation plan]
```
