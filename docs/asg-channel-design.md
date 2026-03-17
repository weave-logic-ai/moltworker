# ASG Channel Design Document

## Universal Smart Glasses Channel for OpenClaw

### 1. Executive Summary

This document defines the architecture for an "asg" (Augmented Smart Glasses) channel plugin
for OpenClaw. The channel provides a device-agnostic abstraction layer that works with any
ASG-compatible smart glasses, starting with Mentra Live but designed for Meta Ray-Ban,
Xreal, Even Realities G1, Vuzix Z100, and future devices.

The primary interaction model is conversational voice -- a tight, low-latency loop from
microphone to AI to speaker. Secondary modalities include camera-to-vision-AI, HUD display,
LED/haptic feedback, and location awareness.

This document covers the ASG client vs SDK distinction, the device abstraction interface,
the conversational loop optimization, and a phased feature roadmap.

---

## 2. ASG Client vs MentraOS SDK: What Each Layer Does

### 2.1 Architecture Stack

```
+---------------------------------------------+
| OpenClaw AI (LLM, vision, tools)             |
+---------------------------------------------+
| ASG Channel Plugin (this design)             |
+---------------------------------------------+
| MentraOS SDK (@mentra/sdk AppServer)         |  <-- App developer layer
+---------------------------------------------+
| MentraOS Cloud (wss://cloud.mentraos.com)    |  <-- Session mgmt, routing
+---------------------------------------------+
| Mobile App (React Native, BLE bridge)        |  <-- Phone middleware
+---------------------------------------------+
| ASG Client (Android service on glasses)      |  <-- Device-level firmware
+---------------------------------------------+
| Hardware (camera, mic, speaker, IMU, LEDs)   |
+---------------------------------------------+
```

### 2.2 The SDK Layer (What Apps Use)

The MentraOS SDK (`@mentra/sdk`) is a TypeScript library that provides high-level access to
glasses capabilities via WebSocket connections to MentraOS Cloud. It abstracts away BLE
communication, hardware differences, and protocol details.

**What the SDK provides:**
- `AppServer` base class with `onSession()`, `onStop()`, `onToolCall()` lifecycle hooks
- `AppSession` per-user object with managers for events, layouts, audio, camera, location,
  LED, dashboard, settings, and storage
- Event subscription model: `session.events.onTranscription()`, `onButtonPress()`,
  `onPhotoTaken()`, `onHeadPosition()`, `onAudioChunk()`, etc.
- Display layouts: `showTextWall()`, `showDoubleTextWall()`, `showReferenceCard()`,
  `showDashboardCard()`, `showBitmapView()`
- Audio output: `session.audio.speak()` (ElevenLabs TTS), `session.audio.playAudio()`
- Camera: `session.camera.requestPhoto()`, managed/unmanaged RTMP streaming
- Location: `session.location.subscribeToStream()`, `getLatestLocation()`
- LED: `session.led.turnOn()`, `blink()`, `solid()`
- Multi-user: `broadcastToAppUsers()`, `sendDirectMessage()`, `discoverAppUsers()`
- Persistent storage: `session.storage.set()`, `get()`, `delete()`
- Settings management with real-time change notifications
- Capability detection: `session.capabilities` object with hardware feature flags

**What the SDK does NOT provide:**
- Direct microphone control (mic is managed by the cloud transcription pipeline)
- Raw audio output (no PCM streaming to speaker -- only TTS and URL-based playback)
- Direct BLE communication with the glasses
- Hardware-level sensor fusion
- Custom display rendering beyond the fixed layout types + bitmap

### 2.3 The ASG Client Layer (What Runs on the Glasses)

The ASG Client is an Android application running on the smart glasses hardware itself. It
is the firmware-level bridge between physical hardware and the MentraOS ecosystem. The SDK
apps never talk to the ASG client directly -- MentraOS Cloud mediates all communication.

**Architecture:**
- `AsgClientService extends Service` -- central coordinator
- Manager pattern with interface-based factories for device abstraction:
  - `INetworkManager` (WiFi control: enable, connect, status)
  - `IBluetoothManager` (BLE GATT server, data transmission)
  - `MediaCaptureService` (camera control, photo/video, RTMP encoding)
