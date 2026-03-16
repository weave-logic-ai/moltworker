---
name: mentra-tester
description: Testing skill for validating MentraOS smart glasses integration
model: opus
---

# MentraOS Testing Skill

## Before You Test

**Use vector search on `docs/mentraOS/` to verify expected behavior before writing tests.** Confirm API contracts, event schemas, and response formats against the documentation.

```bash
npx @claude-flow/cli@latest memory search --query "mentra webhook response format" --namespace mentraOS
```

Or use InfraNodus:

```
mcp__infranodus__retrieve_from_knowledge_base { query: "mentra event handler onTranscription schema" }
```

Reference docs directory: `/home/aepod/dev/moltworker/docs/mentraOS/`

## Test Endpoints

### Health Check

```bash
curl https://<worker-domain>/mentra/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "WeaveLogic MentraOS Bridge",
  "version": "1.0.0",
  "timestamp": "2026-03-15T00:00:00.000Z"
}
```

### Status Check

```bash
curl https://<worker-domain>/mentra/status
```

Expected response:

```json
{
  "bridge": "active",
  "mentraConfigured": true,
  "openClawConfigured": true,
  "version": "1.0.0"
}
```

Verify both `mentraConfigured` and `openClawConfigured` are `true`. If either is `false`, the corresponding secret (`MENTRA_API_KEY` or `MOLTBOT_GATEWAY_TOKEN`) is missing.

### Webhook Test

```bash
curl -X POST https://<worker-domain>/mentra/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MENTRA_API_KEY>" \
  -d '{"type": "transcription", "text": "Hello, what time is it?"}'
```

Expected response:

```json
{
  "success": true,
  "response": "<formatted AI response, max 220 chars>"
}
```

Error responses to check for:

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{"error": "Unauthorized"}` | Invalid or missing API key |
| 400 | `{"error": "Invalid JSON body"}` | Malformed request body |
| 502 | `{"error": "Failed to process request", "details": "..."}` | Gateway unreachable or error |
| 503 | `{"error": "Gateway token not configured"}` | Missing `MOLTBOT_GATEWAY_TOKEN` |

### Webview Test

```bash
curl https://<worker-domain>/mentra/webview
```

Should return HTML containing the WeaveLogic AI companion page. Verify it contains `<title>WeaveLogic AI</title>`.

## Container Debugging

### Check Bridge Logs

```bash
curl https://<worker-domain>/debug/cli?cmd=cat%20/tmp/mentra-bridge.log
```

Look for:
- `[mentra-bridge] AppServer running on port 7010` -- bridge started successfully
- `[mentra-bridge] OpenClaw gateway is ready` -- gateway connectivity confirmed
- `[mentra-bridge] Session started:` -- glasses connected and session active
- `[mentra-bridge] Transcription:` -- voice input being received
- Any `Error` or `failed` lines indicating problems

### Check Container Processes

```bash
curl https://<worker-domain>/debug/processes?logs=true
```

Verify these processes are running:
1. The mentra-bridge Node.js process on port 7010
2. The OpenClaw gateway process on port 18789

### Check Node.js Module Resolution

```bash
curl "https://<worker-domain>/debug/cli?cmd=ls%20/app/node_modules/@mentra/sdk"
```

If `NODE_PATH` is not set correctly, `require('@mentra/sdk')` will fail. The bridge logs will show a module-not-found error.

## R2 Configuration Verification

Check that the OpenClaw config is properly stored in R2:

```bash
wrangler r2 object get moltbot-data/openclaw/openclaw.json --remote
```

Verify the JSON contains:
- Valid provider configuration (no double-prefixed model IDs)
- Correct gateway token
- Proper TTS config schema (if TTS is enabled)

## Worker Log Tailing

For real-time debugging of the Worker (not the container):

```bash
wrangler tail --format pretty
```

Filter for Mentra-specific logs:

```bash
wrangler tail --format pretty | grep -i mentra
```

## Pre-Deployment Test Checklist

Run through this checklist before deploying changes:

- [ ] **Bridge process**: Verify mentra-bridge is listening on port 7010
  ```bash
  curl <worker>/debug/cli?cmd=netstat%20-tlnp%20|%20grep%207010
  ```

- [ ] **Gateway process**: Verify OpenClaw gateway is listening on port 18789
  ```bash
  curl <worker>/debug/cli?cmd=netstat%20-tlnp%20|%20grep%2018789
  ```

- [ ] **WebSocket target**: Bridge connects to `wss://uscentralapi.mentra.glass/app-ws`
  Check bridge logs for WebSocket connection confirmation.

