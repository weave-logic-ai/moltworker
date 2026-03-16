# Component Library: Webview UI for Mentra Live + OpenClaw

> Core UI components, their states, variants, and implementation specifications.
> All components support the Adaptive Shell mode system via CSS custom properties.

---

## Design Tokens

### Color System

```css
:root {
  /* Base palette */
  --color-bg-primary: #0a0a14;
  --color-bg-secondary: #12121e;
  --color-bg-tertiary: #1a1a2e;
  --color-bg-elevated: #222236;

  /* Text */
  --color-text-primary: #e8e8ec;
  --color-text-secondary: #a0a0b0;
  --color-text-muted: #606070;
  --color-text-inverse: #0a0a14;

  /* Accent */
  --color-accent: #e94560;
  --color-accent-hover: #ff5a75;
  --color-accent-muted: rgba(233, 69, 96, 0.15);

  /* Semantic */
  --color-success: #4ecca3;
  --color-success-bg: rgba(78, 204, 163, 0.12);
  --color-warning: #f0a030;
  --color-warning-bg: rgba(240, 160, 48, 0.12);
  --color-error: #e94560;
  --color-error-bg: rgba(233, 69, 96, 0.12);
  --color-info: #5b8def;
  --color-info-bg: rgba(91, 141, 239, 0.12);

  /* Connection states */
  --color-connected: #4ecca3;
  --color-reconnecting: #f0a030;
  --color-disconnected: #e94560;

  /* Code/diff */
  --color-diff-add: #2ea04370;
  --color-diff-remove: #e9456040;
  --color-diff-add-text: #7ee6a8;
  --color-diff-remove-text: #ff8a9e;
  --color-code-bg: #0d0d18;

  /* Spacing scale (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;

  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 20px;
  --text-2xl: 24px;

  --leading-tight: 1.3;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;

  /* Touch targets */
  --touch-min: 44px;
  --touch-comfortable: 48px;
  --touch-large: 56px;
}
```

### Mode Overrides

```css
/* Dev Mode: dense, compact */
[data-mode="dev"] {
  --text-base: 14px;
  --space-4: 12px;
  --touch-min: 44px;
}

/* Clinical Mode: clean, medium density */
[data-mode="clinical"] {
  --text-base: 16px;
  --space-4: 16px;
  --touch-min: 48px;
}

/* Field Mode: large, high contrast */
[data-mode="field"] {
  --text-base: 18px;
  --text-sm: 15px;
  --space-4: 20px;
  --touch-min: 56px;
  --color-text-primary: #ffffff;
  --color-bg-primary: #000000;
  --color-bg-secondary: #0a0a0a;
}
```

---

## Component 1: Connection Status Bar

Persistent bar at the top of the viewport. Always visible. Communicates the WebSocket connection state to the OpenClaw bridge.

### States

| State | Color | Icon | Label | Animation |
|-------|-------|------|-------|-----------|
| Connected | `--color-connected` | Filled circle | "Connected" | Gentle pulse (2s cycle) |
| Reconnecting | `--color-reconnecting` | Hollow circle | "Reconnecting..." | Spin animation (1s cycle) |
| Disconnected | `--color-disconnected` | X circle | "Disconnected" | None (static) |
| Connecting | `--color-info` | Hollow circle | "Connecting..." | Spin animation (1s cycle) |

### Variants

**Minimal (General Mode)**
```
+------------------------------------------+
| (*) Connected                    [gear]  |
+------------------------------------------+
Height: 44px. Green dot pulses. Tapping gear opens settings.
```

**Detailed (Dev Mode)**
```
+------------------------------------------+
| (*) Connected  ctx:42%  3 pending  [cfg] |
+------------------------------------------+
Height: 44px. Additional metrics: context window usage, pending approvals count.
```

**Banner (Field Mode)**
```
+------------------------------------------+
|############## CONNECTED ################ |
+------------------------------------------+
Height: 48px. Full-width solid color background. Large text. High contrast.
```

### Behavior
- Tapping the bar when disconnected triggers a manual reconnection attempt.
- The pulse animation respects `prefers-reduced-motion` (replaced with static filled dot).
- In Dev Mode, the context window percentage updates in real-time via WebSocket.
- The bar is `position: sticky; top: 0; z-index: 100`.

### Accessibility
- `role="status"` with `aria-live="polite"`.
- Connection state changes announced to screen readers.
- Color is never the sole indicator; text label always present.

---

## Component 2: Conversation Thread