- Multiple manager implementations per device:
  - `K900NetworkManager`, `SystemNetworkManager`, `FallbackNetworkManager`
  - `K900BluetoothManager`, `StandardBluetoothManager`
- EventBus for internal component communication
- MCU command parsing (button presses, swipe gestures, battery status)

**ASG Client capabilities that are NOT exposed through the SDK:**
- WiFi management (connect to networks, start hotspot)
- Direct MCU communication (raw button commands: `cs_pho`, `cs_vdo`, `cs_swst`)
- Hardware-level RTMP encoding and streaming
- BLE protocol details and message format
- Battery voltage readings (vs just percentage)
- Button press mode configuration (PHOTO / APPS / BOTH)
- Device-specific manager selection and fallback logic

**Key insight for channel design:** The ASG channel operates at the SDK level, not the
ASG client level. All hardware access goes through the cloud-mediated SDK. This is
actually beneficial for device-agnosticism -- the SDK's capability detection and event
normalization already abstract away device differences.

### 2.4 Practical Implications for Channel Design

| Capability | SDK Access | ASG Client Only | Channel Impact |
|---|---|---|---|
| Voice transcription | onTranscription() | -- | Use SDK; cloud STT is the path |
| Raw audio chunks | onAudioChunk() | -- | Available for custom VAD |
| TTS output | session.audio.speak() | -- | ElevenLabs via cloud, ~75-300ms |
| Audio file playback | session.audio.playAudio() | -- | URL-based only |
| Photo capture | requestPhoto() / onPhotoTaken() | Local capture mode | SDK sufficient |
| Video streaming | startManagedStream() / startStream() | Direct RTMP encoding | SDK wraps both |
| Display | showTextWall() et al. | -- | Fixed layouts + bitmap |
| LED control | session.led.turnOn/blink/solid() | Direct MCU LED commands | SDK sufficient |
| Location | subscribeToStream() | -- | GPS via phone |
| Button events | onButtonPress() | Raw MCU commands | SDK normalizes short/long |
| Head position | onHeadPosition() | Raw IMU data | SDK gives up/down only |
| IMU (accel/gyro/compass) | Not exposed | Direct sensor access | Not available to apps |
| WiFi management | Not exposed | Full control | Not available to apps |
| BLE protocol | Not exposed | Full access | Not available to apps |

---

## 3. Device Abstraction Interface

### 3.1 Design Philosophy

The ASG channel must work with any smart glasses that can connect to MentraOS. The SDK
already provides device normalization through `session.capabilities`, but the channel needs
its own abstraction to handle the interaction model differences between device classes.

Three device archetypes exist today:
1. **Camera glasses** (Mentra Live): No display, speaker, mic with VAD, 1080p camera, IMU, LEDs, WiFi, buttons
2. **Display glasses** (Even Realities G1): Green monochrome 640x200, mic, no camera, no speaker, buttons
3. **Basic glasses** (Vuzix Z100): Monochrome display only, no mic, no camera, no speaker

### 3.2 The DeviceProfile Interface

Rather than checking capabilities in every handler, the channel should compute a
`DeviceProfile` once at session start and use it to drive all interaction decisions.

```typescript
interface DeviceProfile {
  // Computed interaction mode
  interactionMode: 'voice-first' | 'display-first' | 'display-only';

  // Input capabilities
  input: {
    voice: boolean;          // Has mic, can receive transcription
    rawAudio: boolean;       // Can receive audio chunks for custom VAD
    camera: boolean;         // Can capture photos
    videoStream: boolean;    // Can stream video (RTMP)
    buttons: ButtonConfig;   // Button types and event support
    headTracking: boolean;   // Head position events (up/down)
    location: boolean;       // GPS available
  };

  // Output capabilities
  output: {
    display: DisplayConfig | null;
    speaker: SpeakerConfig | null;
    led: LedConfig | null;
  };

  // Device metadata
  device: {
    modelName: string;
    manufacturer: string;
    hasWifi: boolean;
    hasIMU: boolean;
  };
}

interface ButtonConfig {
  available: boolean;
  types: string[];              // ['press', 'swipe1d', 'swipe2d']
  supportedEvents: string[];    // ['short', 'long', 'double']
}

interface DisplayConfig {
  resolution: string;           // '640x200', etc.
  hasColor: boolean;
  maxTextLines: number;
  maxCharsPerLine: number;      // Estimated
  maxTotalChars: number;        // Safe display limit
  hasBitmapSupport: boolean;
  throttleMs: number;           // Min ms between updates (300)
}

interface SpeakerConfig {
  available: boolean;
  isPrivate: boolean;           // Bone conduction
  speakerCount: number;
}

interface LedConfig {
  available: boolean;
  hasRGB: boolean;
  hasWhite: boolean;
  colors: string[];             // ['red', 'green', 'blue', 'orange', 'white']
}
```

