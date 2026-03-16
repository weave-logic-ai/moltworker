# Clawdflare Bridge Design System v2

Flowing, content-first design language inspired by the Track changelog template aesthetic. Prioritizes vertical rhythm, generous whitespace, and timeline-centric patterns over boxy dashboard grids.

## Design Philosophy

- **Content-first**: Typography and spacing do the visual work, not borders and boxes
- **Vertical flow**: Content scrolls naturally like a well-designed blog or changelog
- **Timeline-centric**: Workflows are vertical timelines with dated entries, not horizontal track lanes
- **Professional minimalism**: Less visual noise, more content clarity
- **Borderless by default**: Cards are transparent; use background tints and spacing to separate content

## Color Tokens

```css
:root {
  --bg: #09090b;
  --card: transparent;               /* cards are borderless by default */
  --card-hover: rgba(255,255,255,0.03); /* barely visible hover state */
  --border: rgba(255,255,255,0.06);     /* ghost borders, subtle dividers */
  --border-strong: rgba(255,255,255,0.12); /* inputs, active elements */
  --text: #fafafa;
  --text-muted: #71717a;
  --text-subtle: #52525b;
  --accent: #e94560;
  --success: #4ecca3;
  --warning: #f59e0b;
  --destructive: #ef4444;
  --info: #5b8def;
  --radius: 12px;                    /* larger, softer corners */
}
```

### Semantic Color Usage

| Color | Token | Usage |
|-------|-------|-------|
| Accent red | `--accent` | Active states, accent highlights, current tab indicators |
| Success green | `--success` | Healthy services, active agents, successful deploys |
| Warning amber | `--warning` | Pending items, resource thresholds, alerts |
| Destructive red | `--destructive` | Failures, danger zone, critical notifications |
| Info blue | `--info` | Informational items, normal priority, links |

## Typography

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### Hierarchy

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Page title | 22px | 600 | `--text` |
| Section title | 18px | 600 | `--text` |
| Section label | 11px uppercase | 500 | `--text-subtle`, letter-spacing 1.2px |
| Body text | 14-15px | 400 | `--text` |
| Secondary text | 13px | 400 | `--text-muted` |
| Meta/timestamp | 11-12px mono | 400 | `--text-subtle` |
| Data values | 12px mono | 400 | `--text` or semantic color |

### Rules

- Bold titles, muted secondary text, monospace for data values
- Letter-spacing on uppercase labels (1.2px)
- Tabular nums on timestamps (`font-variant-numeric: tabular-nums`)
- Base line-height: 1.6 for readability

## Spacing

### Section Spacing

- Between major sections: 24-32px (no borders, just space)
- Between items in a list: single-pixel ghost border (`--border`)
- Horizontal padding: 20px (consistent across all views)
- Vertical padding in items: 10-14px

### Whitespace Principles

- Content breathes -- never cram elements together
- Sections are separated by whitespace, not heavy dividers
- 1px ghost borders (`rgba(255,255,255,0.06)`) for list item separation
- No visible card borders on mobile

## Layout Patterns

### Vertical Flow (Primary)

Content scrolls vertically like a feed. No fixed grids. Each section follows the next with generous spacing.

```
[Status Bar]
[Greeting]
    24px gap
[Active Workflows]
    32px gap
[Quick Actions]
    32px gap
[Notifications]
    32px gap
[System Pulse]
```

### Timeline (Workflow View)

Vertical left-aligned timeline. Thin connecting line (1px, `--border`). Each entry has:
- Timestamp on the left margin (11px mono, `--text-subtle`)
- Dot on the timeline (9px, color-coded)
- Content to the right of the timeline

Entry types:
- **User message**: Author name + content text
- **Agent message**: Avatar (20px circle) + agent name + content
- **Tool output**: Collapsible code block (monospace, subtle bg)
- **Diff**: Inline diff with green/red tinted backgrounds
- **Approval**: Question text + action buttons (Approve/Reject/Edit)
- **Status change**: Italic muted text

