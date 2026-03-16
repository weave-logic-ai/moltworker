# Design Concepts: Webview UI for Mentra Live + OpenClaw

> Four distinct design philosophies for the phone companion app.
> Each concept addresses: conversation view, task lists, diffs/code, approvals, status indicators, and agent activity.

---

## Concept A: "Command Center"

### Philosophy
The phone is a mission control dashboard. Information is dense, multi-panel, and always visible. Designed for power users (developers, DevOps engineers) who want maximum data at a glance. Inspired by terminal multiplexers (tmux), IDE sidebars, and flight control interfaces.

### Key Characteristics
- Persistent status header with live telemetry
- Compact information density with small type
- Tabbed sub-panels within each main section
- Keyboard-shortcut-inspired quick actions
- Minimal animations; instant transitions

### Screen Layout: Main View

```
+------------------------------------------+
| [=] OPENCLAW CONNECTED  [*] 3 pending    |
|     cpu: 12%  ctx: 42%  uptime: 2h14m    |
+------------------------------------------+
| [Chat] [Tasks] [Files] [Logs] [Settings] |
+------------------------------------------+
|                                          |
|  > You (14:23)                           |
|  Deploy the auth service to staging      |
|                                          |
|  < OpenClaw (14:23) [thinking 2.1s]      |
|  I'll deploy `auth-svc` to staging.      |
|  Running pipeline now.                   |
|                                          |
|  [TOOL] kubectl apply -f deploy.yaml     |
|  +-----------------------------------+   |
|  | deployment/auth-svc configured    |   |
|  | service/auth-svc configured       |   |
|  | 3/3 pods running                  |   |
|  +-----------------------------------+   |
|                                          |
|  < OpenClaw (14:24)                      |
|  Deployment complete. 3 pods healthy.    |
|  Staging URL: https://stg.example.com    |
|                                          |
+------------------------------------------+
| [mic icon]  Type a message...     [send] |
+------------------------------------------+
```

### Screen Layout: Approval View

```
+------------------------------------------+
| [=] OPENCLAW CONNECTED  [!] APPROVAL     |
+------------------------------------------+
| APPROVAL REQUEST            [HIGH RISK]  |
+------------------------------------------+
|                                          |
|  Deploy to Production                    |
|  Service: auth-svc v2.3.1               |
|  Environment: production                 |
|  Changed files: 4                        |
|                                          |
|  Diff Preview:                           |
|  +-----------------------------------+   |
|  |  src/auth/middleware.ts            |   |
|  | @@ -42,7 +42,9 @@                |   |
|  | - const token = getToken(req);    |   |
|  | + const token = getToken(req);    |   |
|  | + if (!token) {                   |   |
|  | +   return res.status(401);       |   |
|  | + }                               |   |
|  +-----------------------------------+   |
|                                          |
|  +------------------+  +---------------+ |
|  | [x] REJECT       |  | [v] APPROVE   | |
|  +------------------+  +---------------+ |
|                                          |
+------------------------------------------+
```

### Screen Layout: Task Board

```
+------------------------------------------+
| [=] OPENCLAW CONNECTED                   |
+------------------------------------------+
| [Chat] [Tasks] [Files] [Logs] [Settings] |
+------------------------------------------+
| [List] [Board]           [+ New Task]    |
+------------------------------------------+
| TODO (3)    | IN PROGRESS | DONE (7)     |
|-------------|-------------|--------------|
| [ ] Fix     | [~] Deploy  | [v] Auth     |
|   CORS bug  |   staging   |   refactor   |
|   #12 med   |   #8 high   |   #4 low     |
|             |             |              |
| [ ] Add     | [~] Write   | [v] Add      |
|   rate      |   e2e tests |   logging    |
|   limiting  |   #10 med   |   #3 low     |
|   #14 high  |             |              |
|             |             | [v] Setup    |
| [ ] Update  |             |   CI/CD      |
|   deps      |             |   #1 low     |
|   #15 low   |             |              |
+------------------------------------------+
```

### How It Handles Each Content Type

| Content | Treatment |
|---------|-----------|
| Conversation | Dense chat log with timestamps, tool output inline in bordered boxes |
| Task lists | Dual view: list (compact) or kanban board (visual) |
| Diffs/code | Inline unified diff with syntax highlighting, collapsible per file |
| Approvals | Full-screen takeover card with diff preview, explicit buttons (no swipe) |
| Status indicators | Top bar with live metrics (CPU, context window, uptime, pending count) |
| Agent activity | Inline label after agent name: `[thinking 2.1s]`, `[executing]`, `[waiting]` |

