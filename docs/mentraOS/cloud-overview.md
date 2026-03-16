# Cloud Overview

> Source: https://cloud-docs.mentra.glass/cloud-overview/introduction
> Source: https://cloud-docs.mentra.glass/cloud-overview/authentication-flow
> Source: https://cloud-docs.mentra.glass/cloud-overview/message-types

## Introduction

MentraOS connects four interconnected components:

- **Smart glasses**: Input/output devices that capture sensory data (audio, video, photos) and display content, operating with limited processing capacity
- **Mobile app**: Computational bridge that authenticates users, manages Bluetooth connectivity, and maintains WebSocket connections to cloud infrastructure
- **Cloud services**: Oversee session management, message routing, and core services including transcription and translation
- **Third-party applications**: Integrate through provided SDK, subscribe to relevant events, and deliver content to users' displays

### Data Flow

User audio input through glasses -> phone transmission -> cloud transcription -> app processing -> response delivery -> glasses display output.

### Key Features

- Real-time communication capabilities
- Resilient session management that persists across disconnections
- Modular component architecture
- Straightforward developer integration tools
- User-controlled data access permissions

## Authentication Flow

### Initial Login

Users authenticate via email/password to receive a `coreToken` JWT containing their email, expiration time, and issuance timestamp.

### WebSocket Connection

The mobile app establishes a connection to `wss://cloud.mentraos.com/glasses-ws` by sending the coreToken in the Authorization header.

### Handshake Process

1. Cloud's WebSocketService extracts and verifies the JWT
2. GlassesWebSocketService creates or retrieves a UserSession
3. Cloud sends CONNECTION_ACK response

### Session Initialization

1. Mobile app sends CONNECTION_INIT (within 30 seconds)
2. Cloud responds with CONNECTION_ACK including sessionId and partial UserSession details (active apps, subscriptions)

### Heartbeat Mechanism

Every 10 seconds, the cloud sends a ping to check if the connection is alive.

### Reconnection Handling

- **Within 30 seconds**: UserSession persists; reconnection uses the same token
- **After 30 seconds**: New UserSession created; previous state lost

### Security Features

- JWT signature validation
- Token expiration checks
- Per-user session isolation
- One active glasses connection per user limit

## Message Types

Everything happens through messages in MentraOS Cloud, functioning as conversations between glasses, cloud, and apps.

### Communication Pathways

**Glasses-to-Cloud** (`GlassesToCloudMessageType`):
- Connection initialization
- User actions (button presses, head movements)
- App control commands
- Media events
- System status updates
- Location data

**Cloud-to-Glasses** (`CloudToGlassesMessageType`):
- Connection acknowledgments
- Display updates using specific layout types
- Media requests for photos or audio
- Settings modifications

**Apps-to-Cloud** (`AppToCloudMessageType`):
- Connection setup
- Subscription requests for specific data streams
- Display requests with various layout options
- Media operations

**Cloud-to-Apps** (`CloudToAppMessageType`):
- Connection confirmations
- Data streams for subscribed events
- System notifications

### Key Patterns

**Request-Response**: Enables tracking through matching request IDs, allowing glasses to respond to cloud requests with corresponding identifiers.

**Subscription Model**: Apps receive only subscribed data types, ranging from hardware streams (button presses, head position) to audio streams (transcription, translation) to system streams (app lifecycle events).

**Fire-and-Forget**: Applies to informational messages like display updates and status notifications requiring no responses.

All message types are defined in the SDK's TypeScript source files within the packages directory.