### 3.3 Interaction Mode Selection

The `interactionMode` is the most critical decision. It determines the entire UX flow:

```
voice-first:  Speaker + Mic, no display required (Mentra Live)
              Primary: voice in, voice out
              Secondary: LED feedback, camera vision

display-first: Display + Mic, speaker optional (Even Realities G1)
              Primary: voice in, display out
              Secondary: text display, dashboard

display-only: Display only, no mic, no speaker (Vuzix Z100)
              Primary: external trigger (button, phone), display out
              Secondary: dashboard, notifications
```

The channel should select interaction mode automatically based on capabilities:

```
if (hasSpeaker && hasMicrophone) -> voice-first
else if (hasDisplay && hasMicrophone) -> display-first
else if (hasDisplay) -> display-only
else -> error (no viable interaction mode)
```

### 3.4 Generic ASG Capabilities for Future Devices

The minimum hardware contract for ANY smart glasses to work with the ASG channel:

**Required (at least one output):**
- Display OR Speaker (at least one way to deliver responses)

**Required (at least one input):**
- Microphone OR Button (at least one way to trigger requests)

**Optional but recommended:**
- Camera (enables vision AI)
- Location (enables context-aware responses)
- LED (enables non-visual/non-audio feedback)
- IMU (enables gesture recognition, activity detection)

---

## 4. Conversational Loop Optimization

### 4.1 The Voice Loop Pipeline

The target interaction is a tight conversational voice loop. Here is the full pipeline
with latency annotations for each stage:

```
[User speaks]
    |
    v
Mic -> glasses hardware (~0ms, real-time)
    |
    v
BLE -> phone -> cloud WebSocket (~50-100ms)
    |
    v
Cloud STT (Deepgram/AssemblyAI) -> transcription event
    |  Interim results: ~200-500ms after speech start
    |  Final result: ~300-800ms after speech ends
    v
WebSocket -> AppServer (our bridge) (~20-50ms)
    |
    v
Echo detection + processing lock check (~1ms)
    |
    v
OpenClaw AI query (LLM inference) (~500-3000ms)   <-- DOMINANT LATENCY
    |
    v
TTS generation (ElevenLabs) (~75-300ms)
    |
    v
Audio delivery to glasses (~50-100ms)
    |
    v
[User hears response]

TOTAL: ~900ms - 4500ms end-to-end
```

### 4.2 Latency Bottleneck Analysis

| Stage | Latency | Controllable? | Optimization Path |
|---|---|---|---|
| Hardware capture | ~0ms | No | -- |
| BLE + cloud transport | ~100-200ms | No | Fixed by MentraOS |
| Cloud STT | ~300-800ms | Partial | Use interim results, pick faster provider |
| SDK -> our server | ~20-50ms | No | Fixed by infrastructure |
| AI inference | ~500-3000ms | Yes | Model selection, streaming, caching |
| TTS generation | ~75-300ms | Yes | Model selection, streaming |
| Audio delivery | ~50-100ms | No | Fixed by MentraOS |

The AI inference step dominates. Two strategies to reduce perceived latency:

### 4.3 Strategy 1: Streaming TTS While AI Generates

**Can we stream TTS while the AI is still generating?** Not with the current MentraOS SDK.

The SDK's `session.audio.speak(text)` is a single call that sends the complete text to
ElevenLabs for synthesis. There is no streaming TTS API. The full text must be available
before TTS can begin.

However, we CAN implement sentence-level chunking:

```
AI generates: "The weather is sunny today. | It's 72 degrees..."
                                            ^
                                   First sentence complete
                                   -> speak("The weather is sunny today.")
                                   -> continue generating next sentence
                                   -> speak("It's 72 degrees...")
```

