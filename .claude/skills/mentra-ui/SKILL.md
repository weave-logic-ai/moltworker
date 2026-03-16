---
name: mentra-ui
description: Smart glasses UI design system for HUD display, webview companion, and audio interfaces
model: opus
---

# MentraOS UI Design Skill

## Before You Design

**Always search the docs vector index before designing any visual interface.** Confirm display constraints, layout API methods, and component capabilities against the documentation.

```bash
npx @claude-flow/cli@latest memory search --query "mentra display layout constraints" --namespace mentra-docs
```

Or use InfraNodus:

```
mcp__infranodus__retrieve_from_knowledge_base { query: "mentra HUD display API showTextWall" }
```

Check the InfraNodus graph `MentraOS-SDK-Reference` for concept relationships between display components.

Reference docs directory: `/home/aepod/dev/moltworker/docs/mentraOS/`

## Display Surfaces

MentraOS applications render across four distinct surfaces, each with different capabilities and constraints.

### 1. In-Glass HUD

The primary display surface. A monochrome overlay projected onto the glasses lens.

| Property | Value |
|----------|-------|
| Resolution | 400x240 pixels |
| Color | Single color (green on transparent/dark) |
| Characters per line | ~40 |
| Visible lines | ~6 |
| Safe character limit | **220 characters** |
| Render mode | Text-only (no images except via bitmap) |
| Update throttle | 300ms minimum between updates |

The HUD is the most constrained surface. Every design decision should start here. If content does not fit on the HUD, it belongs in the webview.

### 2. Phone Webview (Companion App)

A full-color React web UI rendered inside the Mentra mobile app via `@mentra/react` with `MentraAuthProvider`.

| Property | Value |
|----------|-------|
| Colors | Full color |
| Framework | React via `@mentra/react` |
| Auth | OAuth token via MentraAuthProvider |
| Routing | Express routes via `server.getExpressApp()` |
| Layout | Mobile-first responsive |
| Theme | Dark theme preferred (matches glasses aesthetic) |

Used for: settings, detailed results, history, configuration, charts, and anything too complex for the HUD. The webview complements the HUD -- it shows details the HUD cannot fit.

### 3. Dashboard View

A persistent glanceable surface that appears when the user looks up. Multiple apps can register dashboard cards that rotate.

| Property | Value |
|----------|-------|
| Trigger | Head-up gesture |
| Content | Key-value metrics, status, brief info |
| Lifecycle | Persists until updated or cleared |
| Rotation | Shares space with other installed apps |

Use `session.dashboard.write()` to publish dashboard content.

### 4. Always-On Display

Minimal persistent information visible at all times on the HUD periphery.

| Property | Value |
|----------|-------|
| Content | Time, battery, status indicators |
| Update frequency | Low (minutes, not seconds) |
| Visibility | Always visible, non-intrusive |

## HUD Typography and Layout

### Layout Methods

Choose the layout method that best matches the content structure.

#### showTextWall(text)

Full-screen text block. Best for simple messages of 1-3 lines.

```javascript
await session.layouts.showTextWall('72F Partly Cloudy\nWind: 5mph NE');
```

Use for: answers, confirmations, status messages, errors.

#### showDoubleTextWall(top, bottom)

Two-panel layout with header and content separation.

```javascript
await session.layouts.showDoubleTextWall('Weather', '72F Partly Cloudy\nWind: 5mph NE\nHumidity: 45%');
```

Use for: titled content, question + options, category + details.

#### showReferenceCard({ title, text })

Structured card with title and body. Holds on screen until the next update.

```javascript
await session.layouts.showReferenceCard({
  title: 'Next Meeting',
  text: '2:30 PM - Sprint Review\nConf Room B',
});
```

Use for: notifications, event info, structured data.

#### showDashboardCard(key, value)

Key-value metric display, ideal for at-a-glance data.

```javascript
await session.layouts.showDashboardCard('Battery', '85%');
```

Use for: single metrics, status indicators, counters.

#### showBitmapView(buffer)

Custom pixel layout using a 400x240 bitmap buffer. The only way to render graphics on the HUD.

```javascript
await session.layouts.showBitmapView(imageBuffer);
```

Use for: custom layouts, charts rendered as images, icons, large text mode.

