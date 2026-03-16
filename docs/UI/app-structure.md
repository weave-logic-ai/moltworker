# App Structure: Clawdflare Bridge Webview

> Complete application architecture for the Clawdflare Bridge companion app.
> Covers navigation hierarchy, screen inventory, state management, and data flow.

---

## Navigation Architecture

### Shell Layout

```
+---------------------------------------------+
| [= Left Drawer]   TOP BAR   [Tool Drawer =] |
|  Context select    Status     Debug tools    |
|                                              |
|              MAIN CONTENT                    |
|     (changes based on context level)         |
|                                              |
|  [Tab 1] [Tab 2] [Tab 3] [Tab 4]            |
|              BOTTOM BAR                      |
+---------------------------------------------+
```

The app shell is a fixed viewport with three overlay surfaces (left drawer, right drawer, notification center) and two persistent bars (top bar, bottom bar). The main content area fills the remaining space and changes based on the active context and selected bottom tab.

---

## Context Hierarchy

### Three-Level Nesting: Client > Project > Workflow

```
Client (WeaveLogic)
  |
  +-- Project (Moltworker)
  |     |
  |     +-- Workflow (Deploy Fix #37)     <-- a conversation
  |     +-- Workflow (Auth Refactor)
  |     +-- Workflow (CI/CD Setup)
  |
  +-- Project (InfraMonitor)
        |
        +-- Workflow (Alert Dashboard)
        +-- Workflow (Metric Pipeline)

Client (PersonalAI)
  |
  +-- Project (Home Automation)
        |
        +-- Workflow (Light Schedules)
```

### What Each Level Provides

| Level | Provides | Example |
|-------|----------|---------|
| **Client** | Billing info, API keys, team members, global settings | WeaveLogic (Pro plan, 3 seats) |
| **Project** | Available tools, agent configs, file scope, task namespace | Moltworker (Cloudflare tools, GitHub integration) |
| **Workflow** | Conversation history, tasks, files, approvals, agent state | Deploy Fix #37 (active, 42 messages) |

### Context Breadcrumb

When a workflow is active, the top bar or left drawer trigger shows:

```
WeaveLogic > Moltworker > Deploy Fix #37
```

When no workflow is active (home screen):

```
WeaveLogic > Moltworker
```

When no project is selected:

```
WeaveLogic
```

---

## Screen Inventory

### Home Screen (Outside Workflow Context)

The home screen is the backdrop for all non-workflow activities. It appears when the user has a client and optionally a project selected, but no active workflow.

**Content:**
- Recent workflows (sorted by last activity)
- Agent status card with avatar (idle/active indicator)
- Quick actions (new workflow, resume last, view notifications)
- Notification summary (unread count, urgent items)

**Bottom Bar Tabs:**

| Tab | Icon | Purpose |
|-----|------|---------|
| Chat | Speech bubble | General AI assistant chat (NOT project-scoped) |
| Comms | Envelope | Email, messaging, posts. Communication officer + BBS hybrid |
| Admin | Server | Server management, deployments, client/project CRUD |
| Settings | Gear | Global settings (broader than workflow-level) |

### Workflow Screen (Inside Workflow Context)

When the user navigates into a specific workflow, the entire interface shifts to workflow-scoped content.

**Content:**
- Conversation thread with agent (the workflow IS the conversation)
- Inline approvals, diffs, tool outputs
- Agent avatar with status indicator

**Bottom Bar Tabs (changes from home):**

| Tab | Icon | Purpose |
|-----|------|---------|
| Chat | Speech bubble | The workflow conversation (sequential, project-scoped) |
| Tasks | Checklist | Workflow-specific tasks and subtasks |
| Files | Document | Workflow files, diffs, changed artifacts |
| Settings | Gear | Workflow-scoped settings (agent model, tools, permissions) |

---

## Drawer Architecture

### Left Drawer -- Context Selector

- **Trigger:** Hamburger icon on left side of top bar, or swipe from left edge
- **Size:** Full-width overlay (428px max)
- **Content:**
  - Search/filter bar at top
  - Client list (expandable accordion)
  - Under each client: project list (expandable)
  - Under each project: workflow list with status indicators
  - Currently active path highlighted with accent color
  - Billing info snippet per client (plan name, usage)
  - Action buttons: "New Client", "New Project", "New Workflow"
- **Behavior:**
  - Selecting a workflow navigates into it (bottom bar switches to workflow context)
  - Selecting a client/project without a workflow returns to home screen
  - Backdrop click or swipe closes the drawer