This requires:
1. Streaming AI response (SSE from OpenClaw gateway)
2. Sentence boundary detection (split on `.!?` followed by space/newline)
3. Sequential speak() calls with the AudioPipeline managing the queue
4. Display updates as each sentence completes

**Estimated latency improvement:** 500-1500ms for multi-sentence responses.

### 4.4 Strategy 2: Optimistic Display + Deferred Audio

Show text on the display immediately while TTS is being generated:

```
[AI response received]
    |
    +--> Display: showTextWall(response)     (~20ms)
    |
    +--> TTS: session.audio.speak(response)  (~75-300ms)
```

For voice-first devices without a display (Mentra Live), this does not help.
For display-first devices (G1), the user sees the answer hundreds of milliseconds
before hearing it.

### 4.5 Strategy 3: Audio Chunk VAD (Custom Voice Activity Detection)

**Can we use audio chunks for real-time VAD instead of waiting for final transcription?**

Yes. The SDK provides `session.events.onAudioChunk()` which delivers raw PCM audio at
16kHz. We can implement custom VAD to:

1. Detect speech onset before the cloud STT fires
2. Show a "Listening..." indicator immediately
3. Detect speech offset and start processing even before `isFinal` arrives
4. Implement barge-in detection (user starts speaking while TTS is playing)

However, this is an advanced optimization. For V1, relying on the cloud's `isFinal`
transcription flag is simpler and sufficient. The cloud STT already has built-in VAD.

### 4.6 Mic Gating: Push-to-Talk vs VAD vs Wake Word

Three modes for when the mic is active:

| Mode | How It Works | Latency | Privacy | Social |
|---|---|---|---|---|
| **Push-to-talk (PTT)** | Button hold to talk | +0ms (instant start) | Best | Best |
| **VAD (always listening)** | Cloud STT runs continuously | +0ms | Poor | Poor |
| **Wake word** | "Hey ClawFT" activates | +500-1000ms detect | Good | Medium |

**Recommendation for V1:** Default to PTT mode. The existing bridge already implements
PTT with `controls.pttMode = true`. This is the safest default for privacy and social
acceptability.

**For V2:** Add configurable wake word detection using the audio chunks API. The channel
would subscribe to `onAudioChunk()`, run a lightweight wake word model (e.g., Porcupine
or a custom keyword spotter), and activate listening only when the wake word is detected.

### 4.7 Echo Detection and Barge-In

The current implementation uses a 3-second cooldown after TTS finishes to prevent the
glasses' speaker output from being picked up by the mic and re-transcribed. This works but
adds 3 seconds of dead time after every response.

**Improved approach for V1:**
- Keep the 3-second cooldown as the safe default
- Track the exact text spoken and compare incoming transcriptions against it
- If the transcription closely matches the last spoken text, discard it as echo
- If the transcription is clearly different, allow it through (barge-in)

**For V2:**
- Use audio chunks to implement acoustic echo cancellation (AEC)
- Compare incoming audio energy during TTS playback to detect genuine new speech
- Reduce cooldown to ~500ms with AEC active

### 4.8 Optimal Voice Flow (V1)

```
IDLE
  |
  +-- [PTT button pressed] --> LISTENING
  |                               |
  |                               +-- show "Listening..." / LED green
  |                               |
  |                               +-- [isFinal transcription] --> PROCESSING
  |                               |                                  |
  |                               +-- [PTT released, no final] -> IDLE
  |
PROCESSING
  |
  +-- show "Thinking..." / LED blue
  |
  +-- query OpenClaw AI
  |
  +-- [response received] --> RESPONDING
  |
RESPONDING
  |
  +-- show formatted response on display
  +-- speak response via TTS / LED orange
  |
  +-- [TTS complete] --> COOLDOWN
  |
  +-- [short button press during TTS] --> stop audio --> IDLE
  |
COOLDOWN (3 seconds)
  |
  +-- ignore transcriptions that match last spoken text
  |
  +-- [cooldown expires] --> IDLE
```

---

## 5. Rich Interactions Beyond Voice

### 5.1 Camera to Vision AI

The camera is the highest-value secondary modality. Current implementation:

1. Long-press button triggers `session.camera.requestPhoto()`
2. Photo arrives as ArrayBuffer, converted to base64
3. Sent to OpenClaw with a vision-capable model (GPT-4o, Gemini 2.0 Flash)
4. Response displayed and spoken