### Pros
- Maximum information density for power users
- All data visible without navigation
- Tool output shown inline reduces context switching
- Explicit approve/reject buttons prevent accidental actions

### Cons
- Overwhelming for non-technical users (medical, field)
- Small text sizes may fail accessibility in bright conditions
- Dense layout is harder to operate one-handed
- Not optimized for quick glance-and-dismiss patterns

---

## Concept B: "Glass Pane"

### Philosophy
The phone is a transparent window into the agent's mind. Minimal chrome, maximum content. Inspired by iOS design language -- clean, spacious, typographically driven. The interface recedes until it is needed. Designed for the general AI assistant use case with graceful support for technical content.

### Key Characteristics
- Large typography, generous whitespace
- Single-column scrolling layout
- Content cards that expand on tap
- Floating action button for primary actions
- Smooth slide and fade animations
- Connection status as a thin colored line (not a bar)

### Screen Layout: Main View

```
+------------------------------------------+
| ____________________________________     |
|                                          |
|            OpenClaw                      |
|     Connected  *  (green dot)            |
|                                          |
|                                          |
|    You                          2:23 PM  |
|   +--------------------------------------+
|   | Deploy the auth service              |
|   | to staging                           |
|   +--------------------------------------+
|                                          |
|                                          |
|   +--------------------------------------+
|   |  OpenClaw                   2:23 PM  |
|   |                                      |
|   |  I'll deploy auth-svc to             |
|   |  staging. Running the                |
|   |  pipeline now.                       |
|   |                                      |
|   |  +--------------------------------+  |
|   |  | Tool: kubectl apply            |  |
|   |  | 3/3 pods running   [Expand v]  |  |
|   |  +--------------------------------+  |
|   |                                      |
|   |  Deployment complete.                |
|   |  3 pods healthy.                     |
|   +--------------------------------------+
|                                          |
|                             +----------+ |
|                             | + action | |
|                             +----------+ |
+------------------------------------------+
|   Chat     Tasks    Files    Settings    |
+------------------------------------------+
```

### Screen Layout: Approval View (Slide-up Sheet)

```
+------------------------------------------+
|                                          |
|   (dimmed conversation behind)           |
|                                          |
+==========================================+
|   ----  (drag handle)                    |
|                                          |
|   Approval Required                      |
|                                          |
|   Deploy to Production                   |
|   auth-svc v2.3.1                        |
|                                          |
|   Risk: HIGH                             |
|   4 files changed, 23 additions          |
|                                          |
|   [View full diff]                       |
|                                          |
|                                          |
|   <-- Swipe to Reject | Approve -->      |
|   +--------------------------------------+
|   |  <<<  [auth-svc v2.3.1]  >>>        |
|   +--------------------------------------+
|                                          |
|                                          |
+------------------------------------------+
```

### Screen Layout: Tasks View

```
+------------------------------------------+
| ____________________________________     |
|                                          |
|   Tasks                    [+ Add]       |
|                                          |
|   Active (2)                             |
|   +--------------------------------------+
|   |  Deploy staging          IN PROGRESS |
|   |  auth-svc  *  high priority          |
|   +--------------------------------------+
|   +--------------------------------------+
|   |  Write e2e tests         IN PROGRESS |
|   |  auth module  *  medium              |
|   +--------------------------------------+
|                                          |
|   To Do (3)                              |
|   +--------------------------------------+
|   |  Fix CORS bug                   TODO |
|   |  api-gateway  *  medium              |
|   +--------------------------------------+
|   +--------------------------------------+
|   |  Add rate limiting              TODO |
|   |  api-gateway  *  high                |
|   +--------------------------------------+
|   +--------------------------------------+
|   |  Update dependencies            TODO |
|   |  all  *  low                         |
|   +--------------------------------------+
|                                          |
|   Completed (7)                    [v]   |
|                                          |
+------------------------------------------+
|   Chat     Tasks    Files    Settings    |
+------------------------------------------+
```

### How It Handles Each Content Type

| Content | Treatment |
|---------|-----------|
| Conversation | Spacious message bubbles, alternating alignment, large readable text |
| Task lists | Grouped list with collapsible sections (Active, To Do, Completed) |
| Diffs/code | Collapsed by default with "View full diff" link, expands to full-screen overlay |
| Approvals | Bottom sheet that slides up over conversation, swipe gesture to decide |
| Status indicators | Thin 2px colored line at top of screen (green=connected, amber=reconnecting, red=disconnected) |
| Agent activity | Animated typing indicator (three dots) in conversation thread |

