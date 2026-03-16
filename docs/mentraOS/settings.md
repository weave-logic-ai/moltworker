# Settings

> Source: https://docs.mentraglass.com/app-devs/reference/interfaces/setting-types
> Source: https://docs.mentraglass.com/app-devs/reference/managers/settings-manager

## Setting Types Reference

### Enums

#### AppSettingType

```typescript
enum AppSettingType {
  TOGGLE = 'toggle',
  TEXT = 'text',
  SELECT = 'select',
  SLIDER = 'slider',
  GROUP = 'group',
  TEXT_NO_SAVE_BUTTON = 'text_no_save_button',
  SELECT_WITH_SEARCH = 'select_with_search',
  MULTISELECT = 'multiselect',
  TITLE_VALUE = 'titleValue'
}
```

### Interfaces

#### BaseAppSetting

```typescript
interface BaseAppSetting {
  /** Unique identifier for the setting */
  key: string;
  /** Human-readable label displayed to users */
  label: string;
  /** Current value selected by the user */
  value?: any;
  /** Default value if user hasn't set a preference */
  defaultValue?: any;
}
```

#### ToggleSetting

Boolean on/off switch setting.

```typescript
interface ToggleSetting extends BaseAppSetting {
  type: AppSettingType.TOGGLE;
  defaultValue: boolean;
  value?: boolean;
}
```

Example:
```json
{
  "type": "toggle",
  "key": "enable_notifications",
  "label": "Enable Notifications",
  "defaultValue": true
}
```

#### TextSetting

Single-line text input setting.

```typescript
interface TextSetting extends BaseAppSetting {
  type: AppSettingType.TEXT;
  defaultValue?: string;
  value?: string;
}
```

Example:
```json
{
  "type": "text",
  "key": "user_name",
  "label": "Your Name",
  "defaultValue": "User"
}
```

#### TextNoSaveButtonSetting

Multi-line text input without save button. Updates on blur.

```typescript
interface TextNoSaveButtonSetting extends BaseAppSetting {
  type: AppSettingType.TEXT_NO_SAVE_BUTTON;
  defaultValue?: string;
  value?: string;
  /** Maximum number of visible lines */
  maxLines?: number;
}
```

Example:
```json
{
  "type": "text_no_save_button",
  "key": "notes",
  "label": "Personal Notes",
  "defaultValue": "",
  "maxLines": 5
}
```

#### SelectSetting

Dropdown selection from predefined options.

```typescript
interface SelectSetting extends BaseAppSetting {
  type: AppSettingType.SELECT;
  options: Array<{
    label: string;
    value: any;
  }>;
  defaultValue?: any;
  value?: any;
}
```

Example:
```json
{
  "type": "select",
  "key": "theme",
  "label": "Color Theme",
  "options": [
    { "label": "Light", "value": "light" },
    { "label": "Dark", "value": "dark" },
    { "label": "Auto", "value": "auto" }
  ],
  "defaultValue": "auto"
}
```

#### SelectWithSearchSetting

Dropdown with search functionality for long option lists.

```typescript
interface SelectWithSearchSetting extends BaseAppSetting {
  type: AppSettingType.SELECT_WITH_SEARCH;
  options: Array<{
    label: string;
    value: any;
  }>;
  defaultValue?: any;
  value?: any;
}
```

Example:
```json
{
  "type": "select_with_search",
  "key": "country",
  "label": "Country",
  "options": [
    { "label": "United States", "value": "US" },
    { "label": "United Kingdom", "value": "UK" },
    { "label": "Canada", "value": "CA" }
  ],
  "defaultValue": "US"
}
```

#### MultiselectSetting

Multiple selection from options with checkboxes.

```typescript
interface MultiselectSetting extends BaseAppSetting {
  type: AppSettingType.MULTISELECT;
  options: Array<{
    label: string;
    value: any;
  }>;
  defaultValue?: any[];
  value?: any[];
}
```

Example:
```json
{
  "type": "multiselect",
  "key": "features",
  "label": "Enabled Features",
  "options": [
    { "label": "Auto-save", "value": "autosave" },
    { "label": "Spell Check", "value": "spellcheck" },
    { "label": "Dark Mode", "value": "darkmode" }
  ],
  "defaultValue": ["autosave"]
}
```