Active entry: accent-colored dot with glow shadow. Past entries: muted dots.

### Flowing List

Items stacked vertically, separated by ghost borders. No card containers.

```
[Item: name + meta + action indicator]
--- 1px border ---
[Item: name + meta + action indicator]
--- 1px border ---
[Item: name + meta + action indicator]
```

### Horizontal Scroll (Quick Actions)

Pill buttons in a horizontal scrollable row. Overflow hidden, `-webkit-overflow-scrolling: touch`.

## Components

### Status Bar

Minimal top bar with status dots and time only. No icons, no app name.

```
[dot] [dot] [dot]              9:42 PM
```

### Status Dot

6-8px circle. Colors: success (green), warning (amber), error (red), idle (subtle gray). Active dots can have a glow `box-shadow`.

### Edge Handles

2px vertical lines on left and right edges. Small notch (4x32px, rounded) at vertical center. `rgba(255,255,255,0.04)` background.

### Pill Button

Rounded (999px radius), 1px border (`--border-strong`), transparent background. Horizontal padding 16px. Active state: `rgba(255,255,255,0.06)` background.

### Notification Item

Left border (2px) colored by priority. No card container. Padding-left for content offset.

Priority colors:
- Critical: `--destructive`
- Warning: `--warning`
- Info: `--info`
- Success: `--success`

### Email Row

Full-width row, separated by ghost borders. Priority indicator is a 3px vertical bar on the left edge. From, subject, preview stack vertically. Time aligned right.

### Tabs (Underline Style)

Text tabs with no background. Active tab has a 2px accent-colored underline. No boxed tab containers.

### Collapsible Section (Debug Drawer)

Header with uppercase label + chevron toggle. Content area with label:value pairs in monospace. No accordion card containers.

### Progress Bar

4px height, rounded. Track: `rgba(255,255,255,0.06)`. Fill: semantic color (green/amber/red).

### Bottom Bar

4 items: icon + text label. Ghost border on top (`--border`). Active item: `--text`. Inactive: `--text-subtle`.

### Drawer

80% width, full height. Slides from edge. Semi-transparent backdrop (`rgba(0,0,0,0.5)`). Background: `#0c0c0f` (slightly lighter than app background for depth).

### Confirmation Dialog

Centered modal with `--border-strong` border. 12px radius. Title + description + action buttons. Cancel: outline. Confirm: solid destructive.

## Animations

### Thinking Dots

Three 4px dots with staggered `opacity` and `scale` animation. Subtle, not distracting.

```css
@keyframes thinking {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.1); }
}
```

### Waveform

Eight 2px-wide bars with staggered `scaleY` animation. Accent color at reduced opacity (0.4-0.8).

### Deploy Spinner

Simple `rotate(360deg)` animation on a circle character, 1.5s linear infinite.

## Anti-Patterns (What to Avoid)

- Visible card borders on mobile
- Solid card backgrounds (use `transparent` or `rgba`)
- Bento grids for primary content layout
- Heavy shadows or border treatments
- Horizontal track lanes for workflows
- Boxed tab containers
- Card-based button groups (use pills or text links)
- Accordion-style cards for data sections (use collapsible headers)
- Any layout that looks like a "dashboard" rather than a "feed"

## File Reference

| File | View | Primary Pattern |
|------|------|----------------|
| `mockup-home.html` | Home screen | Vertical flow, greeting, list, pills, feed |
| `mockup-workflow.html` | Workflow detail | Vertical timeline with mixed entry types |
| `mockup-left-drawer.html` | Context selector | Indented hierarchical list |
| `mockup-right-drawer.html` | Debug tools | Collapsible sections, data pairs |
| `mockup-comms.html` | Communications | Tabbed feed, email rows, message list |
| `mockup-admin.html` | Administration | Service indicators, health bars, deploy log |

All mockups are self-contained HTML (no external dependencies), constrained to 428px max-width.