### Pros
- Clean, approachable design suitable for all user types
- Large touch targets and generous spacing support one-handed use
- Approval sheet pattern is familiar from iOS/Android
- Expandable content prevents information overload

### Cons
- Low information density frustrates power users
- Collapsed tool output requires extra taps to inspect
- Swipe-to-approve on a bottom sheet may be awkward (swipe direction ambiguity)
- Less suitable for simultaneous multi-task monitoring

---

## Concept C: "Field Ops"

### Philosophy
The phone is a rugged field tool. Optimized for harsh conditions: bright sunlight, wet hands, gloves, one-handed operation, noisy environments. Every element is oversized, high-contrast, and impossible to miss. Inspired by military/industrial HMI (human-machine interfaces), emergency services UIs, and aviation checklists. Primary use cases: field work, medical, and any scenario where the user cannot give the phone full attention.

### Key Characteristics
- Extra-large touch targets (minimum 56x56px)
- Ultra-high contrast (white on near-black, AAA compliant)
- Color-coded status bands (full-width, impossible to miss)
- Checklist-first design (every task is a checkbox)
- Voice command hints shown as buttons
- No swipe gestures (all actions are explicit taps)

### Screen Layout: Main View

```
+------------------------------------------+
|############ CONNECTED ################## |
| (full-width green bar)                   |
+------------------------------------------+
|                                          |
|  AGENT: Ready                            |
|  Last: "Deploy auth-svc" - 2 min ago     |
|                                          |
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  |  YOU                        14:23    ||
|  |                                      ||
|  |  Deploy the auth service             ||
|  |  to staging                          ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  |  OPENCLAW                   14:24    ||
|  |                                      ||
|  |  Deployed. 3/3 pods up.              ||
|  |                                      ||
|  |  [VIEW DETAILS]                      ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
|                                          |
| +--------+ +--------+ +--------+        |
| | CHAT   | | TASKS  | | STATUS |        |
| +--------+ +--------+ +--------+        |
|                                          |
+------------------------------------------+
```

### Screen Layout: Approval View

```
+------------------------------------------+
|############ ACTION REQUIRED ############ |
| (full-width amber/orange pulsing bar)    |
+------------------------------------------+
|                                          |
|                                          |
|     DEPLOY TO PRODUCTION                 |
|     auth-svc v2.3.1                      |
|                                          |
|     RISK: HIGH                           |
|     FILES: 4 changed                     |
|     TESTS: 12/12 passing                 |
|                                          |
|                                          |
|  +--------------------------------------+|
|  |                                      ||
|  |          [VIEW DIFF]                 ||
|  |                                      ||
|  +--------------------------------------+|
|                                          |
|                                          |
|  +--------------------------------------+|
|  |         APPROVE                      ||
|  |  (large green button, 64px tall)     ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  |         REJECT                       ||
|  |  (large red button, 64px tall)       ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

### Screen Layout: Checklist View

```
+------------------------------------------+
|############ CONNECTED ################## |
+------------------------------------------+
|                                          |
|  FIELD CHECKLIST: Server Rack Install    |
|  Progress: 5 / 8 steps                  |
|  [=========>        ] 62%               |
|                                          |
+------------------------------------------+
|                                          |
|  [v]  1. Power down rack                |
|  [v]  2. Ground yourself                |
|  [v]  3. Remove old blade               |
|  [v]  4. Insert new blade               |
|  [v]  5. Connect power cables           |
|  [ ]  6. Connect network cables  <--    |
|  [ ]  7. Power on rack                  |
|  [ ]  8. Verify POST                    |
|                                          |
|  +--------------------------------------+|
|  | CURRENT STEP:                        ||
|  | Connect network cables               ||
|  |                                      ||
|  | Port A -> Switch 3, Port 14          ||
|  | Port B -> Switch 3, Port 15          ||
|  |                                      ||
|  | [VIEW DIAGRAM]                       ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  |     MARK COMPLETE                    ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

### How It Handles Each Content Type

| Content | Treatment |
|---------|-----------|
| Conversation | Large-text messages with "VIEW DETAILS" button for tool output (never inline) |
| Task lists | Numbered checklists with large checkboxes, progress bar, current step highlighted |
| Diffs/code | Separate full-screen view triggered by "VIEW DIFF" button, never inline |
| Approvals | Full-screen takeover with oversized approve/reject buttons, no swipe gestures |
| Status indicators | Full-width color bar across top (green/amber/red), text label included |
| Agent activity | Text label in status area: "AGENT: Thinking...", "AGENT: Executing...", "AGENT: Ready" |