#### SliderSetting

Numeric value selection with slider control.

```typescript
interface SliderSetting extends BaseAppSetting {
  type: AppSettingType.SLIDER;
  min: number;
  max: number;
  defaultValue: number;
  value?: number;
}
```

Example:
```json
{
  "type": "slider",
  "key": "volume",
  "label": "Volume",
  "min": 0,
  "max": 100,
  "defaultValue": 50
}
```

#### GroupSetting

Visual grouping of related settings. Not a setting itself.

```typescript
interface GroupSetting {
  type: AppSettingType.GROUP;
  title: string;
  key?: never;
}
```

Example:
```json
{
  "type": "group",
  "title": "Display Settings"
}
```

#### TitleValueSetting

Read-only display of information.

```typescript
interface TitleValueSetting {
  type: AppSettingType.TITLE_VALUE;
  label: string;
  value: any;
  key?: never;
}
```

Example:
```json
{
  "type": "titleValue",
  "label": "App Version",
  "value": "2.1.0"
}
```

### Union Types

```typescript
type AppSetting =
  | ToggleSetting
  | TextSetting
  | TextNoSaveButtonSetting
  | SelectSetting
  | SelectWithSearchSetting
  | MultiselectSetting
  | SliderSetting
  | GroupSetting
  | TitleValueSetting;

type AppSettings = AppSetting[];
```

### Setting Change Types

```typescript
interface SettingChange {
  oldValue: any;
  newValue: any;
}

type SettingsChangeMap = Record<string, SettingChange>;
type SettingsChangeHandler = (changes: SettingsChangeMap) => void;
type SettingValueChangeHandler<T = any> = (newValue: T, oldValue: T) => void;
```

## SettingsManager API Reference

The `SettingsManager` class provides a type-safe interface for accessing and monitoring App settings. It automatically synchronizes with MentraOS Cloud and provides real-time change notifications.

### Usage

```typescript
import { AppServer, AppSession } from '@mentra/sdk';

export class MyAppServer extends AppServer {
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    const settingsManager = session.settings;

    const language = settingsManager.get<string>('transcribe_language', 'English');

    settingsManager.onValueChange('line_width', (newValue, oldValue) => {
      console.log(`Line width changed from ${oldValue} to ${newValue}`);
    });
  }
}
```

### Methods

#### get

```typescript
get<T = any>(key: string, defaultValue?: T): T
```

Get a setting value.

```typescript
const fontSize = session.settings.get<number>('font_size', 16);
const theme = session.settings.get<string>('theme');
```

#### has

```typescript
has(key: string): boolean
```

Check if a setting exists.

#### getAll

```typescript
getAll(): AppSettings
```

Get all settings (returns a copy).

#### getSetting

```typescript
getSetting(key: string): AppSetting | undefined
```

Find a setting by key and get the full setting object.

#### onChange

```typescript
onChange(handler: SettingsChangeHandler): () => void
```

Listen for changes to any setting. Returns cleanup function.

```typescript
const cleanup = session.settings.onChange((changes) => {
  for (const [key, change] of Object.entries(changes)) {
    console.log(`  ${key}: ${change.oldValue} -> ${change.newValue}`);
  }
});
cleanup(); // remove listener
```

#### onValueChange

```typescript
onValueChange<T = any>(key: string, handler: SettingValueChangeHandler<T>): () => void
```

Listen for changes to a specific setting. Returns cleanup function.

#### fetch

```typescript
fetch(): Promise<AppSettings>
```

Manually fetch settings from the cloud (generally not needed since settings are auto-synced).

### MentraOS System Settings

#### onMentraosSettingChange

```typescript
onMentraosSettingChange<T = any>(key: string, handler: (newValue: T, oldValue: T) => void): () => void
```

Listen for changes to specific MentraOS system settings (e.g., 'metricSystemEnabled').

#### getMentraosSetting

```typescript
getMentraosSetting<T = any>(key: string, defaultValue?: T): T
```

Get the current value of a MentraOS system setting.

### Best Practices

1. **Provide Defaults**: Always provide a default value with `get()` to avoid undefined errors
2. **Type Your Settings**: Use generics for type safety
3. **Clean Up Listeners**: Store cleanup functions and call them when sessions end
