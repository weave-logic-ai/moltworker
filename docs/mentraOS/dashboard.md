# Dashboard

> Source: https://docs.mentraglass.com/app-devs/core-concepts/display/dashboard
> Source: https://docs.mentraglass.com/app-devs/reference/dashboard-api

> Persistent status display for glanceable information

The dashboard provides persistent UI that appears when users look up. Use it for status updates and notifications that don't require full attention.

## Basic Usage

```typescript
session.dashboard.content.writeToMain('New message received');
```

With title and content:

```typescript
session.dashboard.content.writeToMain('App Status\nConnected and running');
```

## Dashboard Modes

### Main Mode (Default)

```typescript
session.dashboard.content.writeToMain('Status: Active');
```

### Expanded Mode

More detailed information:

```typescript
session.dashboard.content.writeToExpanded('Detailed status information here');
```

## Clearing Dashboard

```typescript
session.dashboard.content.writeToMain('');
```

## Best Practices

**Use for background info:**

```typescript
// Good - status updates
session.dashboard.content.writeToMain('3 unread messages');

// Avoid - main app content (use layouts for this instead)
session.dashboard.content.writeToMain('Welcome! Here is a long message...');
```

**Keep updates brief:**

```typescript
// Good
session.dashboard.content.writeToMain('Recording: 1:23');

// Avoid
session.dashboard.content.writeToMain(
  'You have been recording for 1 minute and 23 seconds'
);
```

**Updates are auto-throttled** (1 every 300ms):

```typescript
session.events.onTranscription((data) => {
  if (data.isFinal) {
    session.dashboard.content.writeToMain(`Message: ${data.text}`);
  }
});
```

## Common Patterns

### Status Updates

```typescript
session.events.onTranscription(async (data) => {
  if (data.isFinal) {
    session.layouts.showTextWall(data.text);
    session.dashboard.content.writeToMain('Processing...');
    const response = await processInput(data.text);
    session.layouts.showTextWall(response);
    session.dashboard.content.writeToMain('');
  }
});
```

### Real-Time Counters

```typescript
let messageCount = 0;

session.events.onTranscription((data) => {
  if (data.isFinal) {
    messageCount++;
    session.layouts.showTextWall(data.text);
    session.dashboard.content.writeToMain(`Messages: ${messageCount}`);
  }
});
```

### Recording Status

```typescript
let recordingStartTime: number;
let recordingInterval: NodeJS.Timeout;

function startRecording(session: AppSession) {
  recordingStartTime = Date.now();
  recordingInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    session.dashboard.content.writeToMain(
      `Recording: ${minutes}:${seconds.toString().padStart(2, '0')}`
    );
  }, 1000);
}

function stopRecording(session: AppSession) {
  clearInterval(recordingInterval);
  session.dashboard.content.writeToMain('');
}
```

### Notification Counts

```typescript
let notificationCount = 0;

session.events.onPhoneNotification((data) => {
  if (['Messages', 'Email'].includes(data.app)) {
    notificationCount++;
    session.dashboard.content.writeToMain(`${notificationCount} notifications`);
  }
});
```

## Dashboard API

| Method | Description |
|---|---|
| `content.writeToMain(text)` | Update main dashboard |
| `content.writeToExpanded(text)` | Update expanded dashboard |
| `content.write(text, modes)` | Update specific modes |
| `content.onModeChange(callback)` | Listen for mode changes |

Dashboard updates are automatically throttled to 1 per 300ms by MentraOS Cloud to prevent display desync.

## DashboardMode Enum

```typescript
enum DashboardMode {
  MAIN = 'main'
}
```

## DashboardContentAPI Class

```typescript
class DashboardContentAPI {
  constructor(
    private wsConnection: WebSocketConnection,
    private packageName: string
  )
}
```

### write

```typescript
write(content: string): void
```

### writeToMain

```typescript
writeToMain(content: string): void
```

## Content Guidelines

### Character Limits

Keep content under **60 characters** to avoid truncation.

```typescript
// Good length
session.dashboard.content.writeToMain('Build complete');

// Too long
session.dashboard.content.writeToMain('Build completed successfully with all tests passing and no errors found');
```

### Content Replacement

The dashboard keeps only the **latest** message per app. Writing a new message automatically replaces your previous one.

## Message Types (Advanced)

| Message | `type` value | Sent By | Purpose |
|---|---|---|---|
| `DashboardContentUpdate` | `dashboard_content_update` | App | Send new content |
| `DashboardModeChange` | `dashboard_mode_change` | MentraOS | Notify of mode transitions |
| `DashboardModeQuery` | `dashboard_mode_query` | App | Request current mode |

## When to Use Dashboard vs Layouts

| Use Case | Dashboard | Layouts |
|---|---|---|
| Main app content | No | Yes |
| Status updates | Yes | No |
| Notifications | Yes | No |
| User input/output | No | Yes |
| Persistent info | Yes | No |
| Detailed content | No | Yes |