- [ ] **API key valid**: `/mentra/webhook` returns 200 with correct Bearer token, 401 without

- [ ] **Package name matches**: `app_config.json` has `"packageName": "mentra-claw"` and bridge constructor uses the same value

- [ ] **Display formatting**: Responses are under 220 characters and strip markdown

- [ ] **Health endpoint**: `/mentra/health` returns `{"status": "ok"}`

- [ ] **Status endpoint**: `/mentra/status` shows both `mentraConfigured` and `openClawConfigured` as `true`

- [ ] **Build passes**: `npm run build` completes without errors

- [ ] **Tests pass**: `npm test` completes without failures

- [ ] **Lint passes**: `npm run lint` completes without errors

## Common Failures and Fixes

### Invalid API Key

**Symptom**: `/mentra/webhook` returns 401 Unauthorized.

**Diagnosis**:
```bash
# Check if secret is set
wrangler secret list | grep MENTRA
```

**Fix**: Set the correct API key:
```bash
wrangler secret put MENTRA_API_KEY
```

### Container Not Listening on Port 7010

**Symptom**: `/mentra/webhook` returns 502 with "MentraOS bridge not available".

**Diagnosis**:
```bash
curl "<worker>/debug/processes?logs=true"
curl "<worker>/debug/cli?cmd=cat%20/tmp/mentra-bridge.log"
```

**Common causes**:
- `@mentra/sdk` module not found (NODE_PATH issue)
- API key not passed to container environment
- Bridge crashed during startup

**Fix**: Check container logs, verify NODE_PATH, ensure `MENTRAOS_API_KEY` is set in the container environment.

### NODE_PATH Not Set

**Symptom**: Bridge log shows `Error: Cannot find module '@mentra/sdk'`.

**Diagnosis**:
```bash
curl "<worker>/debug/cli?cmd=echo%20\$NODE_PATH"
curl "<worker>/debug/cli?cmd=ls%20/app/node_modules/@mentra"
```

**Fix**: Ensure the container startup script sets `NODE_PATH` to include the directory containing `@mentra/sdk`.

### TTS Config Schema Errors

**Symptom**: Text-to-speech silently fails, no audio on glasses.

**Diagnosis**: Check the R2 config for TTS settings:
```bash
wrangler r2 object get moltbot-data/openclaw/openclaw.json --remote | jq '.tts'
```

**Fix**: Ensure all required TTS schema fields are present and valid. The schema is strict -- missing or extra fields cause silent rejection.

### DO Migration Issues

**Symptom**: Worker deployment fails with migration errors.

**Diagnosis**:
```bash
wrangler tail --format pretty
# Look for "migration" or "durable object" errors
```

**Fix**: Do not delete and recreate Durable Object classes. If a migration is stuck, you may need to create a new DO class with a different name rather than modifying the existing one.

### Gateway Double-Prefixed Model ID

**Symptom**: AI queries return errors about unknown model.

**Diagnosis**: Check the stored config:
```bash
wrangler r2 object get moltbot-data/openclaw/openclaw.json --remote | jq '.providers'
```

Look for model IDs like `gw-openrouter/google/gemini-2.0-flash-001` (double prefix).

**Fix**: Avoid setting `AI_GATEWAY_MODEL` env var. Configure models through the OpenClaw config interface instead.

## Unit Test Patterns

### Testing formatForGlasses

```typescript
import { formatForGlasses } from '../src/mentra/display-format';

describe('formatForGlasses', () => {
  it('should strip markdown headers', () => {
    expect(formatForGlasses('## Hello World')).toBe('Hello World');
  });

  it('should strip bold and italic markers', () => {
    expect(formatForGlasses('**bold** and *italic*')).toBe('bold and italic');
  });

  it('should truncate to 220 characters', () => {
    const long = 'a'.repeat(300);
    const result = formatForGlasses(long);
    expect(result.length).toBe(220);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should replace code blocks with [code]', () => {
    expect(formatForGlasses('```js\nconst x = 1;\n```')).toBe('[code]');
  });

  it('should extract link text', () => {
    expect(formatForGlasses('[click here](https://example.com)')).toBe('click here');
  });

  it('should collapse multiple newlines', () => {
    expect(formatForGlasses('a\n\n\n\nb')).toBe('a\n\nb');
  });
});
```

### Testing queryOpenClaw

