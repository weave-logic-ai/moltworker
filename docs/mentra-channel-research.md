# OpenClaw Channel Architecture Research: Mentra Integration

> Research document for implementing Mentra Live as an OpenClaw channel plugin.

---

## 1. How OpenClaw Channels Work

OpenClaw uses a **JSON config-driven channel system**. Channels are registered in the `openclaw.json` config file under the `channels` key. The startup script (`start-openclaw.sh`) demonstrates the pattern:

### Config Patching Flow

1. `openclaw onboard --non-interactive` creates the base config with `--skip-channels`
2. A Node.js patch script (lines 159-326 of `start-openclaw.sh`) reads `openclaw.json` and injects channel configuration
3. Each channel gets its own key under `config.channels` (e.g., `config.channels.telegram`, `config.channels.discord`)
4. The gateway reads the config and initializes enabled channels on startup

### Config Structure Pattern

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "auth": { "mode": "token", "token": "..." }
  },
  "channels": {
    "telegram": { "botToken": "...", "enabled": true, "dmPolicy": "pairing" },
    "discord": { "token": "...", "enabled": true, "dm": { "policy": "pairing" } },
    "slack": { "botToken": "...", "appToken": "...", "enabled": true },
    "mentra": { /* proposed -- see section 4 */ }
  },
  "models": { "providers": { /* ... */ } },
  "agents": { "defaults": { "model": { "primary": "..." } } }
}
```

### Key Observations

- Each channel has a unique config schema (Telegram uses `botToken` + `dmPolicy`, Discord uses `token` + `dm.policy` nesting, Slack uses `botToken` + `appToken`)
- Channels are enabled/disabled via an `enabled` boolean
- Config is validated by OpenClaw -- invalid keys cause startup failures (see comment about issue #47 in the Telegram config)
- Environment variables drive the config injection (`TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, etc.)

---

## 2. Channel Plugin API

### Registration in openclaw.json

Channels register in the `channels` section of the config. Each channel:

1. Has a unique key name (e.g., `telegram`, `discord`, `mentra`)
2. Provides connection credentials (tokens, API keys)
3. Specifies policy configuration (DM policy, allow lists)
4. Has an `enabled` flag

### Environment Variable Pattern

All channels follow the same pattern:
- Config is driven by environment variables
- The start script checks for the presence of required env vars
- If present, it constructs the channel config object
- The config is written to `openclaw.json`

For Mentra, the equivalent variables would be:
- `MENTRAOS_API_KEY` or `MENTRA_API_KEY` -- SDK authentication
- `MENTRA_PACKAGE_NAME` -- app identifier (default: `mentra-claw`)
- `MENTRA_BRIDGE_PORT` -- AppServer listen port (default: `7010`)
- `MENTRA_VISION_MODEL` -- optional vision model override
- `MENTRA_DEFAULT_MODEL` -- optional default model override

### Channel Lifecycle

Based on the codebase, channels have this lifecycle:

1. **Config loaded** -- Gateway reads `openclaw.json` on startup
2. **Channel initialized** -- Gateway creates channel instance from config
3. **Channel started** -- Channel connects to its external service (bot API, WebSocket, etc.)
4. **Messages flow** -- Channel receives messages, forwards to gateway `/v1/chat/completions`, returns responses
5. **Channel stopped** -- On gateway shutdown, channels disconnect gracefully

---

## 3. Existing mentra-bridge.js AppServer Pattern

The file `skills/mentra-bridge/mentra-bridge.js` implements a full MentraOS AppServer that bridges glasses events to OpenClaw. Key patterns:

### Class Hierarchy

```
AppServer (from @mentra/sdk)
  └── OpenClawBridge (custom subclass)
        ├── constructor() -- configures packageName, apiKey, port
        ├── onSession(session, sessionId, userId) -- main event handler
        └── onToolCall(toolCall) -- AI-triggered actions
```

### Constructor Pattern

