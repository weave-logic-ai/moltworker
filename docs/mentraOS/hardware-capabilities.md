# Hardware and Capabilities

> Source: https://docs.mentraglass.com/app-devs/core-concepts/hardware-capabilities/overview
> Source: https://docs.mentraglass.com/app-devs/core-concepts/hardware-capabilities/device-capabilities
> Source: https://docs.mentraglass.com/app-devs/core-concepts/hardware-capabilities/camera-glasses
> Source: https://docs.mentraglass.com/app-devs/core-concepts/hardware-capabilities/display-glasses
> Source: https://docs.mentraglass.com/app-devs/reference/interfaces/capabilities

## Overview

Different glasses have different features -- displays, cameras, speakers, buttons, LEDs. Developers should check `session.capabilities` within the `onSession` method to identify device features and adapt accordingly.

## Capability Detection

The system provides boolean flags for each hardware component along with detailed specification objects when those features exist.

```typescript
if (session.capabilities?.hasDisplay) {
  session.layouts.showTextWall("Hello!");
} else {
  await session.audio.speak("Hello!");
}
```

## Device Types

### Display Glasses

**Even Realities G1**: Green monochrome display, 640x200 resolution, microphone support. No camera, no speaker (audio plays through phone).

**Vuzix Z100**: Monochrome display. No microphone, no camera.

Both devices support text-based layouts. Keep text concise and adapt layouts based on available screen space.

### Camera Glasses

**Mentra Live**: No display. Features 1080p camera with streaming, microphone with voice activity detection, speaker output, programmable buttons (press, double-press, long-press), RGB and white privacy LEDs, WiFi connectivity, IMU sensors.

For camera glasses, design audio-first interactions. Speak instead of showing text. Use LED indicators for visual feedback. WiFi enables streaming without phone tethering.

## Capabilities Interface

```typescript
interface Capabilities {
  modelName: string;
  hasCamera: boolean;
  hasDisplay: boolean;
  hasMicrophone: boolean;
  hasSpeaker: boolean;
  hasButton: boolean;
  hasLight: boolean;     // LEDs
  hasIMU: boolean;
  hasWifi: boolean;
  camera?: CameraCapabilities;
  display?: DisplayCapabilities;
  microphone?: MicrophoneCapabilities;
  speaker?: SpeakerCapabilities;
  imu?: IMUCapabilities;
  button?: ButtonCapabilities;
  light?: LightCapabilities;
  power?: PowerCapabilities;
}
```

### CameraCapabilities

```typescript
interface CameraCapabilities {
  resolution: string;     // e.g., "1080p"
  hasHDR: boolean;
  hasAutofocus: boolean;
  hasVideoRecording: boolean;
  hasStreaming: boolean;
}
```

### DisplayCapabilities

```typescript
interface DisplayCapabilities {
  displayCount: number;
  hasColor: boolean;
  resolution: string;     // e.g., "640x200"
  fieldOfView: number;
  hasBrightnessAdjust: boolean;
  maxTextLines?: number;
}
```

### MicrophoneCapabilities

```typescript
interface MicrophoneCapabilities {
  microphoneCount: number;
  hasVAD: boolean;        // Voice Activity Detection
}
```

### SpeakerCapabilities

```typescript
interface SpeakerCapabilities {
  speakerCount: number;
  isPrivate: boolean;     // bone conduction
}
```

### IMUCapabilities

```typescript
interface IMUCapabilities {
  hasAccelerometer: boolean;
  hasGyroscope: boolean;
  hasCompass: boolean;
}
```

### ButtonCapabilities

```typescript
interface ButtonCapabilities {
  buttonTypes: string[];        // e.g., ["press", "swipe1d", "swipe2d"]
  supportedEventTypes: string[];
}
```

### LightCapabilities

```typescript
interface LightCapabilities {
  lights: Array<{
    id: string;
    purpose: string;
    isFullColor: boolean;
    color?: string;
    position?: string;
  }>;
}
```

### PowerCapabilities

```typescript
interface PowerCapabilities {
  hasExternalBattery: boolean;
}
```

## Device Comparison

| Feature | Even Realities G1 | Vuzix Z100 | Mentra Live |
|---|---|---|---|
| Display | Green monochrome, 640x200 | Monochrome | None |
| Camera | None | None | 1080p, streaming |
| Microphone | Yes | No | Yes (with VAD) |
| Speaker | No (phone audio) | No | Yes |
| Buttons | Yes | No | Yes (multi-press) |
| LEDs | None | None | RGB + white |
| IMU | No | No | Yes |
| WiFi | No | No | Yes |

## Best Practices

- Always check capabilities before using features
- Provide fallback interactions for missing features
- Handle null values gracefully
- Use visual modes on display devices, audio modes on devices with speakers only
- Test on actual hardware since display sizes vary and text may render differently than expected
