# Getting Started with the MentraOS SDK

> Source: https://cloud-docs.mentra.glass/sdk/getting-started

## Installation

Install the MentraOS SDK using Bun:

```bash
bun add @mentraos/sdk
```

## Basic Concepts

The MentraOS SDK provides two main classes:

**AppServer** - Base class you extend to create your app server. Handles webhook registration and session lifecycle.

**AppSession** - Manages the connection to a specific user session. Created automatically when users start your app.

**Important Note**: Apps should extend `AppServer` and override the `onSession` method. The sessionId parameter follows the format `"userId-packageName"` (e.g., `"user@example.com-com.example.app"`).

## Creating an App Server

```typescript
import { AppServer, AppSession } from '@mentraos/sdk';

class MyAppServer extends AppServer {
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    console.log(`New session ${sessionId} for user ${userId}`);
  }
}

const server = new MyAppServer({
  packageName: 'com.yourcompany.yourapp',
  apiKey: process.env.MENTRAOS_API_KEY!,
  port: 3000,
  publicDir: './public'
});
```

## Handling Sessions

```typescript
protected async onSession(
  session: AppSession,
  sessionId: string,
  userId: string
): Promise<void> {
  console.log(`New session ${sessionId} for user ${userId}`);

  session.events.onTranscription((data) => {
    // Handle speech-to-text
  });

  session.events.onButtonPress((data) => {
    // Handle button presses
  });

  await session.layouts.showTextWall('Welcome!');
}
```

## Session Lifecycle

1. **User starts app** - User says "Start [app name]" or taps in the mobile app
2. **Cloud sends webhook** - MentraOS Cloud sends a webhook to your server
3. **Session created** - Your `onSession` handler is called with an AppSession
4. **Real-time connection** - AppSession connects via WebSocket for real-time data
5. **Session ends** - User stops app or connection is lost

## TypeScript Support

```typescript
import {
  AppServer,
  AppSession,
  TranscriptionData,
  ButtonPress,
  PhotoData,
  LocationUpdate
} from '@mentraos/sdk';
```

## Environment Variables

```bash
MENTRAOS_API_KEY=your_api_key_here
PORT=3000
LOG_LEVEL=info
```

## Project Structure

```
my-mentraos-app/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── handlers/
│   └── utils/
├── public/
├── .env
├── package.json
├── tsconfig.json
└── bun.lockb
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": false,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Next Steps

Related documentation sections: AppSession Reference, Event Handlers, Display Layouts, Hardware Modules
