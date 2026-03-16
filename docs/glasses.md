# Mentra Live Smart Glasses Integration

## How It Works

The moltworker bridges Mentra Live smart glasses to OpenClaw via an HTTP webhook layer.

```
Glasses (mic/camera/HUD)
    |
MentraOS Cloud (wss://cloud.mentraos.com)
    |
POST /mentra/webhook (Cloudflare Worker)
    |
OpenClaw Gateway /api/chat (Container, port 18789)
    |
AI Provider (OpenRouter / Anthropic / etc.)
    |
Response formatted for HUD (~220 chars, ~40x6 lines)
    |
Glasses display
```

## Webhook API

**Endpoint:** `POST /mentra/webhook`
**Auth:** `Authorization: Bearer <MENTRA_API_KEY>`

### Voice Transcription
```json
{"type": "transcription", "text": "What time is it?"}
```

### Photo/Vision
```json
{"type": "photo", "text": "What do you see?", "imageData": "base64..."}
```

### Response
```json
{"success": true, "response": "Formatted text for HUD"}
```

## Display Formatting

Responses are formatted for the glasses HUD:
- Max ~220 characters (~40 chars wide, ~6 lines)
- Markdown stripped (headers, bold, italic, code blocks, links)
- Truncated with `...` if too long

## MentraOS SDK Compatibility

The real `@mentra/sdk` (npm: `@mentra/sdk` v2.1.29) requires a persistent Node.js/Bun server with WebSocket connections to `wss://cloud.mentraos.com/app-ws`. This is incompatible with Cloudflare Workers (V8 isolates, request-response lifecycle).

Our integration uses HTTP webhooks instead — MentraOS Cloud POSTs events to `/mentra/webhook` and gets responses synchronously. This works within the Worker execution model.

**Note:** An experimental `@mentra/sdk@3.0.0-hono` branch exists that may bring native Worker compatibility in the future.

### Real SDK Event Names vs Our Implementation

| Our Code | Real @mentra/sdk |
|----------|------------------|
| `onPhoto(session, event)` | `session.events.onPhotoTaken(callback)` |
| `session.sendText(text)` | `session.layouts.showTextWall(text)` |
| `onTranscription(session, event)` | `session.events.onTranscription(callback)` |
| `onButtonPress(session)` | `session.events.onButtonPress(callback)` |

## Setup

### 1. Register at Mentra Developer Console
- URL: https://console.mentra.glass
- Package name: `com.weavelogic.openclaw`
- Webhook URL: `https://moltworker.aepod23.workers.dev/mentra/webhook`
- Permissions: microphone, camera, display, notifications

### 2. CF Access Bypass
The `/mentra/*` routes need to be accessible without CF Access login (MentraOS Cloud can't authenticate via CF Access). Add a Bypass policy in Zero Trust > Access > Applications for `/mentra/*` paths.

### 3. Secrets
- `MENTRA_API_KEY` — from the Mentra Developer Console, set via `wrangler secret put`

### 4. Install on Glasses
- Open the Mentra app on your phone
- Go to MiniApp Store (apps.mentra.glass)
- Install `com.weavelogic.openclaw`
- Activate — the glasses connect via the webhook

## Supported Devices
- Mentra Live ($299, camera/mic/HUD/speaker)
- Even Realities G1
- Vuzix Z100

## Resources
- MentraOS GitHub: https://github.com/Mentra-Community/MentraOS
- SDK Docs: https://cloud-docs.mentra.glass/sdk/getting-started
- App Dev Overview: https://docs.mentraglass.com/app-devs/getting-started/overview
- Example App: https://github.com/Mentra-Community/MentraOS-Cloud-Example-App
- Developer Console: https://console.mentra.glass
- App Store: https://apps.mentra.glass