### Right Drawer -- Tool Drawer

- **Trigger:** Wrench/tool icon on right side of top bar, or swipe from right edge
- **Size:** Full-width overlay (428px max)
- **Content:** Debug tools for each Mentra Live data type:

| Sensor | Data | Display |
|--------|------|---------|
| Microphone | Live transcription, audio levels, VAD, language | Waveform visualization, status badges |
| Camera | Last captured photo, stream status, resolution | Thumbnail, settings |
| Button | Press history, gesture log | Timestamped event list |
| Speaker | TTS queue, playback status, volume | Queue list, volume slider |
| Battery | Glasses %, case %, charging state | Level bars, charging indicator |
| WiFi | SSID, signal strength, connection status | Signal strength bars |
| Location | GPS coordinates, accuracy, last update | Lat/lng display, accuracy circle |
| IMU | Accelerometer, gyroscope, orientation | 3-axis bar charts |

- **Context-aware:** Shows relevant tools for the current workflow
- **Backdrop click or swipe closes the drawer**

---

## Top Bar

### Purpose
Surfaces context-breaking information that demands attention regardless of what screen the user is on.

### Elements (left to right)

```
[= Drawer] | Breadcrumb/Title | [icons] | [Tool Drawer =]
```

**Left section:**
- Left drawer trigger (hamburger icon)
- Context breadcrumb or workflow name

**Center/Right icons:**
- Glasses connectivity (green dot = connected, amber = reconnecting, red = disconnected)
- WiFi status indicator
- Agent status indicator (idle/thinking/executing)

**Alert icons (with badges):**
- Pending approvals count
- Error count
- Urgent notification count

**Behavior:**
- Tapping alert area expands notification center (slide-down panel)
- Notification center shows: pending approvals, build failures, security alerts, deployment status

---

## Bottom Bar

### Context Switching Behavior

```
                    HOME CONTEXT                    WORKFLOW CONTEXT
                    ============                    ================
Tab 1:              Chat (general)        -->       Chat (workflow conversation)
Tab 2:              Comms                  -->       Tasks
Tab 3:              Admin                  -->       Files
Tab 4:              Settings (global)      -->       Settings (workflow-scoped)
```

The bottom bar tabs change labels and icons when entering/exiting a workflow. The transition is animated (cross-fade, 200ms).

### Tab Descriptions

**Home Context:**

1. **Chat** -- Social/broad chat. General AI assistant conversations that are NOT project-scoped. Think casual Q&A, brainstorming, general knowledge queries.

2. **Comms** -- Communication officer. Email inbox with agent-triaged priority (urgent/important/informational). Messaging threads. Posts/BBS section for drafts and shared content. Agent helps draft, triage, and respond.

3. **Admin** -- Server and infrastructure management. View status of OpenClaw, Mentra Bridge, Cloudflare Tunnel. Quick actions: restart gateway, redeploy, clear cache. CRUD operations for clients, projects, workflows. System health metrics (memory, CPU, uptime). Danger zone for destructive actions.

4. **Settings** -- Expanded namespace of settings covering: display mode, connection preferences, agent defaults, notification rules, accessibility, account management. Broader than workflow-level settings.

**Workflow Context:**

1. **Chat** -- The workflow conversation itself. Sequential message thread with the agent. Contains inline approvals, diffs, tool outputs. This IS the workflow.

2. **Tasks** -- Workflow-specific tasks. Grouped by status (active, todo, completed). Agent can create, update, and complete tasks. User can add manual tasks.

3. **Files** -- Files touched by the workflow. Shows diffs, file status (modified, added, deleted). Tap to view full diff. Inline code viewer.

4. **Settings** -- Workflow-scoped settings. Agent model selection, tool permissions, system prompt override, notification preferences for this workflow.

---

## State Management

### Active Context State

```typescript
interface AppState {
  // Context hierarchy
  activeClient: Client | null;
  activeProject: Project | null;
  activeWorkflow: Workflow | null;

  // Derived
  contextLevel: 'none' | 'client' | 'project' | 'workflow';
  bottomBarMode: 'home' | 'workflow';
  breadcrumb: string[];

  // UI state
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
  notificationCenterOpen: boolean;
  activeTab: number; // 0-3

  // Connection
  glassesConnected: boolean;
  bridgeConnected: boolean;
  agentStatus: 'idle' | 'thinking' | 'executing' | 'waiting' | 'error';
}
```

