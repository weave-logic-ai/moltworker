# LED Control

> Source: https://docs.mentraglass.com/app-devs/core-concepts/led/overview
> Source: https://docs.mentraglass.com/app-devs/reference/managers/led-manager

> RGB LED control on smart glasses for notifications, status indicators, and user feedback

## Overview

LEDs provide immediate visual feedback to users and can indicate app status, notifications, or recording states. Different device models support varying LED configurations -- some feature RGB LEDs, others only white LEDs, and some lack LED support entirely.

Always check `session.capabilities?.hasLight` before using LED features to ensure compatibility across different devices.

## Device Compatibility

| Device | LED Support | LED Types | Colors Available |
|---|---|---|---|
| **Mentra Live** | Yes | RGB + White | All colors |
| **Even Realities G1** | No | None | N/A |
| **Vuzix Z100** | No | None | N/A |

## LedColor Type

```typescript
type LedColor = "red" | "green" | "blue" | "orange" | "white";
```

## LedControlOptions

```typescript
interface LedControlOptions {
  color?: LedColor;
  ontime?: number;     // LED on duration in milliseconds
  offtime?: number;    // LED off duration in milliseconds
  count?: number;      // Number of on/off cycles
}
```

## Methods

### turnOn

Turn on an LED with specified timing parameters. Fire-and-forget (resolves immediately).

```typescript
async turnOn(options: LedControlOptions): Promise<void>
```

```typescript
// Solid red LED for 2 seconds
await session.led.turnOn({ color: 'red', ontime: 2000, count: 1 });

// Blink white LED 3 times
await session.led.turnOn({ color: 'white', ontime: 500, offtime: 500, count: 3 });

// Control LED with specific timing
await session.led.turnOn({ color: 'green', ontime: 1000 });
```

### turnOff

Turn off all LEDs on the connected glasses.

```typescript
async turnOff(): Promise<void>
```

### blink

Blink an LED with specified timing.

```typescript
async blink(color: LedColor, ontime: number, offtime: number, count: number): Promise<void>
```

```typescript
// Blink red LED 5 times (500ms on, 500ms off)
await session.led.blink('red', 500, 500, 5);

// Quick notification blink
await session.led.blink('green', 200, 200, 2);

// Slow warning blink
await session.led.blink('orange', 1000, 1000, 3);
```

### solid

LED stays on continuously for specified duration.

```typescript
async solid(color: LedColor, duration: number): Promise<void>
```

```typescript
// Solid red LED for 5 seconds
await session.led.solid('red', 5000);

// Recording indicator
await session.led.solid('white', 30000);
```

### getCapabilities

Get available LED capabilities for the current device.

```typescript
getCapabilities(): Array<{
  id: string;
  purpose: string;
  isFullColor: boolean;
  color?: string;
  position?: string;
}>
```

```typescript
const capabilities = session.led.getCapabilities();
const hasRGB = capabilities.some(led => led.isFullColor);
if (hasRGB) {
  await session.led.turnOn({ color: 'blue', ontime: 1000 });
}
```

## Best Practices

### Always Check Device Capabilities

```typescript
if (!session.capabilities?.hasLight) {
  session.logger.warn("LED control requested but device has no LED support");
  session.layouts.showTextWall("Notification");
  return;
}

const lights = session.capabilities.light?.lights || [];
const hasFullColorLed = lights.some(light => light.isFullColor);
const hasWhiteLed = lights.some(light => !light.isFullColor && light.color === "white");

if (hasFullColorLed) {
  await session.led.turnOn({ color: 'blue', ontime: 1000 });
} else if (hasWhiteLed) {
  await session.led.turnOn({ color: 'white', ontime: 1000 });
}
```

### Use Semantic Colors

```typescript
await session.led.blink('green', 500, 500, 3);  // Success
await session.led.blink('red', 500, 500, 3);    // Error
await session.led.blink('orange', 500, 500, 3); // Warning
await session.led.solid('white', 5000);          // Recording
```

### Provide Graceful Fallbacks

```typescript
async function notifyUser(session: AppSession, message: string): Promise<void> {
  if (session.capabilities?.hasLight) {
    await session.led.blink('green', 500, 500, 2);
  } else {
    session.layouts.showTextWall(message);
  }
  await session.audio.speak(message);
}
```

### Don't Overuse LEDs

```typescript
// Good: Brief, meaningful feedback
await session.led.blink('green', 200, 200, 2);

// Avoid: Excessive blinking
await session.led.blink('red', 100, 100, 20);
```