```javascript
class OpenClawBridge extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,   // e.g., 'mentra-claw'
      apiKey: API_KEY,             // MentraOS Cloud API key
      port: MENTRA_PORT,           // e.g., 7010
    });
  }
}
```

### Session Handler Pattern

The `onSession(session, sessionId, userId)` method is the core handler:

1. **Capability detection** -- Checks `session.capabilities` for display, speaker, camera, microphone
2. **Helper creation** -- Wraps `session.layouts.showTextWall()` and `session.audio.speak()` in error-safe helpers
3. **Event registration** -- Registers handlers for all supported events
4. **Subscription update** -- Manually calls `session.updateSubscriptions()` after handler registration (workaround for SDK timing bug)

### Event Handlers Registered

| Event | Handler | Behavior |
|-------|---------|----------|
| `onTranscription` | Voice-to-AI | Waits for `isFinal`, sends text to OpenClaw, speaks + displays response |
| `onPhotoTaken` | Camera-to-AI | Converts ArrayBuffer to base64, sends to vision model |
| `onButtonPress` | Hardware button | Short press: "Listening". Long press: captures photo + analyzes |
| `onHeadPosition` | Head tracking | Logged only, no action |
| `onPhoneNotifications` | Phone alerts | High-priority notifications spoken aloud |
| `onGlassesBattery` | Battery status | Low battery warning at <=10% |
| `onAppMessage` | App-to-app | Logged, multi-user messaging |
| `onAppUserJoined` | User joined | Logged |
| `onAppUserLeft` | User left | Logged |
| `onDisconnected` | Connection lost | Logged |
| `onReconnected` | Connection restored | Speaks "Reconnected" |
| `onError` | Error | Logged |

### OpenClaw Integration

Messages are forwarded to OpenClaw via `fetch()` to `/v1/chat/completions`:

```javascript
const res = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENCLAW_TOKEN}`,
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: message }],
    max_tokens: 256,
  }),
});
```

Vision queries use multimodal content format:
```javascript
messages: [{
  role: 'user',
  content: [
    { type: 'text', text: message },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
  ],
}]
```

### Express Routes

The AppServer exposes an Express app with custom routes:
- `GET /logs` -- Returns last 200 log lines (text/plain)
- `GET /webview` -- Returns a simple HTML status page

### Display Formatting

Responses are formatted for the glasses HUD (~40 chars wide, ~6 lines, 220 char limit):
- Strip markdown (headers, bold, italic, code blocks, links)
- Collapse excessive newlines
- Truncate to 220 characters with ellipsis

---

## 4. How a Mentra Channel Would Integrate

### As an OpenClaw Channel Plugin

The Mentra channel would be registered in `openclaw.json`:

```json
{
  "channels": {
    "mentra": {
      "enabled": true,
      "apiKey": "${MENTRAOS_API_KEY}",
      "packageName": "mentra-claw",
      "port": 7010,
      "visionModel": "",
      "defaultModel": ""
    }
  }
}
```

The corresponding environment variable injection in `start-openclaw.sh`:

```javascript
if (process.env.MENTRAOS_API_KEY || process.env.MENTRA_API_KEY) {
    config.channels.mentra = {
        apiKey: process.env.MENTRAOS_API_KEY || process.env.MENTRA_API_KEY,
        packageName: process.env.MENTRA_PACKAGE_NAME || 'mentra-claw',
        port: parseInt(process.env.MENTRA_BRIDGE_PORT || '7010', 10),
        visionModel: process.env.MENTRA_VISION_MODEL || '',
        defaultModel: process.env.MENTRA_DEFAULT_MODEL || '',
        enabled: true,
    };
}
```

### Message Flow

```
Mentra Live Glasses
    |
    | (Bluetooth/WiFi)
    v
MentraOS Phone App
    |
    | (WebSocket to MentraOS Cloud)
    v
MentraOS Cloud (cloud.mentraos.com)
    |
    | (WebSocket to AppServer)
    v
MentraChannel (AppServer on port 7010)
    |
    | (HTTP POST to localhost:18789)
    v