### Pros
- Usable with gloves, wet hands, in bright sunlight
- Impossible to accidentally approve (large explicit buttons)
- Ultra-high contrast passes WCAG AAA
- Minimal cognitive load: one thing at a time
- Perfect for field work and medical use cases

### Cons
- Very low information density; power users will feel constrained
- No inline tool output means extra taps for developers reviewing code
- Oversized elements waste screen real estate on larger phones
- Does not scale well to complex development workflows
- Checklist paradigm does not map to all agent interactions

---

## Concept D: "Adaptive Shell" (Recommended)

### Philosophy
The phone adapts its information density and interaction patterns based on the active use case. A single core architecture with configurable "modes" that adjust layout, typography, touch targets, and content rendering. The user (or the system) selects the appropriate mode. Inspired by automotive UIs that switch between sport/comfort/eco modes, and adaptive accessibility systems.

### Key Characteristics
- Mode system: Dev, Clinical, Field, General (selectable in settings)
- Shared component library with density/size variants
- Consistent navigation and mental model across modes
- Connection status always visible, style varies by mode
- Smart defaults per mode, all overridable

### Mode Comparison

| Property | Dev Mode | Clinical Mode | Field Mode | General Mode |
|----------|----------|---------------|------------|--------------|
| Font size (body) | 14px | 16px | 18px | 16px |
| Touch target min | 44px | 48px | 56px | 44px |
| Info density | High | Medium | Low | Medium |
| Inline code/diffs | Yes | Summary only | No (link) | Collapsed |
| Approval style | Buttons | Buttons + confirm | Large buttons | Swipe cards |
| Status bar | Detailed metrics | Clean + patient ID | Full-width band | Minimal dot |
| Tab count | 5 (Chat, Tasks, Files, Logs, Settings) | 4 (Chat, Records, Actions, Settings) | 3 (Chat, Checklist, Status) | 4 (Chat, Tasks, Files, Settings) |

### Screen Layout: General Mode (Default)

```
+------------------------------------------+
| (*) Connected          OpenClaw    [gear] |
+------------------------------------------+
|                                          |
|                                          |
|     You                        2:23 PM   |
|     +------------------------------------+
|     | Deploy the auth service            |
|     | to staging                         |
|     +------------------------------------+
|                                          |
|     +------------------------------------+
|     |  OpenClaw              2:23 PM     |
|     |  ....  (typing indicator)          |
|     +------------------------------------+
|                                          |
|     +------------------------------------+
|     |  OpenClaw              2:24 PM     |
|     |                                    |
|     |  Deployed auth-svc to staging.     |
|     |  3/3 pods healthy.                 |
|     |                                    |
|     |  +------------------------------+ |
|     |  | kubectl: 3 resources applied | |
|     |  | [Expand]                      | |
|     |  +------------------------------+ |
|     |                                    |
|     +------------------------------------+
|                                          |
+------------------------------------------+
| Type a message...                 [send] |
+------------------------------------------+
|   Chat     Tasks     Files    Settings   |
+------------------------------------------+
```

### Screen Layout: Dev Mode

```
+------------------------------------------+
| (*) Connected  ctx:42%  3 pending  [cfg] |
+------------------------------------------+
| [Chat] [Tasks] [Files] [Logs] [Settings] |
+------------------------------------------+
|                                          |
|  > You (14:23)                           |
|  Deploy auth-svc to staging              |
|                                          |
|  < OpenClaw (14:23) [exec: 2.1s]        |
|  Deploying auth-svc to staging...        |
|                                          |
|  ```                                     |
|  $ kubectl apply -f deploy.yaml          |
|  deployment.apps/auth-svc configured     |
|  service/auth-svc configured             |
|  ```                                     |
|                                          |
|  < OpenClaw (14:24)                      |
|  Deployed. 3/3 pods healthy.             |
|  URL: https://stg.example.com            |
|                                          |
|  --- APPROVAL ---                        |
|  Promote to production?                  |
|  Risk: HIGH  |  4 files  |  +23/-7      |
|  [View Diff]                             |
|  [Reject]                    [Approve]   |
|  ---                                     |
|                                          |
+------------------------------------------+
| > _                                      |
+------------------------------------------+
```

### Screen Layout: Clinical Mode

