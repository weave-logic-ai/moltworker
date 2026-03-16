# Notifications

> Source: https://docs.mentraglass.com/app-devs/core-concepts/permissions (notification permissions)
> Source: https://cloud-docs.mentra.glass/sdk/event-handlers (phone notification events)

## Phone Notification Events

Listen for phone notifications forwarded to the glasses:

```typescript
session.events.onPhoneNotifications((notifications) => {
  notifications.forEach(notification => {
    console.log(`${notification.app}: ${notification.title}`);
    console.log(`Content: ${notification.content}`);
  });
});
```

### PhoneNotification Data

Notification data includes:

- `app`: Name of the app that sent the notification
- `title`: Notification title
- `content`: Notification body content
- `priority`: Priority level

## Permissions Required

- **READ_NOTIFICATIONS**: Allows filtering and reading of phone notifications
- **POST_NOTIFICATIONS**: Enables push notification delivery to the user

These must be declared in the Developer Console. The cloud infrastructure automatically enforces these declarations.

## Notification Dismissed Event

Track when notifications are dismissed:

```typescript
// StreamType.NOTIFICATION_DISMISSED
```

## Common Patterns

### Notification Filtering

```typescript
session.events.onPhoneNotifications((notifications) => {
  const importantApps = ['Messages', 'Email', 'Slack'];

  notifications
    .filter(n => importantApps.includes(n.app))
    .forEach(notification => {
      session.dashboard.content.writeToMain(
        `${notification.app}: ${notification.title}`
      );
    });
});
```

### Notification Counter

```typescript
let count = 0;

session.events.onPhoneNotification((data) => {
  count++;
  session.dashboard.content.writeToMain(`${count} notifications`);
});
```