OpenClaw Gateway (/v1/chat/completions)
    |
    | (LLM provider API)
    v
AI Model (Anthropic, OpenAI, Workers AI, OpenRouter, etc.)
    |
    | (response)
    v
OpenClaw Gateway
    |
    v
MentraChannel
    |
    | session.audio.speak() -- TTS to glasses speaker
    | session.layouts.showTextWall() -- text to glasses HUD
    v
Glasses display + speaker
```

### Detailed Flow for Voice Input

1. User speaks while wearing glasses
2. Glasses microphone captures audio, streams to MentraOS Cloud for transcription
3. MentraOS Cloud sends `TranscriptionData` event to AppServer via WebSocket
4. `onTranscription` handler fires:
   a. Filter: skip interim results, only process `isFinal: true`
   b. Display "Thinking..." on glasses HUD
   c. POST to OpenClaw `/v1/chat/completions` with `{ messages: [{ role: 'user', content: text }] }`
   d. OpenClaw routes to configured AI model
   e. Parse response from `data.choices[0].message.content`
   f. Format for glasses HUD (strip markdown, truncate to 220 chars)
   g. Display formatted text via `session.layouts.showTextWall()`
   h. Speak full response via `session.audio.speak()`

### Detailed Flow for Camera Input

1. User triggers photo (long-press button or `onPhotoTaken` from glasses UI)
2. Photo data arrives as `ArrayBuffer` in `onPhotoTaken` event
3. Handler converts to base64 string
4. POST to OpenClaw with multimodal content (text + image_url)
5. Uses vision model if configured (`MENTRA_VISION_MODEL`)
6. Response displayed and spoken

---

## 5. Key Interfaces

### Session Object (from @mentra/sdk)

```typescript
interface MentraSession {
  // Capabilities
  capabilities: {
    hasDisplay: boolean;
    hasSpeaker: boolean;
    hasCamera: boolean;
    hasMicrophone: boolean;
  };
  isConnected: boolean;

  // Display
  layouts: {
    showTextWall(text: string): Promise<void>;
    showDoubleTextWall(top: string, bottom: string): Promise<void>;
    showReferenceCard(opts: { title: string; text: string }): Promise<void>;
    showDashboardCard(opts: { left: string; right: string }): Promise<void>;
    showBitmapView(opts: { width: number; height: number; bitmap: ArrayBuffer }): Promise<void>;
    clearView(): Promise<void>;
  };

  // Audio
  audio: {
    speak(text: string, opts?: { language?: string; voice?: string }): Promise<void>;
    play(url: string, opts?: { volume?: number }): Promise<void>;
    stop(): Promise<void>;
  };

  // Camera
  camera: {
    requestPhoto(opts: { purpose?: string; metadata?: Record<string, string> }): Promise<PhotoData>;
    startStream(opts: { rtmpUrl?: string; managed?: boolean; title?: string }): Promise<void>;
    stopStream(): Promise<void>;
  };

  // Location
  location: {
    subscribeToStream(opts: Record<string, unknown>, cb: (loc: LocationData) => void): Promise<void>;
    getLatestLocation(opts: Record<string, unknown>): Promise<LocationData>;
    unsubscribeFromStream(): Promise<void>;
  };

  // Events
  events: {
    onTranscription(handler: (data: TranscriptionData) => void): () => void;
    onTranscriptionForLanguage(lang: string, handler: (data: TranscriptionData) => void): () => void;
    onButtonPress(handler: (data: ButtonPress) => void): () => void;
    onPhotoTaken(handler: (data: PhotoTakenData) => void): () => void;
    onHeadPosition(handler: (data: HeadPositionData) => void): () => void;
    onPhoneNotifications(handler: (data: PhoneNotification[]) => void): () => void;
    onGlassesBattery(handler: (data: BatteryData) => void): () => void;
    onAppMessage(handler: (data: AppMessage) => void): () => void;
    onAppUserJoined(handler: (userId: string) => void): () => void;
    onAppUserLeft(handler: (userId: string) => void): () => void;
    onDisconnected(handler: () => void): () => void;
    onReconnected(handler: () => void): () => void;
    onConnected(handler: (settings: unknown) => void): () => void;
    onError(handler: (error: Error) => void): () => void;
  };

