# Permissions

> Source: https://docs.mentraglass.com/app-devs/core-concepts/permissions

## Key Permissions Available

The platform offers seven primary permissions:

- **MICROPHONE**: Enables voice input and audio processing for transcription
- **LOCATION**: Provides GPS coordinates for location tracking
- **BACKGROUND_LOCATION**: Allows tracking when the app is inactive
- **CAMERA**: Unlocks photo capture and video streaming capabilities
- **CALENDAR**: Grants access to calendar events
- **READ_NOTIFICATIONS**: Allows filtering of phone notifications
- **POST_NOTIFICATIONS**: Enables push notification delivery

## Implementation Process

Developers declare permissions through the Developer Console rather than implementing permission checks in code. The cloud infrastructure automatically enforces these declarations and blocks unauthorized access attempts.

The workflow involves:

1. Declaring permissions in the Developer Console
2. Providing clear user-facing descriptions
3. Allowing users to approve access during installation or through device settings

## How It Works

The system operates on a straightforward model:

- Developers declare needed permissions in the Developer Console
- Users approve them during installation
- The cloud infrastructure automatically enforces restrictions

Just declare permissions, SDK handles the rest -- no runtime permission checking code is required.

## Enforcement Mechanism

When permissions are properly declared and approved, event streams function normally. Without proper declaration or user approval, the SDK logs warnings and events don't fire, preventing unauthorized data access.

## Best Practices

- Request only what you need -- this encourages user installation
- Provide clear, descriptive explanations rather than generic labels
  - Good: "To transcribe voice commands and provide hands-free control"
  - Bad: "Microphone access"
- The platform handles all enforcement automatically, eliminating the need for developers to implement permission checks themselves