**V1 improvements:**
- Configurable photo prompt (not hardcoded "What do you see?")
- Context-aware prompts based on conversation history ("Look at this and tell me more")
- Photo quality selection based on use case (small for quick OCR, large for detailed analysis)

**V2 additions:**
- Continuous streaming analysis (managed stream -> periodic frame capture -> vision AI)
- OCR mode: capture text and read it aloud
- Scene description mode: automatic environment awareness
- Object identification: "What is this?" with pointing gesture
- Video stream analysis for real-time narration (accessibility use case)

### 5.2 Display Output Strategy

Different devices require different display strategies:

**Voice-first devices (Mentra Live, no display):**
- All output is audio (TTS)
- LED colors for state: green=listening, blue=processing, orange=speaking, red=error
- Dashboard not applicable

**Display-first devices (Even Realities G1):**
- Primary output is display text
- Layout selection by content type:
  - Quick answer: `showTextWall()` (single block, ~220 chars)
  - Structured answer: `showReferenceCard()` (title + body)
  - Status update: `showDashboardCard()` (key-value)
  - Multi-part: `showDoubleTextWall()` (question on top, answer on bottom)
- Fallback to TTS if speaker available
- Dashboard for persistent status ("Connected", message count, battery)

**Display constraints (all devices):**
- Green monochrome on G1 (640x200)
- Text only, no images
- 200-300ms minimum between display updates (cloud-enforced throttle)
- Max ~220 characters safe limit
- Strip all markdown before display
- Truncate intelligently (never mid-word, append "...")

### 5.3 LED Feedback (Non-Visual, Non-Audio)

For devices with LEDs (Mentra Live), provide ambient state feedback:

| State | LED Color | Pattern |
|---|---|---|
| Ready / idle | Off | -- |
| Listening (PTT active) | Green | Solid |
| Processing (AI thinking) | Blue | Slow blink |
| Speaking (TTS active) | Orange | Solid |
| Error | Red | 3 quick blinks |
| Low battery | Red | Slow blink |
| Connected | Green | 2 quick blinks |
| Photo captured | White | 1 quick blink |

Always check `session.capabilities?.hasLight` before using LEDs. Provide graceful
degradation -- if no LED, the state information is conveyed through audio cues (short
tones from the SOUND_MAP).

### 5.4 Location-Aware Responses

Location data enables contextual AI responses:

- Weather queries: "What's the weather?" -> use current GPS for location
- Navigation: "Where's the nearest coffee shop?" -> use location for proximity search
- Geofencing: automatic behavior changes based on location (e.g., silent mode in meetings)

**V1:** Subscribe to location on session start if permission granted. Include lat/lng in
AI context for location-sensitive queries.

**V2:** Implement geofence profiles and automatic context switching.

### 5.5 Multi-User Sessions

MentraOS supports multi-user communication between glasses wearers using the same app:

- `session.broadcastToAppUsers()` -- send to all connected users
- `session.sendDirectMessage()` -- send to specific user
- `session.discoverAppUsers()` -- list active users
- `session.events.onAppMessage()` -- receive messages

**V2 use case:** Shared AI sessions where multiple glasses wearers can participate in the
same conversation. One user asks a question, all users see/hear the response.

---

## 6. Privacy and Control Model

### 6.1 Microphone Privacy

**Default: PTT (Push-to-Talk)**
- Mic is gated by default. Transcription is only processed when PTT is active.
- The existing bridge defaults `pttMode = true, pttActive = false`.
- No audio is processed until the user explicitly holds the PTT button.

**Optional: Always-on VAD**
- Can be enabled via settings (`controls.pttMode = false`).
- Cloud STT runs continuously; all `isFinal` transcriptions are processed.
- Must be opt-in with clear user consent.

**Wake word mode (V2):**
- Audio chunks processed locally for wake word detection only.
- Raw audio is NOT sent to the cloud until wake word is detected.
- After wake word, a brief listening window opens (configurable, 5-15 seconds).

### 6.2 Speaker Privacy

- Independent mute control: `controls.audioEnabled` can be toggled separately from mic.
- Volume awareness: check `session.capabilities.speaker?.isPrivate` (bone conduction).
- For non-private speakers, lower default volume in public settings.