#### clearView()

Clears the current display content.

```javascript
await session.layouts.clearView();
```

Use for: transitions between content types, idle state.

### Text Constraints

- Maximum: **220 characters** total
- Preferred: under **120 characters** for readability
- Line breaks: use `\n` explicitly (no markdown rendering on HUD)
- Line width: ~40 characters before wrapping
- Visible lines: ~6 maximum

### Markdown Stripping

The HUD does not render markdown. Always strip markdown before display:

- Remove `#`, `##`, `###` headers
- Remove `**bold**` and `*italic*` markers
- Remove `` `code` `` backticks
- Replace code blocks with `[code]`
- Extract text from `[link text](url)` links
- Collapse multiple newlines to double newline maximum

Use `formatForGlasses()` from `src/mentra/display-format.ts` for automatic stripping.

### Truncation

When content exceeds 220 characters, truncate with `...` at the end. Never show partial words -- truncate at the last complete word before the limit.

## Information Hierarchy for 220 Characters

Every HUD message must be ruthlessly prioritized. With only 220 characters, apply this hierarchy:

### Priority 1: Action/Answer

What the user needs RIGHT NOW. This always comes first and may be the only thing shown.

```
72F Partly Cloudy
```

### Priority 2: Context

Why, where, or when. Add only if space permits after the answer.

```
72F Partly Cloudy
Wind: 5mph NE
```

### Priority 3: Details

Additional information. Almost always deferred to the webview.

```
// Too much for HUD -- push to webview
7-day forecast, hourly breakdown, radar map
```

### Abbreviation Conventions

Use standard abbreviations to save characters:

| Full | Abbreviation |
|------|-------------|
| temperature | temp |
| degrees Fahrenheit | F |
| degrees Celsius | C |
| direction | dir |
| northeast | NE |
| distance | dist |
| miles | mi |
| kilometers | km |
| minutes | min |
| seconds | sec |
| approximately | ~  |
| percent | % |

Never show raw data on the HUD. Always format for fast human scanning.

## Display Timing

### Update Throttle

The SDK enforces a **300ms minimum** between display updates. Rapid calls within this window are auto-throttled. Do not attempt to implement your own throttle on top of this.

### Content Duration

| Content Type | Recommended Duration |
|-------------|---------------------|
| Short messages (1-2 lines) | 3-5 seconds |
| Reference cards | Hold until next update |
| Loading indicators | Hold until response arrives |
| Error messages | 5-7 seconds |
| Dashboard cards | Persist until explicitly updated |

### State Indicators

| State | Display |
|-------|---------|
| Loading | `showTextWall("Thinking...")` |
| Analyzing | `showTextWall("Analyzing...")` |
| Listening | `showTextWall("Listening...")` |
| Error | `showTextWall("Could not process. Try again.")` |
| No connection | `showTextWall("No connection.\nRetrying...")` |

### Transitions

Always clear the current content before showing a different content type. For example, clear a reference card before showing a text wall. Same-type updates can overwrite directly.

## Audio UI

### Text-to-Speech

```javascript
await session.audio.speak('It is 72 degrees and partly cloudy');
```

| Constraint | Value |
|-----------|-------|
| Max duration | 15 seconds |
| Pacing | Natural, not rushed |
| Priority | Display preferred when both available |
| Urgent alerts | Audio even if display is showing other content |

### Audio Design Rules

- Use TTS for responses when the display is not visible to the user
- Keep spoken responses under 15 seconds
- Do not repeat what is already shown on the display -- add context instead
- Use earcons (short audio cues) for state changes: connected, error, notification
- Prefer display over audio when both surfaces are available
- Use audio for urgent alerts regardless of current display state

## Button UI

Physical button interactions on the glasses frame.

| Interaction | Action | Feedback |
|------------|--------|----------|
| Short press | Primary action (listen, confirm, next) | `showTextWall("Listening...")` |
| Long press | Secondary action (capture photo, cancel, menu) | `showTextWall("Capturing...")` |
| Double press | Toggle mode or dismiss | `showTextWall("[mode name]")` |

Every button press must produce immediate visual feedback on the HUD. Never leave the user without confirmation that their press was registered.

