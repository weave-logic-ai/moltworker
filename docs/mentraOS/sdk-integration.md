# MentraOS SDK Integration

> Source: https://cloud-docs.mentra.glass/cloud-overview/sdk-integration

## Overview

The MentraOS SDK (`@mentraos/sdk`) is a TypeScript/JavaScript library that makes it easy for developers to build apps, functioning as a bridge between applications and the cloud ecosystem.

## Installation

```bash
bun add @mentraos/sdk
```

## App Connection Flow

### Step 1: Start Signal

The cloud sends a webhook to the app containing session information:

```typescript
{
  sessionId: "session-789",
  userId: "alex@example.com",
  startReason: "USER_REQUEST"
}
```

### Step 2: Session Creation

```typescript
import { AppSession } from '@mentraos/sdk';

const session = new AppSession({
  packageName: 'com.translator.app',
  apiKey: process.env.MENTRAOS_API_KEY,
  cloudUrl: 'wss://cloud.mentraos.com/app-ws'
});

await session.connect(sessionId, userId);
```

### Step 3: Authentication

Apps exchange credentials through CONNECTION_INIT and CONNECTION_ACK messages containing settings, configurations, and hardware capabilities.

### Step 4: Data Subscriptions

```typescript
await session.updateSubscriptions([
  {
    type: 'TRANSCRIPTION',
    config: {
      languages: ['en-US', 'es-ES'],
      interimResults: true
    }
  },
  {
    type: 'BUTTON_PRESS',
    config: {
      buttons: ['MAIN']
    }
  }
]);
```

## AppSession Class API

The core class provides:

- **Connection**: `connect()`, `disconnect()`
- **Subscriptions**: `updateSubscriptions()`
- **Display**: `layoutManager`
- **Configuration**: `settingsManager`
- **Hardware**: `modules` (camera, audio, location)
- **Events**: `on()`, `off()` methods

## Display Layouts

Via `session.layouts`:

```typescript
// Text display
await session.layouts.showTextWall("Hello World!");
await session.layouts.showDoubleTextWall("Top", "Bottom");

// Reference card
await session.layouts.showReferenceCard({
  title: "Translation",
  text: "Spanish: Hola Mundo"
});

// Dashboard layout
await session.layouts.showDashboardCard({
  left: "Label",
  right: "Value"
});

// Custom bitmap
await session.layouts.showBitmapView({
  width: 400,
  height: 240,
  bitmap: bitmapData
});

// Clear display
await session.layouts.clearView();
```

## Event Handling

Via `session.events`:

```typescript
session.events.onTranscription((data) => {
  console.log(`User said: ${data.text}`);
});

session.events.onButtonPress((data) => {
  if (data.buttonId === 'main') { /* handle */ }
});

session.events.onPhotoTaken((data) => {
  // data.photoData is ArrayBuffer
});

session.events.onHeadPosition((data) => {
  console.log(`Head position: ${data.position}`);
});

session.events.onPhoneNotifications((data) => {
  // Array of notifications
});

session.events.onAppMessage((message) => {
  console.log(`From ${message.senderUserId}: ${message.payload}`);
});
```

**Note**: Direct methods like `session.onTranscription()` are deprecated; use `session.events.*` instead.

## Settings Management

Via `session.settings`:

```typescript
const sourceLanguage = await session.settings.get('sourceLanguage', 'en-US');
const hasSourceLang = await session.settings.has('sourceLanguage');

session.settings.on('sourceLanguage', (newValue) => {
  console.log('Changed:', newValue);
});

session.settings.onChange((key, newValue) => {
  console.log(`${key} changed`);
});
```

**Setting Types**: TOGGLE, TEXT, SELECT, SLIDER, TEXTAREA, JSON

## Hardware Modules

### Camera

```typescript
const photo = await session.camera.requestPhoto({
  metadata: { reason: 'text-recognition' }
});

await session.camera.startStream({
  rtmpUrl: 'rtmp://your-server.com/live/stream-key'
});

await session.camera.stopStream();

// Managed streaming
const managedStream = await session.camera.startStream({
  managed: true,
  title: 'My Stream'
});
```

### Audio

```typescript
await session.audio.play('https://example.com/sound.mp3', {
  volume: 0.8
});

await session.audio.speak('Hello world', {
  language: 'en-US',
  voice: 'female'
});

await session.audio.stop();
```

### Location

```typescript
await session.location.subscribeToStream({}, (location) => {
  console.log(`At ${location.lat}, ${location.lng}`);
});

const location = await session.location.getLatestLocation({});

await session.location.unsubscribeFromStream();
```

### Dashboard

```typescript
await session.dashboard.write({
  text: "3 new messages"
}, {
  targets: ['dashboard', 'always_on']
});

session.dashboard.onModeChange((mode) => {
  console.log('Mode:', mode);
});

// System/privileged apps only:
const content = await session.dashboard.systemDashboard.read();
session.dashboard.systemDashboard.onContentChange((content) => {});
```

## App Lifecycle

**Starting**: Receive webhook -> Create session -> Connect -> Subscribe -> Display UI

**Running**: Receive events -> Process -> Update display

**Shutting Down**: Receive 'appStopped' -> Clean up -> Close connections

## Best Practices

### 1. Handle Disconnections

```typescript
session.events.onDisconnected(() => {
  console.log('Lost connection, auto-reconnecting...');
});

session.events.onReconnected(() => {
  console.log('Back online!');
});
```

### 2. Respect Rate Limits

Batch display updates; avoid spam.

### 3. Clean Up Resources

Call `session.disconnect()`. ResourceTracker automatically manages timers, listeners, and connections.

### 4. Use TypeScript

Full type support available for all classes and data structures.

## Common Patterns

### Voice Command App

Parse transcriptions and switch on command type to fetch data and display via reference cards.

### Real-time Information

Use `setInterval()` to periodically fetch data and update dashboard content.

### Interactive App

Maintain state and respond to button presses with different UI transitions.

### Multi-User Communication

```typescript
await session.broadcastToAppUsers({
  type: 'cursor_move',
  x: 100,
  y: 200
});

await session.sendDirectMessage('user@example.com', {
  type: 'private_note',
  text: 'Check this out!'
});

const activeUsers = await session.discoverAppUsers();

session.events.onAppMessage((message) => {});
```