### 6.3 Camera Privacy

- Camera is NEVER activated without explicit user action (button press or voice command).
- No continuous capture mode without explicit opt-in.
- Privacy LED: Mentra Live hardware has a white LED that illuminates when camera is active
  (hardware-enforced, cannot be disabled by software).
- Photo data is sent to the AI and not stored by the channel unless explicitly configured.

### 6.4 Data Handling

- Conversation history is kept per-session in memory only (MAX_HISTORY = 20 messages).
- No persistent conversation storage by default.
- Session state is destroyed on disconnect.
- Optional: Use `session.storage` for user preferences (not conversation data).
- Photo data is base64-encoded for the AI query and not persisted.

### 6.5 Control Endpoints

The existing bridge exposes HTTP control endpoints for the companion app webview:

- `GET /control` -- current control state
- `POST /control/mic` -- `{ enabled: boolean }` -- enable/disable mic processing
- `POST /control/audio` -- `{ enabled: boolean }` -- enable/disable TTS output
- `POST /control/ptt` -- `{ mode: boolean, active: boolean }` -- PTT mode and state

These should be preserved in the ASG channel and extended with:
- `POST /control/camera` -- `{ enabled: boolean }` -- enable/disable camera features
- `POST /control/location` -- `{ enabled: boolean }` -- enable/disable location tracking
- `GET /control/capabilities` -- device profile and current feature state

---

## 7. Channel Architecture

### 7.1 Module Structure

```
src/channels/asg/
  index.ts              -- AsgChannel class, factory function
  types.ts              -- All interfaces and types
  device-profile.ts     -- DeviceProfile computation from capabilities
  voice-loop.ts         -- Voice interaction state machine
  audio-pipeline.ts     -- TTS queue, echo detection, interrupt
  display-adapter.ts    -- Layout selection per device profile
  camera-handler.ts     -- Photo capture, vision AI queries
  session-state.ts      -- Per-session conversation history and locks
  config.ts             -- Channel configuration, validation, env resolution
  control-routes.ts     -- HTTP control endpoints
  helpers.ts            -- Utility functions (format, base64, etc.)
```

### 7.2 Class Diagram

```
AsgChannel
  |
  +-- config: AsgChannelConfig
  +-- openclawConfig: OpenClawGatewayConfig
  +-- activeSessions: Map<string, AsgSession>
  |
  +-- init() / start() / stop()
  |
  +-- AsgAppServer (extends AppServer from @mentra/sdk)
       |
       +-- onSession(session, sessionId, userId)
       |     |
       |     +-- DeviceProfile.fromCapabilities(session.capabilities)
       |     +-- new SessionState(sessionId, userId, profile)
       |     +-- new AudioPipeline(session, profile)
       |     +-- new DisplayAdapter(session, profile)
       |     +-- new VoiceLoop(state, audio, display, openclawQuery)
       |     +-- new CameraHandler(session, state, openclawQuery)
       |     +-- Wire event handlers
       |
       +-- onToolCall(toolCall)
```

### 7.3 Key Design Decisions

**1. The channel wraps the SDK, not the ASG client.**
All hardware access goes through `@mentra/sdk`. The ASG channel is an SDK-level app,
not a firmware-level modification. This ensures portability across all MentraOS-compatible
devices.

**2. Device-agnostic through DeviceProfile, not per-device code paths.**
The DeviceProfile is computed once at session start. All subsequent logic references the
profile, not raw capabilities. Adding a new device means its capabilities map to an
existing interaction mode -- no new code paths needed.

**3. The voice loop is a state machine, not ad-hoc event handling.**
The current bridge uses inline event handlers with manual locks. The ASG channel should
use an explicit state machine (IDLE -> LISTENING -> PROCESSING -> RESPONDING -> COOLDOWN)
to make transitions clear, prevent illegal states, and make testing straightforward.

**4. AudioPipeline manages all output, with queuing.**
Instead of await-chaining speak() calls, the AudioPipeline should maintain an internal
queue. This enables: sentence-level streaming, interrupt-then-resume, and priority
insertion (e.g., urgent notification interrupts current response).