Scrollable message list showing the dialogue between the user and the OpenClaw agent.

### Message Types

**User Message**
```
+--------------------------------------+
|  Deploy the auth service             |  <- right-aligned or left with "You" label
|  to staging                          |
+--------------------------------------+  2:23 PM
```
- Background: `--color-bg-tertiary`
- Alignment: right in General mode, left with "You" label in Dev mode
- Timestamp: `--color-text-muted`, `--text-xs`

**Agent Message**
```
+--------------------------------------+
|  OpenClaw                   2:23 PM  |
|                                      |
|  I'll deploy auth-svc to staging.    |
|  Running the pipeline now.           |
|                                      |
|  **Key changes:**                    |
|  - Updated Dockerfile               |
|  - Added health check endpoint      |
+--------------------------------------+
```
- Background: `--color-bg-secondary`
- Left border: 3px solid `--color-accent`
- Supports full markdown rendering (headers, bold, italic, lists, links, code blocks, tables)

**System Message**
```
          Session started  *  2:20 PM
```
- Centered, `--color-text-muted`, `--text-sm`, no background

**Tool Output Block (within Agent Message)**
```
+------------------------------------+
| $ kubectl apply -f deploy.yaml     |
| deployment.apps/auth-svc configured|
| service/auth-svc configured        |
|                            [v More] |
+------------------------------------+
```
- Background: `--color-code-bg`
- Font: `--font-mono`, `--text-sm`
- Collapsible: first 4 lines visible, "More" to expand
- Max height when collapsed: 120px
- Border: 1px solid `--color-bg-elevated`

### Markdown Rendering

Supported elements for v1:
- Bold, italic, strikethrough
- Headings (h1-h4, rendered as h3-h6 to fit message context)
- Unordered and ordered lists
- Inline code and fenced code blocks (with language hint for syntax highlighting)
- Links (open in external browser)
- Tables (horizontally scrollable if wider than container)
- Blockquotes
- Horizontal rules

### Scroll Behavior
- Auto-scroll to bottom when new message arrives AND user is within 100px of bottom.
- If user has scrolled up, show a "New message" pill at the bottom.
- The pill shows a count if multiple messages arrive while scrolled up.
- Tapping the pill scrolls to bottom with `smooth` behavior.

### Performance
- Virtualized list for conversations exceeding 100 messages.
- Images lazy-loaded with `loading="lazy"`.
- Code blocks use `<pre>` with `white-space: pre-wrap` and `overflow-x: auto`.

---

## Component 3: Agent Activity Indicator

Shows the current state of the OpenClaw agent within the conversation context.

### States

| State | Visual | Behavior |
|-------|--------|----------|
| Idle | No indicator shown | Agent is ready for input |
| Thinking | Three animated dots in agent message area | Pulses in sequence, 1.2s cycle |
| Executing | Spinner + tool name label | `Executing: kubectl apply...` |
| Waiting | Pulsing amber dot + label | `Waiting for approval` |
| Error | Red dot + error summary | `Error: API timeout. Retry?` |
| Streaming | Cursor blink at end of growing text | Text appears token by token |

### Placement
- **General/Clinical Mode**: Appears as the last item in the conversation thread, styled as an agent message without a background.
- **Dev Mode**: Inline label after agent name in the latest message header.
- **Field Mode**: Text label in the status bar area, above the conversation.

### Animation Specs

**Thinking Dots**
```css
.thinking-dots span {
  animation: dot-pulse 1.2s infinite;
  animation-delay: calc(var(--dot-index) * 0.2s);
}
@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
```

