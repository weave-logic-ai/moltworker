# MentraOS Overview

> Source: https://docs.mentraglass.com/app-devs/getting-started/overview

"Build production ready smart glasses apps in minutes."

## How MentraOS Functions

MentraOS serves as the operating system for smart glasses, enabling third-party applications. Users download the Mentra application on their mobile device, pair their glasses, and run various apps. Developers create installable applications accessible through web links or the Mentra Store. These applications operate in cloud environments with reduced latency connections to smart glasses hardware, allowing developers to invoke functions for image capture, microphone input access, and display output.

## Key Advantages

MentraOS offers several benefits:

- **Universal** - Compatible with glasses from Vuzix, Even Realities, Mentra, and upcoming 2026 models
- **Powerful** - Supports audio, camera, display, sensors, and AI features
- **Simple** - Server-side development using standard web frameworks
- **Open Source** - Industry-standard open platform

## Sample Application Code

```typescript
import { AppServer } from '@mentra/sdk';

class MyApp extends AppServer {
  protected async onSession(session, sessionId, userId) {
    session.layouts.showTextWall("Hello World from MentraOS!");

    session.events.onTranscription((data) => {
      console.log(`User said: ${data.text}`);
    });
  }
}

const app = new MyApp({
  packageName: 'com.example.myapp',
  apiKey: process.env.MENTRA_API_KEY,
  port: 3000
});

app.start();
```

## Application Capabilities

This demonstration app performs three functions: connects to user glasses upon app launch, displays text output on the eyeglasses screen, and records spoken input to the server logs.

## Potential Use Cases

Developers have created fitness coaching applications, captioning solutions for accessibility, industrial inspection systems, and streaming platforms for content creators.

## Getting Started

New developers should consult the Quickstart guide in the app-devs/getting-started section.