```typescript
import { queryOpenClaw } from '../src/mentra/glass-bridge';

describe('queryOpenClaw', () => {
  it('should send message and return response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Hello from AI' }),
    });

    const result = await queryOpenClaw(
      { gatewayUrl: 'http://localhost:18789', gatewayToken: 'test-token' },
      { message: 'Hello' },
    );

    expect(result).toBe('Hello from AI');
  });

  it('should throw on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    });

    await expect(
      queryOpenClaw(
        { gatewayUrl: 'http://localhost:18789', gatewayToken: 'test-token' },
        { message: 'Hello' },
      ),
    ).rejects.toThrow('Gateway returned 500');
  });

  it('should abort after 30 seconds', async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockImplementation(
      () => new Promise((_, reject) => {
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 31000);
      }),
    );

    const promise = queryOpenClaw(
      { gatewayUrl: 'http://localhost:18789', gatewayToken: 'test-token' },
      { message: 'Hello' },
    );

    jest.advanceTimersByTime(31000);
    await expect(promise).rejects.toThrow();

    jest.useRealTimers();
  });
});
```

### Testing OpenClawAugment

```typescript
import { OpenClawAugment } from '../src/mentra/augment';

describe('OpenClawAugment', () => {
  let augment: OpenClawAugment;
  let mockSession: { sendText: jest.Mock };

  beforeEach(() => {
    augment = new OpenClawAugment({
      gatewayUrl: 'http://localhost:18789',
      gatewayToken: 'test-token',
      apiKey: 'test-api-key',
    });
    mockSession = { sendText: jest.fn() };
  });

  it('should show ready message on connect', () => {
    augment.onConnect(mockSession);
    expect(mockSession.sendText).toHaveBeenCalledWith('WeaveLogic AI\nReady');
  });

  it('should ignore non-final transcriptions', async () => {
    await augment.onTranscription(mockSession, { text: 'hel', isFinal: false });
    expect(mockSession.sendText).not.toHaveBeenCalled();
  });

  it('should show Listening on button press', () => {
    augment.onButtonPress(mockSession);
    expect(mockSession.sendText).toHaveBeenCalledWith('Listening...');
  });
});
```

## Playwright Testing for Control UI

If the project includes a web-based control UI, use Playwright for end-to-end testing:

```typescript
import { test, expect } from '@playwright/test';

test.describe('MentraOS Control UI', () => {
  test('webview loads successfully', async ({ page }) => {
    await page.goto('/mentra/webview');
    await expect(page).toHaveTitle('WeaveLogic AI');
    await expect(page.locator('h1')).toContainText('WeaveLogic AI');
  });

  test('webview shows status information', async ({ page }) => {
    await page.goto('/mentra/webview');
    await expect(page.locator('.status')).toBeVisible();
    await expect(page.locator('text=Connected')).toBeVisible();
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/mentra/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('WeaveLogic MentraOS Bridge');
  });

  test('status endpoint shows configuration state', async ({ request }) => {
    const response = await request.get('/mentra/status');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.bridge).toBe('active');
    expect(body).toHaveProperty('mentraConfigured');
    expect(body).toHaveProperty('openClawConfigured');
  });

  test('webhook rejects unauthorized requests', async ({ request }) => {
    const response = await request.post('/mentra/webhook', {
      data: { text: 'test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('webhook accepts authorized requests', async ({ request }) => {
    const response = await request.post('/mentra/webhook', {
      data: { text: 'Hello' },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MENTRA_API_KEY}`,
      },
    });
    // May be 200 (success) or 502 (gateway not available in test env)
    expect([200, 502]).toContain(response.status());
  });
});
```

## Integration Test Strategy

### Layer 1: Unit Tests (fast, no network)
- `formatForGlasses` -- text formatting correctness
- `queryOpenClaw` -- request construction with mocked fetch
- `OpenClawAugment` -- event handler registration and session lifecycle

### Layer 2: Component Tests (mocked container)
- Worker route handlers with mocked `sandbox.containerFetch`
- Webhook auth validation (valid key, invalid key, missing key, x-api-key header, query param)
- Error response formatting

### Layer 3: Integration Tests (real container)
- Health and status endpoints against deployed Worker
- Webhook round-trip with real AI response
- Bridge log verification via debug endpoints
- Container process verification

### Layer 4: End-to-End Tests (real glasses or simulator)
- Voice transcription flow: speak -> transcription -> AI -> HUD display
- Photo analysis flow: capture -> vision model -> HUD display
- Button press handling: short press -> listening, long press -> capture
- Reconnection behavior: disconnect -> reconnect -> state recovery

## Running Tests

```bash
# Unit and component tests
npm test

# With coverage
npm test -- --coverage

# Specific test file
npm test -- tests/mentra/display-format.test.ts

# Playwright E2E tests (if configured)
npx playwright test tests/e2e/mentra.spec.ts

# Lint check
npm run lint

# Full validation
npm run build && npm test && npm run lint
```