```
+------------------------------------------+
| (*) Connected       Patient: J. Smith    |
+------------------------------------------+
|                                          |
|   Assessment Summary                     |
|                                          |
|   +--------------------------------------+
|   |  OpenClaw                            |
|   |                                      |
|   |  Based on the imaging results and    |
|   |  lab work, findings are consistent   |
|   |  with early-stage presentation.      |
|   |                                      |
|   |  Key Values:                         |
|   |  * WBC: 11.2 (elevated)              |
|   |  * CRP: 24 mg/L (elevated)           |
|   |  * ESR: 38 mm/hr (elevated)          |
|   |                                      |
|   |  Recommended next steps:             |
|   |  1. Order CT with contrast           |
|   |  2. Start empiric antibiotics        |
|   |  3. Consult infectious disease       |
|   +--------------------------------------+
|                                          |
|  +--------------------------------------+|
|  |  ORDER CT SCAN                       ||
|  +--------------------------------------+|
|  +--------------------------------------+|
|  |  ADD TO NOTES                        ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
| Chat    Records   Actions    Settings    |
+------------------------------------------+
```

### Screen Layout: Field Mode

```
+------------------------------------------+
|############## CONNECTED ################ |
+------------------------------------------+
|                                          |
|   Step 6 of 8                            |
|   [===========>       ] 75%             |
|                                          |
|   CONNECT NETWORK CABLES                 |
|                                          |
|   +--------------------------------------+
|   |                                      |
|   |  Port A -> Switch 3, Port 14        |
|   |  Port B -> Switch 3, Port 15        |
|   |                                      |
|   |  Use Cat6a cables from bin C.        |
|   |  Ensure click on both ends.          |
|   |                                      |
|   +--------------------------------------+
|                                          |
|  +--------------------------------------+|
|  |         [VIEW DIAGRAM]              ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  |         MARK COMPLETE                ||
|  |    (large green, 64px)               ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
| Chat       Checklist       Status        |
+------------------------------------------+
```

### How It Handles Each Content Type (by Mode)

| Content | Dev | Clinical | Field | General |
|---------|-----|----------|-------|---------|
| Conversation | Compact chat log, timestamps, inline tools | Clean messages, medical terminology highlighted | Large text, minimal messages | Spacious bubbles, clean |
| Task lists | Kanban board or compact list | Action items with patient context | Numbered checklist with progress bar | Grouped list with sections |
| Diffs/code | Inline unified diff, syntax highlighting | N/A (hidden) | N/A (link to full screen) | Collapsed with expand |
| Approvals | Inline card with buttons | Prominent card with confirmation step | Full-screen with oversized buttons | Bottom sheet with swipe |
| Status | Metrics bar (ctx%, pending, uptime) | Patient ID + connection | Full-width color band + text | Minimal dot + label |
| Agent activity | Inline `[thinking 2.1s]` label | "Analyzing..." in message area | "AGENT: Working..." in status bar | Typing dots animation |

### Pros
- Serves all four use cases without compromise
- Shared codebase with CSS custom properties for mode switching
- Users can switch modes based on their current task
- Extensible: new modes can be added without restructuring
- Accessible by default in Field mode; configurable in others

### Cons
- Higher implementation complexity (4 variants of each component)
- Risk of inconsistency if modes diverge too far over time
- Users must understand and select the right mode (or auto-detection must work)
- Testing matrix multiplied by number of modes
- Initial development cost is highest among all concepts

---

## Concept Comparison Matrix

| Criterion | A: Command Center | B: Glass Pane | C: Field Ops | D: Adaptive Shell |
|-----------|:-:|:-:|:-:|:-:|
| Developer use case | 5/5 | 3/5 | 2/5 | 5/5 |
| Medical use case | 2/5 | 3/5 | 4/5 | 4/5 |
| Field work use case | 1/5 | 2/5 | 5/5 | 5/5 |
| General assistant | 3/5 | 5/5 | 3/5 | 4/5 |
| Accessibility | 2/5 | 3/5 | 5/5 | 4/5 |
| Implementation effort | Low | Low | Low | High |
| One-handed operation | 2/5 | 4/5 | 5/5 | 4/5 |
| Information density | 5/5 | 2/5 | 1/5 | 4/5 |
| Learnability | 3/5 | 5/5 | 5/5 | 3/5 |
| Extensibility | 3/5 | 3/5 | 2/5 | 5/5 |

### Recommendation

**Concept D (Adaptive Shell)** is recommended for implementation, starting with General Mode as the default and Dev Mode as the first specialized variant. The shared component library (documented in `component-library.md`) should be built with CSS custom properties that enable mode switching via a single class change on the root element. Clinical and Field modes can be added in subsequent releases once the core architecture is validated.

For teams with limited resources, **Concept B (Glass Pane)** is the best single-mode fallback. It serves the general use case well and is the least complex to implement, while still being usable (if not optimal) for development and field work.