**Executing Spinner**
```css
.exec-spinner {
  width: 16px; height: 16px;
  border: 2px solid var(--color-text-muted);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

### Accessibility
- `role="status"` with `aria-live="polite"`.
- State changes debounced at 500ms to avoid rapid announcements.
- Reduced motion: dots become a static "..." label; spinner becomes a text label.

---

## Component 4: Approval Cards

High-priority interactive cards requesting user decision. These are critical-path UI elements.

### Structure

```
+------------------------------------------+
|  [!]  Approval Required        [HIGH]    |
+------------------------------------------+
|                                          |
|  Deploy to Production                    |
|  auth-svc v2.3.1 -> v2.4.0              |
|                                          |
|  4 files changed  |  +23  -7            |
|  Tests: 12/12 passing                   |
|                                          |
|  [View Diff]                             |
|                                          |
+------------------------------------------+
|  [Reject]                    [Approve]   |
+------------------------------------------+
```

### Variants

**Swipe Card (General Mode)**
- Card slides left/right to reveal approve (right, green) or reject (left, red) action.
- Swipe threshold: 40% of card width.
- Visual feedback: card tilts slightly in swipe direction, color gradient appears.
- Snap back if threshold not reached.

**Button Card (Dev/Clinical Mode)**
- Two explicit buttons at the bottom of the card.
- Approve button: filled green, prominent.
- Reject button: outlined red, secondary.
- Optional: "Approve" requires a confirmation dialog for HIGH risk items.

**Full-Screen Card (Field Mode)**
- Takes over the entire screen.
- Oversized approve/reject buttons (64px height, full width).
- No swipe gesture; explicit taps only.
- Approve and reject buttons separated by significant vertical space (24px) to prevent mis-taps.

### Risk Levels

| Risk | Badge Color | Confirmation Required |
|------|-------------|----------------------|
| Low | `--color-info` | No |
| Medium | `--color-warning` | No |
| High | `--color-error` | Yes (Clinical/Field modes) |
| Critical | `--color-error` + pulsing border | Yes (all modes) |

### Data Schema

```typescript
interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    filesChanged?: number;
    additions?: number;
    deletions?: number;
    testsPassing?: number;
    testsTotal?: number;
    environment?: string;
    service?: string;
    version?: string;
  };
  diffPreview?: string;        // First 20 lines of unified diff
  diffFullUrl?: string;        // Link to full diff view
  createdAt: string;           // ISO 8601
  expiresAt?: string;          // ISO 8601, null = no expiry
  agentConfidence?: number;    // 0-1 scale
}
```

### Accessibility
- `role="alertdialog"` when presented as a modal/full-screen.
- `aria-label` includes risk level: "High risk approval: Deploy to Production".
- Focus trapped within the card until a decision is made.
- Keyboard: Enter to approve, Escape to reject.

---

## Component 5: Task / Project Board

Displays agent-managed tasks in either list or kanban view.

### List View

```
+------------------------------------------+
|  Tasks                     [+ Add] [view]|
+------------------------------------------+
|  Active (2)                         [-]  |
|  +--------------------------------------+|
|  |  [~] Deploy staging       HIGH       ||
|  |      auth-svc  *  in progress        ||
|  +--------------------------------------+|
|  +--------------------------------------+|
|  |  [~] Write e2e tests      MED        ||
|  |      auth module  *  in progress     ||
|  +--------------------------------------+|
|                                          |
|  To Do (3)                          [-]  |
|  +--------------------------------------+|
|  |  [ ] Fix CORS bug         MED        ||
|  |      api-gateway                     ||
|  +--------------------------------------+|
|  +--------------------------------------+|
|  |  [ ] Add rate limiting    HIGH       ||
|  |      api-gateway                     ||
|  +--------------------------------------+|
|                                          |
|  Completed (7)                      [+]  |
+------------------------------------------+
```

### Kanban View (Dev Mode only, landscape or tablet)

```
+-------------+-------------+-------------+
| TODO (3)    | PROGRESS(2) | DONE (7)    |
+-------------+-------------+-------------+
| Fix CORS    | Deploy stg  | Auth refact |
| Rate limit  | E2E tests   | Add logging |
| Update deps |             | Setup CI/CD |
|             |             | ... +4 more |
+-------------+-------------+-------------+
```

### Task Card Fields

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;          // 'agent' | 'user'
  project?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  subtasks?: { title: string; done: boolean }[];
}
```

### Interactions
- Tap a task to expand details (description, subtasks, timestamps).
- Long-press (or drag handle) to reorder within a column.
- Swipe right to mark complete; swipe left to delete (with undo toast).
- Filter by priority, assignee, or project via header controls.
- Sort by priority, date created, or date updated.

### Accessibility
- `role="list"` with `role="listitem"` for each task.
- Priority communicated via both color badge and text label.
- Status communicated via icon and screen reader text (not color alone).

---

## Component 6: Diff Viewer

Renders unified diffs for code changes. Critical for the development agency use case.

### Layout

```
+------------------------------------------+
|  src/auth/middleware.ts         [-] [x]  |
+------------------------------------------+
|  @@ -42,7 +42,12 @@ validateToken()     |
|                                          |
|    41 |  const handler = async (req) => {|
|  - 42 |  const token = getToken(req);    |
|  + 42 |  const token = getToken(req);    |
|  + 43 |  if (!token) {                   |
|  + 44 |    return res.status(401).json({ |
|  + 45 |      error: 'Unauthorized'       |
|  + 46 |    });                           |
|  + 47 |  }                               |
|    48 |  const decoded = verify(token);   |
|                                          |
+------------------------------------------+
```

