# Event Types Reference

> Source: https://docs.mentraglass.com/app-devs/reference/interfaces/event-types

## TranscriptionData

Real-time speech transcription with interim and final results.

- `text`: Transcribed text
- `isFinal`: Whether this is a final result
- `transcribeLanguage`: Language code
- `startTime`: When speech started
- `endTime`: When speech ended
- `confidence`: Score from 0-1
- `provider`: Transcription provider
- Optional speaker identification

## TranslationData

Translated speech output alongside original transcribed text.

- Translated text
- Original transcribed text
- Source language code
- Target language code

## ButtonPress

Physical button inputs from glasses.

- `buttonId`: Button identifier
- `pressType`: 'short' or 'long'

## HeadPosition

Head movement detection.

- `position`: 'up' or 'down'

## GlassesBatteryUpdate

Battery percentage and charging status for the glasses.

## PhoneBatteryUpdate

Battery percentage and charging status for the connected phone.

## GlassesConnectionState

Model information and connection status.

## PhoneNotification

App notifications with priority levels.

- `app`: Source app name
- `title`: Notification title
- `content`: Notification body
- `priority`: Priority level

## LocationUpdate

GPS coordinates.

- `lat`: Latitude
- `lng`: Longitude
- `accuracy`: Accuracy in meters

## CalendarEvent

Calendar data in ISO format with timezone information.

## AudioChunk

Raw audio data (requires explicit subscription).

- `arrayBuffer`: Raw audio data
- `sampleRate`: Sample rate (typically 16000)
- `timestamp`: When received

## Vad (Voice Activity Detection)

Voice activity status. Note: may return string or boolean values.

## NotificationDismissed

Tracks dismissed notifications.

## BaseMessage

All events extend `BaseMessage` and include type identifiers for routing.
