# Message Types Reference

> Source: https://docs.mentraglass.com/app-devs/reference/interfaces/message-types

## Core Message Structure

All messages extend `BaseMessage`:

```typescript
interface BaseMessage {
  type: string;
  timestamp?: number;
  sessionId?: string;
}
```

## App-to-Cloud Messages

### ConnectionInit (TPA)

```typescript
{
  type: AppToCloudMessageType.CONNECTION_INIT;
  packageName: string;
  apiKey: string;
}
```

### SubscriptionUpdate

```typescript
{
  type: AppToCloudMessageType.SUBSCRIPTION_UPDATE;
  subscriptions: StreamSubscription[];
}
```

### DisplayRequest

```typescript
{
  type: AppToCloudMessageType.DISPLAY_REQUEST;
  packageName: string;
  view: ViewType;
  layout: Layout;
  durationMs?: number;
  forceDisplay?: boolean;
}
```

### DashboardContentUpdate

```typescript
{
  type: AppToCloudMessageType.DASHBOARD_CONTENT_UPDATE;
  content: string;
  modes?: DashboardMode[];
}
```

## Cloud-to-App Messages

### ConnectionAck (TPA)

Connection acknowledgment with user settings.

### ConnectionError (TPA)

Connection error with error details.

### AppStopped

Session termination notice.

### SettingsUpdate

Updated settings data.

### DataStream

Wrapper for stream data (transcription, translation, audio chunks, etc.).

### DashboardModeChanged

Dashboard mode transition notifications.

## Stream Data Messages

- **TranscriptionData**: Transcription results with finality flags
- **TranslationData**: Translation results
- **AudioChunk**: Raw audio data with sample rates

## Type Guard Functions

The SDK provides type guard functions to identify specific message types and automatically handles message dispatch.

## WebSocket Connection Flow

1. Initialization (CONNECTION_INIT)
2. Authentication (CONNECTION_ACK)
3. Stream subscription (SUBSCRIPTION_UPDATE)
4. Data delivery (DATA_STREAM)
5. Session termination (APP_STOPPED)

## Message Type Enums

- `AppToCloudMessageType` - Messages from apps to cloud
- `CloudToAppMessageType` - Messages from cloud to apps
- `GlassesToCloudMessageType` - Messages from glasses to cloud
- `CloudToGlassesMessageType` - Messages from cloud to glasses

See [enums.md](./enums.md) for complete enum values.
