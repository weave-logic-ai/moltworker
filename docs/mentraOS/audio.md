# Audio

> Source: https://docs.mentraglass.com/app-devs/core-concepts/microphone/speech-to-text
> Source: https://docs.mentraglass.com/app-devs/core-concepts/microphone/audio-chunks
> Source: https://docs.mentraglass.com/app-devs/core-concepts/speakers/text-to-speech
> Source: https://docs.mentraglass.com/app-devs/core-concepts/speakers/playing-audio-files
> Source: https://docs.mentraglass.com/app-devs/reference/managers/audio-manager

## Speech-to-Text

Implement real-time speech-to-text transcription using `session.events.onTranscription()`. The system captures microphone input, processes it through MentraOS Cloud, and delivers both interim and final transcription results.

**Requires**: MICROPHONE permission configured in the Developer Console.

```typescript
session.events.onTranscription((data) => {
  console.log(`Text: ${data.text}`);
  console.log(`Final: ${data.isFinal}`);
  console.log(`Confidence: ${data.confidence}`);
});
```

**TranscriptionData fields:**

- `text`: The transcribed content
- `isFinal`: Boolean indicating completion status
- `language`: Language code (e.g., 'en-US')
- `confidence`: Score from 0-1
- `timestamp`: Generation time

Always check `isFinal` before processing commands, as processing interim results causes unnecessary repeated operations. For interim results requiring heavy processing, debounce operations with approximately 300ms delays.

## Audio Chunks

> Process raw audio data for custom speech recognition and analysis

### Basic Usage

```typescript
session.events.onAudioChunk((audioChunk: AudioChunk) => {
  const buffer = audioChunk.arrayBuffer;
  const sampleRate = audioChunk.sampleRate || 16000;
  session.logger.info('Received audio chunk:', buffer.byteLength, 'bytes at', sampleRate, 'Hz');
});
```

### AudioChunk Interface

```typescript
interface AudioChunk {
  type: StreamType.AUDIO_CHUNK;
  arrayBuffer: ArrayBufferLike;  // Raw audio data buffer
  sampleRate?: number;            // Sample rate (e.g., 16000 Hz)
  timestamp: Date;                // When chunk was received
}
```

**Audio Format:** Raw PCM audio data, Mono (1 channel). Convert to `Float32Array` for processing.

| Property | Type | Description |
|---|---|---|
| `arrayBuffer` | `ArrayBufferLike` | Raw audio data buffer |
| `sampleRate` | `number` (optional) | Sample rate in Hz (typically 16000) |
| `timestamp` | `Date` | When chunk was received |
| `type` | `StreamType.AUDIO_CHUNK` | Stream type identifier |

> Audio chunks are **advanced functionality**. For most apps, use `session.events.onTranscription()` instead.

### When to Use Audio Chunks

- Custom speech recognition (your own STT model)
- Voice analysis (VAD, pitch detection, emotion recognition, speaker identification)
- Audio effects (noise reduction, echo cancellation, voice enhancement)
- Recording (save audio for later processing)

### Working with Audio Data

#### Convert to Float32Array

```typescript
session.events.onAudioChunk((audioChunk: AudioChunk) => {
  const samples = new Float32Array(audioChunk.arrayBuffer);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]; // values typically between -1.0 and 1.0
  }
});
```

#### Calculate Audio Level

```typescript
function calculateRMS(audioChunk: AudioChunk): number {
  const samples = new Float32Array(audioChunk.arrayBuffer);
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

session.events.onAudioChunk((audioChunk: AudioChunk) => {
  const level = calculateRMS(audioChunk);
  if (level > 0.1) {
    session.logger.info('Voice detected, RMS level:', level.toFixed(3));
  }
});
```

### Recording Pattern

```typescript
class AudioRecorder {
  private chunks: ArrayBuffer[] = [];
  private isRecording = false;

  start(session: AppSession) {
    this.chunks = [];
    this.isRecording = true;
    session.events.onAudioChunk((chunk) => {
      if (this.isRecording) {
        this.chunks.push(chunk.arrayBuffer);
      }
    });
  }

  stop(): ArrayBuffer[] {
    this.isRecording = false;
    return this.chunks;
  }
}
```

### Performance Considerations

- Audio chunks arrive **many times per second** -- avoid expensive operations per chunk
- Queue for batch processing instead of per-chunk async operations
- Limit stored chunks to manage memory (e.g., keep last 100)
- Keep processing under 20ms per chunk
- Use `unsubscribe()` to stop receiving chunks when done

## Text-to-Speech

Convert text to natural speech on smart glasses using `session.audio.speak()`, powered by ElevenLabs TTS technology.

