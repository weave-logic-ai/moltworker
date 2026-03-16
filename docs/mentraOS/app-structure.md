# App Lifecycle and Structure

> Source: https://docs.mentraglass.com/app-devs/core-concepts/app-lifecycle-overview
> Source: https://docs.mentraglass.com/app-devs/core-concepts/app-server
> Source: https://docs.mentraglass.com/app-devs/core-concepts/app-session/app-session

## App Lifecycle Overview

MentraOS apps follow a session-based lifecycle. When users launch an app on their glasses, the system creates an `AppSession` -- a unique connection representing that user's interaction with the app. The `AppServer` class serves as the foundation, handling webhooks from MentraOS Cloud and managing multiple concurrent user sessions.

### Core Lifecycle Flow

The process begins when a user initiates an app on their glasses, triggering a cloud request that sends a webhook POST to the application server. The server establishes a WebSocket connection, which the cloud confirms. During the active session, the system continuously forwards events (voice input, button presses) from the glasses to the server, displaying updated content in response. The session terminates when the user stops the app.

### Four Development Stages

**Registration** requires developers to set up their app in the Developer Console, specifying a package name, webhook URL, API key, and required permissions.

**Session Start** occurs when MentraOS Cloud delivers an HTTP POST containing sessionId and userId to the webhook endpoint, prompting server-side WebSocket initialization and connection confirmation.

**Active Session** enables event subscriptions, callback handling for incoming data, display updates through layouts, and device capability access.

**Session End** happens through user action, device disconnection, network issues, or server disconnection.

## AppServer

The AppServer is the foundational class for MentraOS applications. It handles webhooks, manages WebSocket connections, and routes sessions to your code.

### Core Responsibilities

- HTTP server for webhook reception from MentraOS Cloud
- WebSocket client maintaining cloud connectivity
- Session management creating individual AppSession instances per user
- Lifecycle event handling through onSession() and onStop() methods

### Essential Configuration

Three required settings are needed:

1. **packageName**: A reverse domain notation identifier (e.g., `com.example.myapp`) obtained from the Developer Console
2. **apiKey**: An authentication secret generated in the Developer Console; store in environment variables, never hardcode
3. **port**: The HTTP port where your server listens for incoming webhooks

### Key Methods

- **onSession()**: Triggered when a user launches your app
- **onStop()**: Called when a session terminates
- **onToolCall()**: Invoked when the AI assistant requests tool execution

### Multi-User Handling

Each user receives an isolated `AppSession` with their own unique sessionId, event subscriptions, and independent state management, enabling simultaneous user connections.

## AppSession

`AppSession` represents a single user's active connection to a MentraOS app. When a user launches your app on their glasses, the system creates a new `AppSession` with a unique identifier.

### Key Capabilities

The `AppSession` object provides access to:

- **Events** (`session.events`): Subscribe to data streams including voice transcriptions and button inputs
- **Layouts** (`session.layouts`): Manage what appears on the glasses display
- **Audio** (`session.audio`): Play sounds, synthesize speech, and capture voice input
- **Camera** (`session.camera`): Request photos or stream video
- **LED** (`session.led`): Control light indicators
- **Location** (`session.location`): Access GPS data
- **Dashboard** (`session.dashboard`): Display persistent status information
- **Storage** (`session.storage`): Save user preferences and data locally
- **Settings** (`session.settings`): Retrieve configuration from the developer console
- **Capabilities** (`session.capabilities`): Check available hardware features
- **Logger** (`session.logger`): Record structured logs with session context

### Session Lifecycle

Sessions follow a three-phase pattern: initialization when a user starts the app, active interaction while connected, and termination when the user stops the app or network issues occur. During initialization, your `onSession()` method receives three parameters: the session object, a unique session ID, and the user's ID (email).

### Isolation and Storage

Each user gets their own isolated AppSession and sessions maintain separate event subscriptions and display states. The `userId` remains constant if a user restarts the app, enabling persistent user identification across sessions.

### Best Practices

- Store session references in a map for tracking active users and cleanup
- Avoid sharing `AppSession` objects between different users
- Use the built-in logger for debugging since it automatically includes session context
