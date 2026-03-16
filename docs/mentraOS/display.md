# Display and Layouts

> Source: https://docs.mentraglass.com/app-devs/core-concepts/display/layouts
> Source: https://docs.mentraglass.com/app-devs/reference/interfaces/layout-types
> Source: https://docs.mentraglass.com/app-devs/reference/managers/layout-manager
> Source: https://cloud-docs.mentra.glass/sdk/display-layouts

## Overview

Layouts manage primary content on glasses screens through methods like `showTextWall()`, `showDoubleTextWall()`, and `showReferenceCard()`. These replace previous content and support multi-line text.

**Display constraints**: Text only (no images), Single color (green), Limited screen size, 200-300ms minimum between updates.

Display updates are automatically throttled to 1 per 300ms by MentraOS Cloud to prevent display desync.

## Layout Types

### Layout Union Type

```typescript
type Layout = TextWall | DoubleTextWall | DashboardCard | ReferenceCard;
```

### TextWall

A simple layout for displaying a single block of text. Most common layout.

```typescript
interface TextWall {
  /** Must be LayoutType.TEXT_WALL. */
  layoutType: LayoutType.TEXT_WALL;
  /** The text content to display. */
  text: string;
}
```

Usage:
```typescript
session.layouts.showTextWall("This is a simple text wall with a single message.");
```

Best for simple messages that need to be displayed briefly. Keep text concise and focused on a single idea.

### DoubleTextWall

A layout for displaying two blocks of text vertically.

```typescript
interface DoubleTextWall {
  /** Must be LayoutType.DOUBLE_TEXT_WALL. */
  layoutType: LayoutType.DOUBLE_TEXT_WALL;
  /** Text for the upper section. */
  topText: string;
  /** Text for the lower section. */
  bottomText: string;
}
```

Usage:
```typescript
session.layouts.showDoubleTextWall(
  "This is the top section",
  "This is the bottom section"
);
```

Use when you need to separate a header/title from content. Example: "Current Weather" (top) and "72F, Partly Cloudy" (bottom).

### ReferenceCard

A card-style layout with a title and main content text.

```typescript
interface ReferenceCard {
  /** Must be LayoutType.REFERENCE_CARD. */
  layoutType: LayoutType.REFERENCE_CARD;
  /** The title text for the card. */
  title: string;
  /** The main body text for the card. */
  text: string;
}
```

Usage:
```typescript
session.layouts.showReferenceCard(
  "Recipe: Chocolate Chip Cookies",
  "Ingredients:\n- 2 cups flour\n- 1 cup sugar\n- 1/2 cup butter\n..."
);
```

Best for information that users may need to reference for a longer period. Supports longer, multi-line text.

### DashboardCard

A card-style layout designed for displaying key-value pairs.

```typescript
interface DashboardCard {
  /** Must be LayoutType.DASHBOARD_CARD. */
  layoutType: LayoutType.DASHBOARD_CARD;
  /** Text for the left side (usually a label). */
  leftText: string;
  /** Text for the right side (usually a value). */
  rightText: string;
}
```

Usage:
```typescript
session.layouts.showDashboardCard("Temperature", "72F");
```

Designed for monitoring key metrics at a glance. Works best with short values (numbers, brief status).

### BitmapView (Advanced)

Advanced pixel-level custom rendering at 400x240 resolution.

## DisplayRequest

The `DisplayRequest` interface is the message structure sent to MentraOS Cloud when an App wants to display a layout.

```typescript
interface DisplayRequest extends BaseMessage {
  type: AppToCloudMessageType.DISPLAY_REQUEST;
  packageName: string;
  view: ViewType;
  layout: Layout;
  durationMs?: number;
  forceDisplay?: boolean;
}
```

You typically don't need to create `DisplayRequest` objects directly, as the `LayoutManager` methods handle this for you.

## Display Options

All layout methods support optional parameters:

- `view`: Targets either `ViewType.MAIN` (temporary, primary display) or `ViewType.DASHBOARD` (persistent area)
- `durationMs`: Controls how long content displays before auto-dismissing
- `priority`: LOW / NORMAL / HIGH

## Clearing Display

```typescript
session.layouts.clear();
// or
await session.layouts.clearView();
```

## LayoutManager Methods

| Method | Description |
|---|---|
| `showTextWall(text, options?)` | Single text block with optional duration and view targeting |
| `showDoubleTextWall(topText, bottomText, options?)` | Two vertically-stacked text sections |
| `showReferenceCard(title, text, options?)` | Titled card format containing main content |
| `showDashboardCard(leftText, rightText, options?)` | Key-value pair layout, defaults to dashboard view |
| `clearView()` | Clear display |

## Best Practices

- Keep text concise due to AR display constraints
- Adapt to device capabilities using `session.capabilities`
- Select appropriate layout types based on content structure
- Check display limitations like `maxTextLines` before rendering
- Match duration to content importance
- Respect the 200-300ms minimum between updates to avoid throttling
