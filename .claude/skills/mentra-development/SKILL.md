---
name: mentra-development
description: Development skill for building MentraOS smart glasses applications on Cloudflare Workers
model: opus
---

# MentraOS Development Skill

## Before You Start

**Always search the docs vector index before implementing new features.** Use InfraNodus MCP tools or memory search to query `docs/mentraOS/` for relevant API details, usage patterns, and constraints. If docs are not yet indexed, read the files in `/home/aepod/dev/moltworker/docs/mentraOS/` directly.

```bash
# Example: search memory for relevant MentraOS docs
npx @claude-flow/cli@latest memory search --query "mentra display layout" --namespace mentraOS
```

Or use InfraNodus:

```
mcp__infranodus__retrieve_from_knowledge_base { query: "mentra onTranscription handler" }
```

## Architecture Overview

The MentraOS integration runs as an AppServer inside a Cloudflare Container. The bridge process extends `@mentra/sdk`'s `AppServer` class, listens on port 7010, and forwards AI queries to the OpenClaw gateway running on `localhost:18789`.

```
Mentra Live Glasses
    |
    v (WebSocket via MentraOS Cloud)
Cloudflare Container
    |
    +-- mentra-bridge (AppServer on port 7010)
    |       |
    |       v (HTTP /v1/chat/completions)
    +-- OpenClaw gateway (on port 18789)
            |
            v (OpenRouter / AI provider)
        AI Model Response
            |
            v (formatted for HUD)
        Glasses Display
```

## Key Files

| File | Purpose |
|------|---------|
| `skills/mentra-bridge/mentra-bridge.js` | The AppServer bridge process (runs in container) |
| `skills/mentra-bridge/app_config.json` | MentraOS app manifest (package, permissions, tools) |
| `src/routes/mentra.ts` | Worker HTTP routes: /mentra/health, /status, /webhook, catch-all proxy |
| `src/mentra/augment.ts` | OpenClawAugment class (Worker-side augment interface) |
| `src/mentra/glass-bridge.ts` | queryOpenClaw helper (Worker-side gateway client) |
| `src/mentra/display-format.ts` | formatForGlasses text formatter |
| `src/mentra/index.ts` | Barrel exports for the mentra module |

## Package Identity

- **Package name**: `mentra-claw`
- **Display name**: WeaveLogic AI
- **AppServer class**: `OpenClawBridge extends AppServer`

## Event Handlers

Register event handlers inside the `onSession(session, sessionId, userId)` callback. All handlers receive the session object and event-specific data.

### Available Events

| Handler | Data Fields | Description |
|---------|-------------|-------------|
| `session.events.onTranscription(cb)` | `text`, `isFinal`, `transcribeLanguage`, `confidence` | Voice transcription from glasses mic |
| `session.events.onPhotoTaken(cb)` | `photoData` (ArrayBuffer), `mimeType` | Photo captured by glasses camera |
| `session.events.onButtonPress(cb)` | `buttonId`, `pressType` (`short` / `long`) | Physical button press on glasses |
| `session.events.onHeadPosition(cb)` | `position` | Head orientation changes |
| `session.events.onPhoneNotifications(cb)` | Array of `{ app, title, content, priority }` | Phone notifications forwarded |
| `session.events.onGlassesBattery(cb)` | `batteryLevel` (number) | Battery status updates |
| `session.events.onAppMessage(cb)` | `senderUserId`, `payload` | App-to-app messaging |
| `session.events.onAppUserJoined(cb)` | `joinedUserId` | User joined app session |
| `session.events.onAppUserLeft(cb)` | `leftUserId` | User left app session |
| `session.events.onDisconnected(cb)` | none | WebSocket disconnect |
| `session.events.onReconnected(cb)` | none | WebSocket reconnect |
| `session.events.onError(cb)` | `error` | Session error |

### Event Handler Pattern

```javascript
session.events.onTranscription(async (data) => {
  if (!data.isFinal) return; // Wait for final transcription

  await session.layouts.showTextWall('Thinking...');

  try {
    const response = await queryOpenClaw(data.text);
    await session.layouts.showTextWall(formatForGlasses(response));
  } catch (err) {
    console.error('[mentra-bridge] Query failed:', err.message);
    await session.layouts.showTextWall('Error. Try again.').catch(console.error);
  }
});
```

## Display API

The glasses HUD has strict size constraints. Always format text before displaying.

### Display Constraints

- Resolution: **400x240 pixels**
- Character width: **~40 characters** per line
- Visible lines: **~6 lines**
- Safe character limit: **220 characters** total
- Always truncate with `...` if text exceeds 220 chars

### Layout Methods