  // Dashboard
  dashboard: {
    content: { writeToMain(text: string): void };
    write(opts: { text: string }, config: { targets: string[] }): Promise<void>;
    onModeChange(handler: (mode: string) => void): void;
  };

  // Settings
  settings: {
    get(key: string, defaultValue?: string): Promise<string>;
    has(key: string): Promise<boolean>;
    on(key: string, handler: (value: unknown) => void): void;
    onChange(handler: (key: string, value: unknown) => void): void;
  };

  // Multi-user
  broadcastToAppUsers(payload: unknown): Promise<void>;
  sendDirectMessage(userId: string, payload: unknown): Promise<void>;
  discoverAppUsers(): Promise<string[]>;

  // Subscriptions
  updateSubscriptions(): Promise<void>;
}
```

### Event Data Types

```typescript
interface TranscriptionData {
  text: string;
  isFinal: boolean;
  transcribeLanguage: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
  provider?: string;
}

interface ButtonPress {
  buttonId: string;
  pressType: 'short' | 'long';
}

interface PhotoTakenData {
  photoData: ArrayBuffer;
  mimeType: string;
}

interface HeadPositionData {
  position: 'up' | 'down' | 'center';
}

interface PhoneNotification {
  app: string;
  title: string;
  content?: string;
  priority?: 'high' | 'normal' | 'low';
}

interface BatteryData {
  batteryLevel: number;
  isCharging?: boolean;
}

interface AppMessage {
  senderUserId: string;
  payload: unknown;
}
```

### AppServer Base Class

```typescript
// From @mentra/sdk
abstract class AppServer {
  constructor(config: {
    packageName: string;
    apiKey: string;
    port: number;
  });

  // Override in subclass
  abstract onSession(session: MentraSession, sessionId: string, userId: string): Promise<void>;
  onToolCall?(toolCall: ToolCall): Promise<string | undefined>;

  // Provided
  getExpressApp(): Express;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

---

## 6. Architecture Recommendations

### Deployment Model

The Mentra bridge currently runs as a **separate container** (see line 377 of `start-openclaw.sh`: "MentraBridge runs in separate container"). This is the correct architecture because:

1. The AppServer needs a long-lived WebSocket connection to MentraOS Cloud
2. Cloudflare Workers run in V8 isolates without persistent connections
3. Keeping the bridge in a separate container isolates it from gateway restarts

### TypeScript Channel Plugin

The existing `mentra-bridge.js` is a working JavaScript implementation. A TypeScript channel plugin (`src/channels/mentra/`) should:

1. Define proper types for all interfaces (session, events, config)
2. Follow the same `AppServer` subclass pattern
3. Add config validation with defaults
4. Be importable as a module (not just a standalone script)
5. Support both standalone mode (like the current bridge) and embedded mode (as an OpenClaw channel)

### Key Workarounds to Preserve

1. **Manual `updateSubscriptions()` call** -- The SDK has a timing bug where subscriptions are counted before handlers are registered. Always call `session.updateSubscriptions()` after all event handlers are set up.
2. **30-second timeout on OpenClaw queries** -- AbortController with 30s timeout prevents hanging requests.
3. **Display formatting** -- Strip markdown and truncate to 220 chars for the glasses HUD.

---

## References

- `start-openclaw.sh` -- Channel config patching, gateway startup
- `skills/mentra-bridge/mentra-bridge.js` -- Full AppServer implementation
- `src/mentra/glass-bridge.ts` -- TypeScript bridge client
- `src/mentra/augment.ts` -- TypeScript augment class
- `src/mentra/display-format.ts` -- Glasses HUD text formatter
- `docs/mentraOS/sdk-integration.md` -- SDK API reference
- `docs/mentraOS/event-handlers.md` -- Event handler patterns