```typescript
// Basic text-to-speech
const result = await session.audio.speak('Welcome to Mentra OS!');

// Advanced TTS with custom voice settings
const result = await session.audio.speak(
  'This uses a custom voice configuration for more expressive delivery.',
  {
    voice_id: 'your_elevenlabs_voice_id',
    model_id: 'eleven_turbo_v2_5',
    voice_settings: {
      stability: 0.4,
      similarity_boost: 0.85,
      style: 0.6,
      use_speaker_boost: true,
      speed: 0.95
    }
  }
);

// Real-time application with ultra-low latency
await session.audio.speak('Quick notification message', {
  model_id: 'eleven_flash_v2_5',
  voice_settings: {
    stability: 0.8,
    speed: 1.1
  }
});
```

### SpeakOptions

```typescript
interface SpeakOptions {
  voice_id?: string;
  model_id?: string;    // defaults to eleven_flash_v2_5
  voice_settings?: {
    stability?: number;        // 0.0-1.0, lower = more emotional range
    similarity_boost?: number; // 0.0-1.0, adherence to original voice
    style?: number;            // 0.0-1.0, amplify speaker's style
    use_speaker_boost?: boolean;
    speed?: number;            // 1.0 = normal, <1.0 slower, >1.0 faster
  };
}
```

### Available ElevenLabs TTS Models

| Model | Description | Languages | Latency |
|---|---|---|---|
| `eleven_v3` | Human-like and expressive speech | 70+ languages | Standard |
| `eleven_flash_v2_5` | Ultra-fast, real-time optimized | All multilingual_v2 + hu, no, vi | ~75ms |
| `eleven_flash_v2` | Ultra-fast (English only) | en | ~75ms |
| `eleven_turbo_v2_5` | High quality, low-latency balance | Same as flash_v2_5 | ~250-300ms |
| `eleven_turbo_v2` | High quality, low-latency (English) | en | ~250-300ms |
| `eleven_multilingual_v2` | Most lifelike, rich emotional expression | en, ja, zh, de, hi, fr, ko, pt, it, es, id, nl, tr, fil, pl, sv, bg, ro, ar, cs, el, fi, hr, ms, sk, da, ta, uk, ru | Standard |

**Model Selection Guidelines:**
- Use `eleven_flash_v2_5` for real-time applications requiring ultra-low latency
- Use `eleven_turbo_v2_5` for a good balance of quality and speed
- Use `eleven_multilingual_v2` for the highest quality emotional expression
- Use `eleven_v3` for maximum language support

## Playing Audio Files

Play audio files from URLs on smart glasses using `session.audio.playAudio()`.

```typescript
const result = await session.audio.playAudio({
  audioUrl: 'https://example.com/notification.mp3'
});

if (result.success) {
  console.log('Audio played successfully');
} else {
  console.error(`Playback failed: ${result.error}`);
}
```

### AudioPlayOptions

```typescript
interface AudioPlayOptions {
  audioUrl: string;
  volume?: number;    // 0.0-1.0, defaults to 1.0
}
```

### AudioPlayResult

```typescript
interface AudioPlayResult {
  success: boolean;
  error?: string;
  duration?: number;   // Duration in ms
}
```

**Supported formats**: MP3 (recommended), WAV, OGG, M4A

**Recommended bitrates**: 128kbps for sound effects, 64-96kbps for voice, 192-256kbps for music

### Stop Audio

```typescript
session.audio.stopAudio();
```

### Check Pending Requests

```typescript
session.audio.hasPendingRequest(): boolean
session.audio.hasPendingRequest(requestId?: string): boolean
```

## AudioManager Best Practices

### Check Device Capabilities

```typescript
if (!session.capabilities?.hasSpeaker) {
  session.layouts.showTextWall('Audio not supported, will play through phone');
}

const isPrivate = session.capabilities.speaker?.isPrivate;
const defaultVolume = isPrivate ? 0.8 : 0.6;
```

### Handle Errors Gracefully

```typescript
async function playNotificationSound(session: AppSession): Promise<void> {
  try {
    const result = await session.audio.playAudio({
      audioUrl: 'https://example.com/notification.mp3',
      volume: 0.7
    });
    if (!result.success) {
      await session.audio.speak('Notification received');
    }
  } catch (error) {
    session.logger.error(`Audio error: ${error}`);
    session.layouts.showTextWall('Notification');
  }
}
```

### Chain Audio Requests

```typescript
const response = await session.audio.speak("You said: " + data.text);
if (response.success) {
  await session.audio.playAudio({ audioUrl: "https://okgodoit.com/cool.mp3" });
}
```

### Allow User to Interrupt

```typescript
session.events.onTranscription(async (data) => {
  if (data.text.toLowerCase().includes("stop")) {
    await session.audio.stopAudio();
    return;
  }
});
```