### Features
- Unified diff format (no side-by-side on mobile).
- Syntax highlighting for common languages (JS/TS, Python, Go, Rust, YAML, JSON, Markdown).
- Line numbers shown in gutter.
- Addition lines: `--color-diff-add` background, `--color-diff-add-text` text.
- Removal lines: `--color-diff-remove` background, `--color-diff-remove-text` text.
- Context lines: no background highlight.
- Horizontal scroll for long lines (no wrapping of code lines).
- File header shows filename, collapsible via chevron.
- Multiple files shown as an accordion (one expanded at a time by default).

### Interactions
- Tap a file header to expand/collapse.
- "Expand All" / "Collapse All" toggle in the diff view header.
- Copy button on code blocks copies content to clipboard.
- Pinch-to-zoom disabled (use horizontal scroll instead).

### Performance
- Diffs longer than 500 lines show first 100 with "Load more" button.
- Syntax highlighting deferred to `requestIdleCallback` for large files.

---

## Component 7: Media Viewer

Displays images and video captured by the glasses camera or generated by the agent.

### Image View

```
+------------------------------------------+
|  [<]  Image Analysis           [share]   |
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  |                                      ||
|  |         (captured image)             ||
|  |                                      ||
|  |       [pinch to zoom enabled]        ||
|  |                                      ||
|  +--------------------------------------+|
|                                          |
|  OpenClaw Analysis:                      |
|  "Server rack in data center. Top blade  |
|   shows amber fault LED on PSU 2.        |
|   Recommend checking power supply."      |
|                                          |
+------------------------------------------+
```

### Features
- Pinch-to-zoom on images (unlike code, zooming images is natural).
- Double-tap to toggle fit/fill.
- Swipe between multiple images in a gallery.
- Agent analysis displayed below the image.
- Share button triggers native share sheet (via web share API).
- Images lazy-loaded, thumbnails shown first.

### Video (Future)
- Live camera preview only when explicitly requested.
- Frame capture displayed as image with analysis.
- No continuous video streaming to phone (bandwidth constraint).

---

## Component 8: Notification Toasts

Transient messages that appear and auto-dismiss. Used for agent status updates, errors, and confirmations.

### Structure

```
+------------------------------------------+
|  [icon]  Task completed: Deploy staging  |
|          3/3 pods healthy         [Undo] |
+------------------------------------------+
```

### Variants

| Type | Icon | Background | Duration | Dismissable |
|------|------|------------|----------|-------------|
| Success | Checkmark | `--color-success-bg` | 4s | Yes (swipe) |
| Error | X circle | `--color-error-bg` | 8s | Yes (swipe) |
| Warning | Triangle | `--color-warning-bg` | 6s | Yes (swipe) |
| Info | Info circle | `--color-info-bg` | 4s | Yes (swipe) |
| Action | Bell | `--color-accent-muted` | Until dismissed | Manual only |

### Positioning
- Top of screen, below the connection status bar.
- Slides down from top with `--transition-normal`.
- Stacks: max 3 visible, older ones collapse.
- Swipe right to dismiss.

### Behavior
- Toasts are queued; maximum 1 animation at a time.
- "Action" toasts (requiring user response) do not auto-dismiss.
- Tapping a toast navigates to the relevant context (e.g., tapping "Task completed" switches to Tasks tab).

### Accessibility
- `role="alert"` for error/warning, `role="status"` for success/info.
- `aria-live="assertive"` for errors, `aria-live="polite"` for others.
- Auto-dismiss paused while screen reader is reading the toast.

---

## Component 9: Settings Panel

Configuration interface for the webview and agent behavior.

### Sections

