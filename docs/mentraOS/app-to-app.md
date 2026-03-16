# App-to-App Communication

> Source: https://cloud-docs.mentra.glass/sdk/event-handlers (multi-user events)
> Source: https://cloud-docs.mentra.glass/cloud-overview/sdk-integration (multi-user patterns)

## Overview

MentraOS supports multi-user communication between app instances, enabling collaborative and social features across glasses users.

## Multi-User Events

### Listen for Messages from Other Users

```typescript
session.events.onAppMessage((message) => {
  console.log(`From ${message.senderUserId}: ${message.payload}`);
});
```

### User Joined/Left Events

```typescript
session.events.onAppUserJoined((userId) => {
  console.log(`${userId} joined`);
});

session.events.onAppUserLeft((userId) => {
  console.log(`${userId} left`);
});
```

## Sending Messages

### Broadcast to All App Users

```typescript
await session.broadcastToAppUsers({
  type: 'cursor_move',
  x: 100,
  y: 200
});
```

### Direct Message to Specific User

```typescript
await session.sendDirectMessage('user@example.com', {
  type: 'private_note',
  text: 'Check this out!'
});
```

### Discover Active Users

```typescript
const activeUsers = await session.discoverAppUsers();
```

## Common Patterns

### Collaborative App

```typescript
// Track all connected users
const users = new Map<string, UserState>();

session.events.onAppUserJoined((userId) => {
  users.set(userId, { joined: Date.now() });
});

session.events.onAppUserLeft((userId) => {
  users.delete(userId);
});

session.events.onAppMessage((message) => {
  // Handle incoming messages from other users
  switch (message.payload.type) {
    case 'cursor_move':
      updateCursor(message.senderUserId, message.payload);
      break;
    case 'private_note':
      showNote(message.payload.text);
      break;
  }
});
```

### Real-time Sharing

Broadcast state changes to all connected users for synchronized experiences across multiple glasses.
