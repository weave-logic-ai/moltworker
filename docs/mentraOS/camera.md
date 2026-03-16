# Camera

> Source: https://docs.mentraglass.com/app-devs/core-concepts/camera/README
> Source: https://docs.mentraglass.com/app-devs/core-concepts/camera/photo-capture
> Source: https://docs.mentraglass.com/app-devs/core-concepts/camera/rtmp-streaming
> Source: https://docs.mentraglass.com/app-devs/reference/managers/camera

## Overview

The Camera Module enables photo capture and video streaming from smart glasses. Two primary features are available:

- **Photo Capture**: Request individual photos on demand with options to save to device gallery or access raw image data
- **RTMP Streaming**: Managed (zero-infrastructure) or unmanaged (full RTMP control) video streaming

**Requirements**: CAMERA permission. Always notify users when camera is active.

## Photo Capture

```typescript
const photo = await session.camera.requestPhoto();
```

### Size Options

- **small**: Faster to capture and transfer, lower resolution
- **medium**: Default option
- **large**: Highest available resolution, slower performance

### PhotoData Interface

The returned data includes buffer access, MIME type, filename, request ID, size metrics, and capture timestamps.

### Compression Handling

- Webhook uploads: JPEG format with dimension scaling (50-85% size reduction)
- Bluetooth transfers: Ultra-aggressive AVIF compression (10-15KB files) as fallback

## RTMP Streaming

MentraOS supports two streaming modes: managed streaming (cloud-orchestrated) and unmanaged streaming (direct RTMP to your endpoint).

### Managed Streaming

Managed streaming delegates ingest and playback to the MentraOS cloud. The SDK requests a stream, and the cloud returns viewer URLs (HLS/DASH, optional WebRTC). Multiple apps can consume the same managed stream concurrently.

- Requires internet connectivity
- Non-exclusive camera access (cooperative with other MentraOS apps)
- Playback URLs become usable when status is "active"

#### Reference

- Method: `session.camera.startManagedStream(options?: ManagedStreamOptions): Promise<ManagedStreamResult>`
- Stop: `session.camera.stopManagedStream(): Promise<void>`
- Status events: `session.camera.onManagedStreamStatus(handler)`

#### Types

```typescript
interface ManagedStreamOptions {
  quality?: "720p" | "1080p";
  enableWebRTC?: boolean;
  restreamDestinations?: { url: string; name?: string }[];
}

interface ManagedStreamResult {
  hlsUrl: string;
  dashUrl: string;
  webrtcUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  streamId: string;
}
```

#### Managed Stream URLs

- `hlsUrl`: HTTP Live Streaming (HLS) manifest. Broadest player support; recommended default.
- `dashUrl`: MPEG-DASH manifest. Alternative adaptive streaming format.
- `webrtcUrl`: Low-latency playback endpoint (when `enableWebRTC` is true).
- `previewUrl`: Hosted player page for quick testing and embedding.
- `thumbnailUrl`: Static/periodic thumbnail image for previews.

#### Usage

```typescript
// Subscribe to status BEFORE starting
const unsubscribe = session.camera.onManagedStreamStatus((status) => {
  if (status.status === "active") {
    console.log("HLS:", status.hlsUrl);
    console.log("DASH:", status.dashUrl);
    if (status.webrtcUrl) console.log("WebRTC:", status.webrtcUrl);
  } else if (status.status === "error") {
    console.error("Managed stream error:", status.message);
  }
});

const urls = await session.camera.startManagedStream({
  quality: "720p",
  enableWebRTC: true,
});

// Note: urls returned immediately, but viewers should connect only after
// status event reports status === "active".

await session.camera.stopManagedStream();
unsubscribe();
```

**Status values**: `"initializing"` | `"preparing"` | `"active"` | `"stopping"` | `"stopped"` | `"error"`

- Do not present URLs to viewers until status is "active"
- Treat `error` as non-recoverable for the current attempt; retry with `startManagedStream()` again

### Unmanaged Streaming

Direct RTMP connection from the device to your RTMP endpoint. You control ingest, transcoding, and distribution.

- Works with local or custom RTMP servers
- Exclusive camera access while active
- You manage endpoint availability, retries, and distribution

#### Reference

- Method: `session.camera.startStream(options: RtmpStreamOptions): Promise<void>`
- Stop: `session.camera.stopStream(): Promise<void>`
- Status events: `session.camera.onStreamStatus(handler)`

#### Types

```typescript
interface RtmpStreamOptions {
  rtmpUrl: string;  // e.g., rtmp://your-server.com/live/key
}
```

#### Usage

```typescript
const cleanup = session.camera.onStreamStatus((status) => {
  console.log("RTMP status:", status.status);
  if (status.status === "active") {
    console.log("Streaming to:", session.camera.getCurrentStreamUrl());
  }
  if (status.status === "error") {
    console.error(status.errorDetails);
  }
});

await session.camera.startStream({
  rtmpUrl: "rtmp://your-server.com/live/stream-key",
});

await session.camera.stopStream();
cleanup();
```

### When to Use Each

- **Managed**: Turnkey ingest and globally accessible playback URLs, cooperative camera access, cloud-managed resilience
- **Unmanaged**: Custom/local RTMP endpoint, full control of ingest and distribution, operate without managed pipeline

### Operational Notes

- Only one unmanaged stream can run at a time per device and it blocks managed streams while active
- Managed streams allow multiple apps to consume the same device feed

## Checking for Existing Streams

```typescript
async checkExistingStream(): Promise<{
  hasActiveStream: boolean;
  streamInfo?: {
    type: "managed" | "unmanaged";
    streamId: string;
    status: string;
    createdAt: Date;
    // For managed streams
    hlsUrl?: string;
    dashUrl?: string;
    webrtcUrl?: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    activeViewers?: number;
    // For unmanaged streams
    rtmpUrl?: string;
    requestingAppId?: string;
  };
}>
```

Example:
```typescript
const result = await session.camera.checkExistingStream();

if (!result.hasActiveStream) {
  await session.camera.startManagedStream();
  return;
}

if (result.streamInfo?.type === "managed") {
  console.log("HLS:", result.streamInfo.hlsUrl);
} else {
  console.log("Active RTMP:", result.streamInfo?.rtmpUrl);
}
```

Notes:
- Managed streams support multiple apps; calling `startManagedStream()` will join the existing managed stream
- Unmanaged streams are exclusive and block other streams until stopped

## FAQ

- **How do I know when managed stream URLs are usable?** Subscribe to `onManagedStreamStatus` and wait for `status === "active"`
- **Can I re-stream to YouTube or Twitch?** Yes, provide `restreamDestinations` in `ManagedStreamOptions`
- **How do I check for existing stream after app restart?** Call `session.camera.checkExistingStream()`
- **Does managed streaming require internet?** Yes. Unmanaged can work on local networks.
- **Can I enable low-latency viewing?** Set `enableWebRTC: true` and use `webrtcUrl` for playback