```
+------------------------------------------+
|  Settings                                |
+------------------------------------------+
|                                          |
|  DISPLAY MODE                            |
|  +--------------------------------------+|
|  | [General] [Dev] [Clinical] [Field]   ||
|  +--------------------------------------+|
|                                          |
|  CONNECTION                              |
|  +--------------------------------------+|
|  | Bridge Status        Connected    (*)||
|  | Glasses Status       Paired       (*)||
|  | Auto-Reconnect       [========]  ON  ||
|  +--------------------------------------+|
|                                          |
|  AGENT                                   |
|  +--------------------------------------+|
|  | Model               claude-sonnet >  ||
|  | System Prompt        [Edit]          ||
|  | Tool Permissions     [Configure]     ||
|  | Context Window       Show usage  [ ] ||
|  +--------------------------------------+|
|                                          |
|  NOTIFICATIONS                           |
|  +--------------------------------------+|
|  | Approval Alerts      [========]  ON  ||
|  | Task Updates         [========]  ON  ||
|  | Error Alerts         [========]  ON  ||
|  | Sound                [========]  OFF ||
|  +--------------------------------------+|
|                                          |
|  ACCESSIBILITY                           |
|  +--------------------------------------+|
|  | Reduce Motion        [========]  OFF ||
|  | High Contrast        [========]  OFF ||
|  | Large Text           [========]  OFF ||
|  +--------------------------------------+|
|                                          |
|  ACCOUNT                                 |
|  +--------------------------------------+|
|  | Email          user@example.com      ||
|  | Sign Out              [Sign Out]     ||
|  +--------------------------------------+|
|                                          |
|  v1.0.0  *  OpenClaw Bridge              |
|                                          |
+------------------------------------------+
```

### Implementation Notes
- Settings are persisted to `localStorage` and synced to the server when connected.
- Mode selection triggers a CSS class change on `<html>` element and re-renders affected components.
- Agent configuration (model, system prompt) requires confirmation dialog.
- Toggle switches use standard `<input type="checkbox">` with custom styling for accessibility.

---

## Component 10: Quick Action Bar

Context-sensitive action bar that appears above the keyboard or at the bottom of the conversation view.

### Default State (Chat Tab)

```
+------------------------------------------+
| [mic]  Type a message...          [send] |
+------------------------------------------+
```

### With Quick Actions Expanded

```
+------------------------------------------+
| [Photo] [Task] [Approve All] [Clear]     |
+------------------------------------------+
| [mic]  Type a message...          [send] |
+------------------------------------------+
```

### Actions by Context

| Context | Available Actions |
|---------|-------------------|
| Chat (idle) | Send message, Voice input, Attach photo |
| Chat (agent thinking) | Cancel request |
| Approval pending | Approve, Reject, View diff |
| Task view | New task, Filter, Sort |
| Diff view | Copy, Share, Approve changes |

### Behavior
- Quick actions expand when user taps a "+" or "..." button.
- Actions are context-sensitive: different actions appear based on current tab and agent state.
- Voice input button triggers native speech recognition (Web Speech API) as a text input alternative.
- Send button disabled when input is empty; enabled with `--color-accent` fill when text is present.

### Accessibility
- All buttons have `aria-label` descriptions.
- Tab order follows left-to-right, with send button last.
- Minimum touch target: `--touch-min` (44px default).

---

## Shared Patterns

### Loading Skeleton

```
+--------------------------------------+
|  [_____] [____________]              |  <- animated shimmer
|  [______________________________]    |
|  [___________________]               |
+--------------------------------------+
```
- Used when fetching conversation history, task lists, or diff content.
- Shimmer animation: left-to-right gradient sweep, 1.5s cycle.
- Matches the approximate layout of the content being loaded.

### Empty State

```
+--------------------------------------+
|                                      |
|          (illustration/icon)         |
|                                      |
|     No conversations yet.            |
|     Say something to your glasses    |
|     or type a message below.         |
|                                      |
+--------------------------------------+
```
- Each tab has a unique empty state message and optional illustration.
- Includes a primary action button (e.g., "Start a conversation", "Create a task").

### Confirmation Dialog

```
+--------------------------------------+
|                                      |
|   Deploy to production?              |
|                                      |
|   This action will affect 3          |
|   services in the production         |
|   environment.                       |
|                                      |
|   [Cancel]              [Confirm]    |
|                                      |
+--------------------------------------+
```
- Used for high-risk approvals and destructive actions.
- Backdrop: semi-transparent black overlay.
- Dialog: `--color-bg-tertiary`, `--radius-lg`, `--shadow-lg`.
- Focus trapped within dialog.
- Escape key dismisses (same as Cancel).

### Pull-to-Refresh

```
        (arrow rotates as user pulls)
              |
              v
+--------------------------------------+
|  (content list begins here)          |
```
- Threshold: 80px pull distance.
- Arrow icon rotates 180 degrees at threshold.
- Release triggers refresh; spinner replaces arrow during fetch.
- Haptic feedback at threshold point (Vibration API where available).