```javascript
// Full-screen text block
await session.layouts.showTextWall('Hello from AI');

// Two-panel text layout
await session.layouts.showDoubleTextWall('Top panel', 'Bottom panel');

// Card with title and body
await session.layouts.showReferenceCard({
  title: 'Notification',
  text: 'You have a new message',
});

// Bitmap/image display
await session.layouts.showBitmapView(imageBuffer);

// Clear the display
await session.layouts.clearView();
```

### Text Formatting Helper

Use `formatForGlasses()` to strip markdown, truncate, and clean text for the HUD:

```javascript
const { formatForGlasses } = require('./display-format');
// or from TypeScript:
import { formatForGlasses } from '../mentra/display-format';

const clean = formatForGlasses(markdownResponse);
// Strips: headers, bold, italic, code blocks, links
// Truncates to 220 chars with "..."
```

## Camera API

```javascript
// Request a photo from the glasses camera (30s timeout)
const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
// photo.photoData is an ArrayBuffer
// photo.mimeType is the image MIME type

// Start camera streaming
await session.camera.startStream();

// Start managed stream (SDK handles lifecycle)
await session.camera.startManagedStream();
```

Convert photo data to base64 for vision model queries:

```javascript
function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

const base64 = arrayBufferToBase64(photo.photoData);
const response = await queryOpenClaw('What do you see?', {
  imageBase64: base64,
  model: VISION_MODEL || undefined,
});
```

## Audio API

```javascript
// Play an audio file or URL
await session.audio.play(audioUrl);

// Text-to-speech
await session.audio.speak('Hello, I am your AI assistant');

// Stop audio playback
await session.audio.stop();
```

## Location API

```javascript
// Subscribe to location updates
session.location.subscribeToStream((location) => {
  console.log(`Lat: ${location.lat}, Lng: ${location.lng}`);
});

// Get the latest known location
const loc = await session.location.getLatestLocation();
```

## AI Gateway Integration

The bridge queries OpenClaw via the standard OpenAI Chat Completions API on localhost:

```javascript
const res = await fetch(`http://localhost:${OPENCLAW_PORT}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENCLAW_TOKEN}`,
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: userMessage }],
    max_tokens: 256,
    model: modelId, // optional
  }),
});

const data = await res.json();
const answer = data.choices?.[0]?.message?.content || 'No response';
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `MENTRAOS_API_KEY` / `MENTRA_API_KEY` | MentraOS Cloud authentication |
| `OPENCLAW_GATEWAY_TOKEN` | Bearer token for OpenClaw API |
| `OPENCLAW_PORT` | Gateway port (default: 18789) |
| `MENTRA_BRIDGE_PORT` | AppServer listen port (default: 7010) |
| `MENTRA_PACKAGE_NAME` | Package name (default: mentra-claw) |
| `MENTRA_VISION_MODEL` | Override model for vision queries |
| `MENTRA_DEFAULT_MODEL` | Override default text model |

## AppServer Constructor Pattern

```javascript
const { AppServer } = require('@mentra/sdk');

class MyBridge extends AppServer {
  constructor() {
    super({
      packageName: 'mentra-claw',
      apiKey: process.env.MENTRAOS_API_KEY,
      port: 7010,
    });
  }

  async onSession(session, sessionId, userId) {
    // Register event handlers here
  }

  async onToolCall(toolCall) {
    // Handle AI-triggered tool calls
    switch (toolCall.toolId) {
      case 'my_tool':
        return await handleMyTool(toolCall.toolParameters);
      default:
        return undefined;
    }
  }
}

const server = new MyBridge();
server.start();
```

## Dashboard and Webview

```javascript
// Write to the MentraOS companion app dashboard
session.dashboard.write(
  { text: 'Status: Active' },
  { targets: ['dashboard'] },
);

// The webview is served via Express on the same port
const app = server.getExpressApp();
app.get('/webview', (req, res) => {
  res.send('<html>...</html>');
});
```

## Development Checklist

1. Search `docs/mentraOS/` vector index for relevant API docs before coding
2. Read the existing bridge implementation at `skills/mentra-bridge/mentra-bridge.js`
3. Respect display constraints (220 chars, ~40 wide, ~6 lines)
4. Always use `formatForGlasses()` before calling `showTextWall()`
5. Handle errors gracefully with user-visible fallback messages on the HUD
6. Set 30-second timeouts on all external API calls
7. Log with `[mentra-bridge]` prefix for container-side code
8. Test with `/mentra/health` and `/mentra/status` endpoints after changes
9. Run `npm run build` and `npm test` before committing
10. Never hardcode API keys or tokens in source files
