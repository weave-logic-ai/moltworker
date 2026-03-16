# Streaming

> Source: https://docs.mentraglass.com/app-devs/core-concepts/camera/rtmp-streaming

See the [Camera documentation](./camera.md) for complete RTMP streaming details.

## Overview

MentraOS supports two streaming modes:

- **Managed streaming**: Cloud-orchestrated, returns HLS/DASH/WebRTC URLs. Zero infrastructure needed.
- **Unmanaged streaming**: Direct RTMP to your endpoint. Full control but requires your own infrastructure.

## Quick Reference

### Start Managed Stream

```typescript
const unsubscribe = session.camera.onManagedStreamStatus((status) => {
  if (status.status === "active") {
    console.log("HLS:", status.hlsUrl);
    console.log("DASH:", status.dashUrl);
  }
});

const urls = await session.camera.startManagedStream({
  quality: "720p",
  enableWebRTC: true,
});
```

### Start Unmanaged Stream

```typescript
await session.camera.startStream({
  rtmpUrl: "rtmp://your-server.com/live/stream-key",
});
```

### Re-stream to Multiple Platforms

```typescript
await session.camera.startManagedStream({
  quality: "1080p",
  restreamDestinations: [
    { url: "rtmp://live.twitch.tv/app/your-key", name: "Twitch" },
    { url: "rtmp://a.rtmp.youtube.com/live2/your-key", name: "YouTube" }
  ]
});
```

### Check Existing Streams

```typescript
const result = await session.camera.checkExistingStream();
if (result.hasActiveStream) {
  console.log("Stream type:", result.streamInfo?.type);
}
```

### Stop Streams

```typescript
await session.camera.stopManagedStream();
// or
await session.camera.stopStream();
```

## Key Differences

| Feature | Managed | Unmanaged |
|---|---|---|
| Infrastructure | Cloud-handled | You provide |
| Camera access | Shared (cooperative) | Exclusive |
| Output formats | HLS, DASH, WebRTC | Raw RTMP |
| Multiple apps | Yes | No |
| Local network | No (requires internet) | Yes |
| Re-streaming | Built-in | Manual |

## Permissions

All streaming requires the CAMERA permission in your app configuration.
