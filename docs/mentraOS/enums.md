# Enums Reference

> Source: https://docs.mentraglass.com/app-devs/reference/enums

## AppType

```typescript
enum AppType {
  SYSTEM_DASHBOARD = 'system_dashboard',
  SYSTEM_APPSTORE = 'system_appstore',
  BACKGROUND = 'background',
  STANDARD = 'standard'              // default
}
```

## AppState

```typescript
enum AppState {
  NOT_INSTALLED = 'not_installed',
  INSTALLED = 'installed',
  BOOTING = 'booting',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error'
}
```

## Language

```typescript
enum Language {
  EN = "en",
  ES = "es",
  FR = "fr"
}
```

## LayoutType

```typescript
enum LayoutType {
  TEXT_WALL = 'text_wall',
  DOUBLE_TEXT_WALL = 'double_text_wall',
  DASHBOARD_CARD = 'dashboard_card',
  REFERENCE_CARD = 'reference_card',
  BITMAP_VIEW = 'bitmap_view'
}
```

## ViewType

```typescript
enum ViewType {
  DASHBOARD = 'dashboard',
  MAIN = 'main'
}
```

## DashboardMode

```typescript
enum DashboardMode {
  MAIN = 'main',
  EXPANDED = 'expanded'
  // ALWAYS_ON = 'always_on'  // coming soon
}
```

## AppSettingType

```typescript
enum AppSettingType {
  TOGGLE = 'toggle',
  TEXT = 'text',
  SELECT = 'select'
}
```

## StreamType

```typescript
enum StreamType {
  // Hardware streams
  BUTTON_PRESS = 'button_press',
  HEAD_POSITION = 'head_position',
  GLASSES_BATTERY_UPDATE = 'glasses_battery_update',
  PHONE_BATTERY_UPDATE = 'phone_battery_update',
  GLASSES_CONNECTION_STATE = 'glasses_connection_state',
  LOCATION_UPDATE = 'location_update',

  // Audio streams
  TRANSCRIPTION = 'transcription',
  TRANSLATION = 'translation',
  VAD = 'VAD',
  AUDIO_CHUNK = 'audio_chunk',

  // Phone streams
  PHONE_NOTIFICATION = 'phone_notification',
  NOTIFICATION_DISMISSED = 'notification_dismissed',
  CALENDAR_EVENT = 'calendar_event',

  // System streams
  START_APP = 'start_app',
  STOP_APP = 'stop_app',
  OPEN_DASHBOARD = 'open_dashboard',

  // Video streams
  VIDEO = 'video',

  // Special
  ALL = 'all',
  WILDCARD = '*'
}
```

## WebhookRequestType

```typescript
enum WebhookRequestType {
  SESSION_REQUEST = 'session_request',
  STOP_REQUEST = 'stop_request',
  SERVER_REGISTRATION = 'server_registration',
  SERVER_HEARTBEAT = 'server_heartbeat',
  SESSION_RECOVERY = 'session_recovery'
}
```

## GlassesToCloudMessageType

```typescript
enum GlassesToCloudMessageType {
  CONNECTION_INIT = 'connection_init',
  START_APP = 'start_app',
  STOP_APP = 'stop_app',
  DASHBOARD_STATE = 'dashboard_state',
  OPEN_DASHBOARD = 'open_dashboard',
  BUTTON_PRESS = 'button_press',
  HEAD_POSITION = 'head_position',
  GLASSES_BATTERY_UPDATE = 'glasses_battery_update',
  PHONE_BATTERY_UPDATE = 'phone_battery_update',
  GLASSES_CONNECTION_STATE = 'glasses_connection_state',
  LOCATION_UPDATE = 'location_update',
  VAD = 'VAD',
  PHONE_NOTIFICATION = 'phone_notification',
  NOTIFICATION_DISMISSED = 'notification_dismissed',
  CALENDAR_EVENT = 'calendar_event'
}
```

## CloudToGlassesMessageType

```typescript
enum CloudToGlassesMessageType {
  CONNECTION_ACK = 'connection_ack',
  CONNECTION_ERROR = 'connection_error',
  AUTH_ERROR = 'auth_error',
  DISPLAY_EVENT = 'display_event',
  APP_STATE_CHANGE = 'app_state_change',
  MICROPHONE_STATE_CHANGE = 'microphone_state_change',
  WEBSOCKET_ERROR = 'websocket_error'
}
```

## AppToCloudMessageType

```typescript
enum AppToCloudMessageType {
  CONNECTION_INIT = 'tpa_connection_init',
  SUBSCRIPTION_UPDATE = 'subscription_update',
  DISPLAY_REQUEST = 'display_event',
  DASHBOARD_CONTENT_UPDATE = 'dashboard_content_update'
}
```

## CloudToAppMessageType

```typescript
enum CloudToAppMessageType {
  CONNECTION_ACK = 'tpa_connection_ack',
  CONNECTION_ERROR = 'tpa_connection_error',
  APP_STOPPED = 'app_stopped',
  SETTINGS_UPDATE = 'settings_update',
  DATA_STREAM = 'data_stream',
  DASHBOARD_MODE_CHANGED = 'dashboard_mode_changed',
  DASHBOARD_ALWAYS_ON_CHANGED = 'dashboard_always_on_changed',
  WEBSOCKET_ERROR = 'websocket_error'
}
```