```javascript
session.events.onButtonPress(async (data) => {
  if (data.pressType === 'short') {
    await session.layouts.showTextWall('Listening...');
  } else if (data.pressType === 'long') {
    await session.layouts.showTextWall('Capturing...');
    const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
    // process photo...
  }
});
```

## Color and Contrast (HUD)

The HUD is monochrome. All design must work within these constraints:

- **Color**: Green text on transparent/dark background
- **No color palette**: Design for single-color rendering
- **ALL CAPS**: Use sparingly, for headers and emphasis only
- **Visual structure**: Achieved through spacing, line breaks, and indentation -- not color or font weight
- **Contrast**: Always maximum (green on black/transparent)

## Component Patterns

Standard UI patterns for common scenarios.

### Loading

```javascript
await session.layouts.showTextWall('Thinking...');
```

### Error

```javascript
await session.layouts.showTextWall('Sorry, try again.\nSay your question clearly.');
```

### Success

```javascript
await session.layouts.showTextWall('Done! Meeting scheduled\nfor 2:30 PM.');
```

### Question

```javascript
await session.layouts.showDoubleTextWall(
  'Delete all notes?',
  'Say YES to confirm\nor CANCEL to keep.'
);
```

### Status Metric

```javascript
await session.layouts.showDashboardCard('Battery', '85%');
```

### Information Card

```javascript
await session.layouts.showReferenceCard({
  title: 'Weather',
  text: '72F Partly Cloudy\nWind: 5mph NE',
});
```

### Multi-Step Wizard

For flows that require multiple screens, display one step at a time and wait for voice or button confirmation before advancing.

```javascript
// Step 1
await session.layouts.showDoubleTextWall('Step 1 of 3', 'Say the contact name.');
// Wait for transcription...

// Step 2
await session.layouts.showDoubleTextWall('Step 2 of 3', 'Say the message.');
// Wait for transcription...

// Step 3
await session.layouts.showDoubleTextWall('Send message?', `To: ${name}\n"${msg}"\nSay YES or CANCEL.`);
```

## Webview Design (Phone Companion)

### Architecture

```javascript
const app = server.getExpressApp();

app.get('/webview', (req, res) => {
  res.send(renderReactApp());
});
```

The webview uses `@mentra/react` with `MentraAuthProvider` for authenticated sessions.

### Design Guidelines

| Principle | Guideline |
|-----------|-----------|
| Layout | Mobile-first responsive (runs inside phone app) |
| Theme | Dark theme preferred (consistent with glasses) |
| Typography | System fonts, high contrast, minimum 16px body |
| Navigation | Bottom tab bar or simple stack navigation |
| Content | Details the HUD cannot fit: history, charts, settings |
| Auth | OAuth token via MentraAuthProvider -- no manual login flow |

### HUD-to-Webview Relationship

The webview is not a replacement for the HUD -- it is a companion. Follow this division:

| Surface | Content |
|---------|---------|
| HUD | Headline answer, current status, active notification |
| Webview | Full history, detailed results, settings, charts, configuration |

When an answer is too detailed for the HUD, show the summary on the HUD and indicate "Details in app" so the user knows to check the webview.

## Design Checklist

Before finalizing any UI design for MentraOS, verify each item:

- [ ] **HUD text under 220 chars**: Is every HUD message within the character limit?
- [ ] **Markdown stripped**: Is all markdown removed before HUD display?
- [ ] **Truncation handled**: Does overflow truncate with `...` at a word boundary?
- [ ] **Information prioritized**: Does the most important info come first?
- [ ] **Loading state designed**: Does the user see immediate feedback while waiting?
- [ ] **Error state designed**: Does the user see a friendly, actionable error message?
- [ ] **Button feedback**: Does every button press produce visible HUD feedback?
- [ ] **Audio complement**: Does TTS add context rather than repeat the display?
- [ ] **Webview complement**: Do detailed views exist in the webview for complex results?
- [ ] **Monochrome tested**: Does the design work with only green on dark?
- [ ] **300ms throttle respected**: Are rapid updates avoided or batched?
- [ ] **Abbreviations used**: Are common terms abbreviated to save space?
- [ ] **formatForGlasses() used**: Is text processed through the formatting helper?
- [ ] **Search docs**: Have you searched `mentra-docs` namespace for display API details?