**5. Separation of Mentra-specific code from generic ASG logic.**
The `@mentra/sdk` import is isolated to the AppServer subclass. All other modules
(VoiceLoop, AudioPipeline, DisplayAdapter, CameraHandler) work with the DeviceProfile
and abstract session interfaces. This makes it possible to add non-Mentra backends
(e.g., direct WebSocket to Meta Ray-Ban) in the future.

### 7.4 Relationship to Existing Code

| Existing Code | ASG Channel Equivalent | Migration |
|---|---|---|
| `skills/mentra-bridge/bridge.cjs` | `src/channels/asg/index.ts` | Replace with TS |
| `skills/mentra-bridge/tts-normalize.cjs` | Reuse as-is or port to TS | Keep |
| `src/channels/mentra/index.ts` | Evolves into `src/channels/asg/` | Refactor |
| `src/channels/mentra/types.ts` | `src/channels/asg/types.ts` | Extend |
| `src/channels/mentra/session-state.ts` | `src/channels/asg/session-state.ts` | Extend |
| `src/channels/mentra/audio-pipeline.ts` | `src/channels/asg/audio-pipeline.ts` | Extend with queue |
| `src/channels/mentra/helpers.ts` | Split into display-adapter + helpers | Refactor |
| `src/channels/mentra/config.ts` | `src/channels/asg/config.ts` | Extend |
| `src/mentra/display-format.ts` | `src/channels/asg/helpers.ts` | Merge |

---

## 8. Feature Roadmap

### 8.1 V1: Tight Conversational Voice (Current Sprint)

**Goal:** Replace the CJS bridge with a clean TypeScript ASG channel that works with
Mentra Live and degrades gracefully to display-only devices.

**Features:**
- DeviceProfile computation and interaction mode selection
- Voice loop state machine (IDLE -> LISTENING -> PROCESSING -> RESPONDING -> COOLDOWN)
- PTT mode as default
- Echo detection with 3-second cooldown
- Processing lock (one query at a time per session)
- AI query via OpenClaw /v1/chat/completions
- Conversation context (last 10 messages)
- TTS output via ElevenLabs (flash model for low latency)
- Display output (TextWall) for display-capable devices
- Photo capture on long-press with vision AI
- Audio interrupt on short-press during TTS
- LED feedback for voice-first devices
- HTTP control endpoints (mic, audio, PTT, camera)
- Dashboard status for display devices
- Battery monitoring with low-battery alerts
- Phone notification forwarding (high priority only)
- Connection/reconnection handling

**What V1 does NOT include:**
- Streaming AI responses (sentence-level chunking)
- Wake word detection
- Custom VAD via audio chunks
- Acoustic echo cancellation
- Multi-user shared sessions
- Continuous video analysis
- Geofencing / automatic context switching
- Per-device settings UI in companion app

### 8.2 V2: Streaming and Intelligence

**Goal:** Reduce perceived latency, add wake word, and expand camera capabilities.

**Features:**
- Streaming AI responses with sentence-level TTS chunking
- Wake word detection using audio chunks (local processing)
- Improved echo detection with text-matching (not just cooldown timer)
- Configurable interaction modes per user preference
- Photo quality selection based on query type
- OCR mode (capture -> extract text -> read aloud)
- Enhanced display: ReferenceCard for structured answers, DoubleTextWall for Q+A
- Persistent user preferences via session.storage
- Control panel webview with real-time status (via WebSocket relay)
- Metrics: response latency, transcription confidence, TTS duration

### 8.3 V3: Multi-Modal and Multi-User

**Goal:** Full multi-modal interaction and collaborative features.

**Features:**
- Continuous video stream analysis (periodic frame capture from managed stream)
- Scene description mode for accessibility
- Multi-user shared AI sessions
- Acoustic echo cancellation via audio chunks
- Geofencing and automatic context profiles
- Custom prompt templates per use case (cooking, navigation, work, accessibility)
- Non-Mentra device backends (Meta Ray-Ban via companion API, Xreal via WebSocket)
- Audio-only mode for earbuds-style devices
- Proactive AI suggestions based on context (location, time, calendar, activity)

---

## 9. Known Constraints and Risks

### 9.1 MentraOS SDK Limitations

1. **No streaming TTS API.** `session.audio.speak()` requires complete text. Sentence
   chunking is the workaround, but introduces gaps between sentences.

