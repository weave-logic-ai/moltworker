# Webhook Types Reference

> Source: https://docs.mentraglass.com/app-devs/reference/interfaces/webhook-types

## Overview

MentraOS Cloud sends webhooks to App servers to manage lifecycle events. The SDK provides type guard functions for manual processing, though `AppServer` typically manages this automatically.

## Webhook Request Types

### SessionWebhookRequest

Initiates new App sessions, containing the WebSocket URL for connection. Triggers `AppServer.onSession()`.

### StopWebhookRequest

Terminates sessions with reasons:
- `user_disabled`
- `system_stop`
- `error`

Triggers `AppServer.onStop()`.

### ServerRegistrationWebhookRequest

Confirms successful App server registration, providing registration ID, package name, and associated URLs.

### SessionRecoveryWebhookRequest

Handles reconnection scenarios when cloud services restart or detect disconnections.

### ServerHeartbeatWebhookRequest

Periodic health checks requiring successful responses.

## Response Structure

All webhooks expect a response containing:

```json
{
  "status": "success",
  "message": "optional message"
}
```

Or on error:

```json
{
  "status": "error",
  "message": "error description"
}
```

## Type Guard Functions

```typescript
isSessionWebhookRequest(req): boolean
isStopWebhookRequest(req): boolean
isServerRegistrationWebhookRequest(req): boolean
isSessionRecoveryWebhookRequest(req): boolean
isServerHeartbeatWebhookRequest(req): boolean
```

## Webhook Flow

1. Server registration
2. Registration confirmation
3. Periodic heartbeats
4. Session initialization upon user request
5. Termination when appropriate
6. Recovery attempts if disconnections occur