### Context Switching Rules

1. **Entering a workflow:** Bottom bar transitions to workflow tabs. Chat tab loads workflow conversation. Previous home tab selection is remembered.

2. **Exiting a workflow:** Bottom bar transitions back to home tabs. Restores previously selected home tab. Workflow state is preserved in background.

3. **Switching workflows:** Current workflow state saved. New workflow loaded. If different project, project context updates. If different client, client context updates.

4. **Creating new workflow:** Opens creation form (name, description, initial prompt). On creation, automatically enters the new workflow.

---

## Data Flow

### WebSocket Messages

```
Phone <--> Cloudflare Worker (Bridge) <--> OpenClaw Agent
                    |
                    +--> Mentra Live Glasses (via MentraOS Cloud)
```

All real-time data flows through a single WebSocket connection to the Cloudflare Worker bridge. The bridge routes messages to/from the OpenClaw agent and Mentra Live hardware.

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `user-message` | Phone --> Bridge | User typed or spoke a message |
| `agent-message` | Bridge --> Phone | Agent response (streaming or complete) |
| `approval-request` | Bridge --> Phone | Agent needs user authorization |
| `approval-response` | Phone --> Bridge | User approved or rejected |
| `task-update` | Bidirectional | Task created, updated, or completed |
| `file-change` | Bridge --> Phone | File modified, diff available |
| `status-update` | Bridge --> Phone | Agent status, connection state |
| `transcription` | Bridge --> Phone | Live speech transcription from glasses |
| `sensor-data` | Bridge --> Phone | Mentra Live sensor telemetry |
| `notification` | Bridge --> Phone | System alerts, build status, errors |

### Offline Behavior

- Conversation history cached in IndexedDB
- Messages queued locally when disconnected
- Queue drains on reconnect (FIFO order)
- Pending items shown with clock icon
- Conflict resolution: server state wins for approvals

---

## Agent Avatar System

### Visual Specification

- **Shape:** Circular, 32px diameter in message thread, 48px in status cards
- **Border:** 2px solid, color indicates status
- **Animation:** Border rotates/pulses when agent is active

### Status Indicators

| Status | Border Color | Animation |
|--------|-------------|-----------|
| Idle | `--color-text-muted` | None (static) |
| Thinking | `--color-accent` | Rotating gradient border, 2s cycle |
| Executing | `--color-warning` | Pulsing border, 1s cycle |
| Waiting | `--color-info` | Slow pulse, 3s cycle |
| Error | `--color-error` | None (static red) |

### Avatar Content

- Default: "OC" initials (for OpenClaw) on gradient background
- Future: Custom avatar images per agent
- Future: Multiple agents with different avatars in same conversation

### Placement

- Next to agent messages in conversation thread (left side)
- In agent status card on home screen
- In top bar (small, 24px) showing current agent status

---

## Screen Transition Map

```
Home Screen
  |
  +-- [Left Drawer] --> Context Selector --> Select Workflow --> Workflow Screen
  |
  +-- [Chat tab] --> General Chat
  |
  +-- [Comms tab] --> Email / Messages / Posts
  |
  +-- [Admin tab] --> Server Status / CRUD / Deployments
  |
  +-- [Settings tab] --> Global Settings
  |
  +-- [Right Drawer] --> Tool Drawer (sensor debug)
  |
  +-- [Top Bar alerts] --> Notification Center

Workflow Screen
  |
  +-- [Left Drawer] --> Context Selector --> Switch/Exit Workflow
  |
  +-- [Chat tab] --> Workflow Conversation (with inline approvals, diffs)
  |
  +-- [Tasks tab] --> Workflow Tasks
  |
  +-- [Files tab] --> Workflow Files / Diffs
  |
  +-- [Settings tab] --> Workflow Settings
  |
  +-- [Right Drawer] --> Tool Drawer (context-filtered)
  |
  +-- [Top Bar alerts] --> Notification Center
```

---

## URL Routing

```
/                           --> Home screen
/chat                       --> Home > Chat tab (general)
/comms                      --> Home > Comms tab
/admin                      --> Home > Admin tab
/settings                   --> Home > Settings tab
/w/:workflowId              --> Workflow screen > Chat tab
/w/:workflowId/tasks        --> Workflow screen > Tasks tab
/w/:workflowId/files        --> Workflow screen > Files tab
/w/:workflowId/settings     --> Workflow screen > Settings tab
```

All routes are handled client-side via hash-based routing for WebView compatibility.