2. **No raw audio output.** Cannot stream PCM to the speaker. All audio must go through
   TTS or URL-based playback.

3. **Display throttle.** 200-300ms minimum between display updates, enforced by the cloud.
   Cannot do real-time transcription display (too fast).

4. **Head position is coarse.** Only 'up' and 'down', no continuous orientation data.
   True head tracking requires IMU access that is not exposed through the SDK.

5. **No direct device communication.** Everything routes through MentraOS Cloud. If the
   cloud is down, the glasses cannot communicate with our app.

6. **SDK timing bug.** `updateSubscriptions()` must be called manually after registering
   event handlers (documented workaround: `session.updateSubscriptions()`).

### 9.2 Latency Floor

The minimum achievable end-to-end latency is approximately:
- Transport: ~200ms (BLE + cloud + WebSocket, each direction)
- STT: ~300ms (fastest cloud STT on final result)
- AI: ~500ms (fastest model, e.g., Gemini Flash)
- TTS: ~75ms (ElevenLabs flash model)
- Transport back: ~100ms

**Theoretical minimum: ~1175ms.** Practical minimum: ~1500-2000ms.

This is fast enough for conversational interaction (human turn-taking gap is typically
200-500ms, but glasses have the "processing" expectation baked in).

### 9.3 Echo Detection Trade-Off

The 3-second cooldown after TTS prevents echo loops but creates dead time. Users cannot
immediately follow up. Reducing this cooldown risks echo loops. The right balance depends
on:
- Speaker volume and proximity to mic (Mentra Live has open speakers, high echo risk)
- Ambient noise level
- Whether bone conduction speakers are used (lower echo risk)

This is the single biggest UX annoyance and should be the top priority for V2 improvement.

### 9.4 Device Diversity Risk

The ASG channel currently only has one real device to test against (Mentra Live). The
Even Realities G1 and Vuzix Z100 have very different capability profiles. The DeviceProfile
abstraction is designed to handle this, but edge cases will emerge when testing on actual
hardware with different display sizes, audio characteristics, and button configurations.

---

## 10. Reference: Existing Implementation Inventory

### 10.1 Working Bridge (Production)

`/home/aepod/dev/moltworker/skills/mentra-bridge/bridge.cjs` -- V3 production bridge
running as a standalone Node.js process. Extends `@mentra/sdk AppServer`. Handles voice,
photo, button, battery, notifications. Routes to OpenClaw via CLI agent command with
fallback to direct /v1/chat/completions API. 438 lines.

### 10.2 TypeScript Channel (In Progress)

`/home/aepod/dev/moltworker/src/channels/mentra/` -- Clean TypeScript refactor of the
bridge, split into modules (index.ts, types.ts, config.ts, session-state.ts,
audio-pipeline.ts, helpers.ts). Does not import `@mentra/sdk` directly (uses typed
interfaces instead). 12 files including tests.

### 10.3 MentraOS SDK Documentation

`/home/aepod/dev/moltworker/docs/mentraOS/` -- 30 markdown files documenting the complete
SDK API, sourced from docs.mentraglass.com and cloud-docs.mentra.glass.

### 10.4 UX Design System

`/home/aepod/dev/moltworker/docs/smart-glasses-ux-design-system.md` -- Comprehensive
design principles for smart glasses applications covering display, voice, gesture, audio,
notifications, and privacy patterns.

---

## 11. Glossary

| Term | Definition |
|---|---|
| ASG | Augmented Smart Glasses (also: Android Smart Glasses in Mentra context) |
| ASG Client | Android app running on the glasses hardware |
| MentraOS SDK | TypeScript library for building glasses apps |
| MentraOS Cloud | Cloud service managing sessions, routing, and transcription |
| AppServer | SDK base class for creating glasses applications |
| AppSession | Per-user session object with hardware access managers |
| STT | Speech-to-Text |
| TTS | Text-to-Speech |
| VAD | Voice Activity Detection |
| PTT | Push-to-Talk |
| BLE | Bluetooth Low Energy |
| RTMP | Real-Time Messaging Protocol (video streaming) |
| HUD | Heads-Up Display |
| MCU | Microcontroller Unit (button/sensor processor on glasses) |
| SGC | SmartGlassesCommunicator (MentraOS device abstraction base class) |
| AEC | Acoustic Echo Cancellation |
