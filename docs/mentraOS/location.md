# Location

> Source: https://docs.mentraglass.com/app-devs/core-concepts/location
> Source: https://docs.mentraglass.com/app-devs/reference/managers/location-manager

## Overview

The MentraOS Location API enables developers to access GPS coordinates through the `LocationManager` to build location-aware applications on smart glasses.

**Requires**: LOCATION permission configured in the Developer Console at console.mentra.glass.

## Core Methods

### subscribeToStream

Receive continuous location updates as the user moves.

```typescript
session.location.subscribeToStream({}, (data) => {
  console.log(`Location: ${data.lat}, ${data.lng}`);
  if (data.accuracy) {
    console.log(`Accuracy: ${data.accuracy} meters`);
  }
});
```

Returns an unsubscribe function for cleanup.

### getLatestLocation

Request a single location fix with a 15-second timeout. Intelligently reuses active streams or cached data before activating GPS hardware.

```typescript
const location = await session.location.getLatestLocation({});
```

Ideal for tasks like weather checks or photo tagging.

### unsubscribeFromStream

Stop receiving location updates, allowing system battery optimization.

```typescript
await session.location.unsubscribeFromStream();
```

## Accuracy Options

Seven accuracy tiers are available, from highest to lowest precision:

| Tier | Use Case | Battery Impact |
|---|---|---|
| `realtime` | Turn-by-turn navigation | Highest |
| High precision tiers | Real-time tracking | High |
| Medium tiers | General location apps | Medium |
| Low precision tiers | Regional features | Low |
| `reduced` | Minimal location needs | Lowest |

Select the lowest accuracy tier meeting your app's requirements to optimize battery life. `realtime` accuracy drains battery rapidly and should be reserved for navigation or real-time tracking scenarios.

## Key Data Fields

Location updates include:

- `lat`: Latitude
- `lng`: Longitude
- `accuracy`: Accuracy in meters
- `timestamp`: When the location was captured
- `altitude` (optional)
- `correlationId` (optional)

## Best Practices

- Subscribe to location streams in session handlers
- Unsubscribe during disconnect events
- Always handle poll timeouts that occur after 15 seconds
- Monitor accuracy values during updates
- Select appropriate accuracy tiers based on use case
