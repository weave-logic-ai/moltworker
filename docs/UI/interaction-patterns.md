# Interaction Patterns: Webview UI for Mentra Live + OpenClaw

> How users interact with the phone companion app in coordination with the smart glasses.
> Covers all primary workflows, edge cases, and error states.

---

## 1. Voice Command to Phone Result

The primary interaction loop: user speaks to glasses, agent processes, phone displays result.

### Flow

```
User speaks to glasses
    |
    v
Glasses mic captures audio (VAD)
    |
    v
MentraOS Cloud transcribes (interim + final)
    |
    v
Final transcription sent to OpenClaw via webhook
    |
    v (simultaneously)
    +---> Glasses speaker: Agent responds with audio
    +---> Phone WebSocket: Message appears in conversation thread
```

### Phone Behavior

1. **Interim transcription** (if enabled):
   - A "listening" indicator appears at the bottom of the conversation thread.
   - Interim text shown in muted color, updating in real-time.
   - Text is italic and labeled "Listening..." to distinguish from final messages.

2. **Final transcription received**:
   - User message appears as a completed message bubble.
   - Agent activity indicator appears (thinking dots).
   - If the phone screen is off, a system notification is NOT sent (to avoid double-notification with glasses audio).

3. **Agent response**:
   - Response streams into the conversation thread.
   - Code blocks, diffs, and structured content render as they complete.
   - If the response includes actionable content (approval, task), the relevant component appears inline.

4. **No phone interaction required**: The user can keep the phone in their pocket. Everything is captured and visible when they next look at the screen.

### Timing Expectations

| Event | Expected Latency | Acceptable Max |
|-------|------------------|----------------|
| Voice to interim text on phone | 200-500ms | 1s |
| Voice to final transcription | 1-3s | 5s |
| Transcription to agent response start | 1-5s | 15s |
| Agent response to phone display | <100ms | 500ms |

---

## 2. Agent Pushes Content

The agent proactively sends content to the phone without a direct user prompt.

### Triggers

| Trigger | Content Type | Phone Behavior |
|---------|-------------|----------------|
| Task completed | Success toast + task update | Toast notification, task status updates in Tasks tab |
| Error occurred | Error toast + error details | Toast notification, error message in conversation |
| Approval needed | Approval card | Approval card appears in conversation, toast with "Action required" |
| Long-running task progress | Progress update | Progress bar updates in Tasks tab, optional inline message |
| Scheduled report | Report content | New message in conversation thread |
| Glasses camera capture | Image + analysis | Image appears in conversation with analysis below |

### Notification Priority

```
Critical (approval, error)
    -> Toast + sound (if enabled) + badge on tab
    -> Conversation auto-scrolls to new content (even if user scrolled up)

High (task complete, progress milestone)
    -> Toast (no sound)
    -> "New message" pill if user scrolled up

Medium (status update, info)
    -> No toast
    -> "New message" pill if user scrolled up

Low (debug info, logs)
    -> No toast, no pill
    -> Content appended to conversation/logs silently
```

### WebSocket Message Schema

```typescript
interface WSMessage {
  type: 'message' | 'approval' | 'task-update' | 'status' | 'error' | 'transcription';
  payload: {
    id: string;
    content?: string;           // Markdown text
    contentType?: string;       // 'text' | 'diff' | 'image' | 'approval' | 'task'
    metadata?: Record<string, unknown>;
    timestamp: string;          // ISO 8601
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}
```

---

## 3. User Approves or Rejects

The agent requests user authorization to proceed with an action.

### Approval Flow

```
Agent determines approval needed
    |
    v
Approval card appears in conversation
    |
    v (simultaneously)
    +---> Glasses audio: "Approval needed: Deploy to production"
    +---> Phone: Toast "Action required" + approval card in thread
    |
    v
User reviews on phone
    |
    +---> [View Diff] -> Full diff viewer opens (slide-up panel)
    |
    v
User decides
    |
    +---> Approve -> Confirmation dialog (if high/critical risk) -> Agent continues
    +---> Reject -> Optional: text input for rejection reason -> Agent acknowledges
    |
    v
Approval card updates to show decision
    |
    v
Glasses audio: "Approved. Proceeding with deployment." or "Rejected."
```

### Approval Card Lifecycle

| State | Visual | Interactive |
|-------|--------|-------------|
| Pending | Amber left border, pulsing | Approve/Reject buttons active |
| Approved | Green left border, checkmark | Read-only, buttons disabled |
| Rejected | Red left border, X mark | Read-only, buttons disabled |
| Expired | Grey left border, clock icon | Read-only, "Expired" label |

### Undo
- After approving or rejecting, a 5-second undo toast appears.
- Tapping "Undo" reverts the decision and re-activates the approval card.
- After 5 seconds, the decision is finalized and sent to the agent.

### Batch Approval
- When 3 or more approvals are pending, a "Review All" button appears at the top of the conversation.
- "Review All" opens a stacked card view showing all pending approvals.
- User can approve/reject individually or use "Approve All" / "Reject All" (with confirmation).

---

## 4. Real-Time Transcription Display

Live display of what the glasses microphone is capturing.

### Display Modes

**Inline Mode (default)**
```
+--------------------------------------+
|  ...previous messages...             |
|                                      |
|  Listening...                        |
|  "deploy the auth serv..."           |  <- interim, muted, updating
+--------------------------------------+
```

**Dedicated Panel Mode (opt-in via settings)**
```
+--------------------------------------+
|  Live Transcription          [close] |
+--------------------------------------+
|  [14:23:01] deploy the auth service  |
|  [14:23:04] to staging and then      |
|  [14:23:06] run the test suite...    |  <- scrolling log
+--------------------------------------+
```

### Behavior
- Interim (non-final) transcription text updates in place, shown in `--color-text-muted` with italic style.
- When a final transcription is received, the interim text is replaced by a proper user message.
- If no speech is detected for 3 seconds, the "Listening..." indicator fades out.
- Transcription is paused/hidden when the glasses disconnect.

### Privacy Consideration
- Real-time transcription display can be disabled in settings.
- When disabled, only final transcription results appear as user messages.
- A "Live" indicator in the connection bar shows when transcription is active.

---

## 5. Task Management

Creating, completing, and prioritizing tasks via the phone webview.

### Create Task

```
User action: Tap [+ Add] in Tasks tab
    |
    v
Bottom sheet opens with task form:
    +--------------------------------------+
    |  New Task                            |
    |                                      |
    |  Title: [____________________]       |
    |  Priority: [Low] [Med] [High]        |
    |  Project: [dropdown]                 |
    |  Description: [______________]       |
    |               [______________]       |
    |                                      |
    |  [Cancel]              [Create]      |
    +--------------------------------------+
    |
    v
Task appears in "To Do" section
Agent is notified of new task
```

### Complete Task

```
Method 1: Swipe right on task card
    -> Task slides right, green checkmark revealed
    -> Task moves to "Completed" section
    -> Undo toast (5 seconds)

Method 2: Tap task -> Expand details -> Tap "Mark Complete"
    -> Same result with explicit confirmation

Method 3: Agent completes task automatically
    -> Task status updates in real-time via WebSocket
    -> Success toast: "Task completed: [title]"
```

### Reorder / Prioritize

```
Method 1: Long-press task card -> Drag to reorder
    -> Visual: Card lifts with shadow, other cards shift
    -> Drop into new position
    -> Order persisted to server

Method 2: Tap task -> Change priority via selector
    -> Task re-sorts based on priority within its status group
```

### Task-Agent Interaction

```
User creates task: "Fix the CORS bug in api-gateway"
    |
    v
Agent receives task via WebSocket
Agent begins working (status: in-progress)
    |
    v
Phone updates: task card shows "in-progress" with agent avatar
    |
    v
Agent posts progress messages in conversation thread
Agent may request approval for changes
    |
    v
Agent marks task complete
Phone updates: task moves to "Completed"
Toast: "Task completed: Fix the CORS bug"
```

---

## 6. Context Switching Between Conversations

Managing multiple agent conversations or topic threads.

### Single Conversation Model (v1)

For v1, the webview maintains a single active conversation with the agent. Historical conversations are accessible via a conversation list.

```
Conversation List (accessible from Chat tab header)
    |
    +---> Active conversation (current)
    +---> Today, 10:15 AM - "Deploy auth service"
    +---> Yesterday - "Debug payment flow"
    +---> Mar 12 - "Setup CI/CD pipeline"
```

### Switching Conversations

```
User taps conversation list icon in Chat tab header
    |
    v
Slide-in panel from left shows conversation list
    |
    v
User taps a past conversation
    |
    v
Current conversation saves scroll position and state
New conversation loads with its full history
Agent context switches (or a new agent session starts)
```

### Visual Indicators

| State | Indicator |
|-------|-----------|
| Active conversation | Green dot, bold title |
| Unread messages | Blue badge with count |
| Agent working | Spinner next to conversation title |
| Conversation archived | Muted text, "Archived" label |

### Future: Multi-Conversation (v2)

- Split-screen on tablets.
- Conversation tabs within the Chat section.
- Agent maintains separate context per conversation.
- Glasses audio always connected to the active conversation.

---

## 7. Offline and Disconnected Behavior

What happens when connectivity is lost between the phone and the bridge.

### Detection

```
WebSocket closes unexpectedly
    |
    v
Start reconnection attempts:
    Attempt 1: immediate
    Attempt 2: after 1s
    Attempt 3: after 3s
    Attempt 4: after 10s
    Subsequent: every 30s
    |
    v (during reconnection)
    Connection bar: "Reconnecting..." (amber, spinning)
    |
    v (after 60s without success)
    Connection bar: "Disconnected" (red, static)
    [Tap to reconnect] button appears
```

### Offline Capabilities

| Feature | Available Offline | Notes |
|---------|-------------------|-------|
| Read conversation history | Yes | Cached in localStorage/IndexedDB |
| Browse completed tasks | Yes | Cached |
| View cached diffs | Yes | Cached |
| Send messages | Queued | Sent when reconnected, "pending" indicator shown |
| Approve/reject | Queued | Decision queued, amber "pending" badge on card |
| Create tasks | Queued | Created locally, synced on reconnect |
| Settings changes | Yes | Applied locally, synced later |
| Real-time transcription | No | Requires active WebSocket |
| Agent activity indicator | No | Shows "Unknown" state |

### Queue Management

```
Offline action taken (e.g., send message)
    |
    v
Action stored in local queue with timestamp
    |
    v
Visual: Message appears in thread with clock icon ("pending")
    |
    v (on reconnect)
    Queue drains in order
    Pending indicators replaced with confirmed status
    |
    v (if conflict)
    Conflict toast: "Your approval for [X] may have expired. Please review."
```

### Data Persistence

```
IndexedDB schema:
    conversations/
        {id}/messages[]     -- full message history
        {id}/metadata       -- title, created, last active
    tasks[]                 -- all tasks with current status
    approvals[]             -- pending approval cards
    queue[]                 -- offline action queue
    settings                -- user preferences
```

- Maximum local storage: 50MB (IndexedDB).
- Oldest conversations evicted first when approaching limit.
- Active conversation and pending approvals are never evicted.

---

## 8. First-Time Onboarding

The experience when a user opens the webview for the first time.

### Flow

```
App opens -> MentraAuthProvider authenticates
    |
    v (if first time)
    Welcome screen:
    +--------------------------------------+
    |                                      |
    |  Welcome to OpenClaw                 |
    |                                      |
    |  Your AI assistant is connected      |
    |  to your Mentra Live glasses.        |
    |                                      |
    |  Speak to your glasses — responses   |
    |  appear here and are spoken aloud.   |
    |                                      |
    |  [Get Started]                       |
    |                                      |
    +--------------------------------------+
    |
    v
    Mode selection (optional):
    +--------------------------------------+
    |  Choose your mode:                   |
    |                                      |
    |  [General]    For everyday use       |
    |  [Developer]  For coding & DevOps    |
    |  [Clinical]   For medical workflows  |
    |  [Field]      For hands-on work      |
    |                                      |
    |  You can change this anytime         |
    |  in Settings.                        |
    |                                      |
    |  [Continue]                          |
    +--------------------------------------+
    |
    v
    Permission prompts (if needed):
    - Microphone (for voice input from phone)
    - Notifications (for background alerts)
    |
    v
    Main conversation view with first system message:
    "Connected. Say something to your glasses or type a message below."
```

### Returning Users

- No onboarding screens shown.
- Last active conversation loaded automatically.
- Connection established in background.
- If glasses are not connected, status bar shows "Glasses: Not detected" with a help link.

---

## 9. Error Handling Patterns

How errors are communicated and resolved.

### Error Categories

| Category | Source | User Impact | Phone Display |
|----------|--------|-------------|---------------|
| Connection error | WebSocket failure | Cannot send/receive | Status bar turns red, reconnection UI |
| Agent error | OpenClaw API failure | Agent cannot respond | Error message in conversation thread |
| Tool error | Agent tool execution fails | Task blocked | Error details in conversation, optional retry |
| Auth error | Token expired | Cannot access data | Redirect to login, preserve local state |
| Rate limit | API quota exceeded | Temporary block | Warning toast with retry countdown |

### Error Message Pattern

```
+--------------------------------------+
|  [!] Error                 14:23 PM  |
|                                      |
|  Failed to deploy auth-svc.          |
|  kubectl returned exit code 1.       |
|                                      |
|  +--------------------------------+  |
|  | Error: ImagePullBackOff       |  |
|  | Pod auth-svc-7f8b9c cannot    |  |
|  | pull image from registry.     |  |
|  |                      [v More] |  |
|  +--------------------------------+  |
|                                      |
|  [Retry]    [View Logs]    [Skip]    |
+--------------------------------------+
```

### Error Recovery Actions

| Error | Available Actions |
|-------|-------------------|
| Agent API timeout | Retry (same request), Retry with different model |
| Tool execution failure | Retry, Skip (continue without tool), View logs |
| Connection lost | Auto-reconnect (automatic), Manual reconnect (tap) |
| Auth expired | Re-authenticate (automatic redirect) |
| Rate limited | Wait (countdown shown), Switch model |

### Error Verbosity by Mode

| Mode | Error Detail Level |
|------|-------------------|
| Dev | Full: stack trace, raw API response, tool output |
| Clinical | Summary: one-line description + retry button |
| Field | Minimal: "Something went wrong" + retry button |
| General | Moderate: description + available actions |

---

## 10. Keyboard and Input Patterns

Text input interactions within the webview.

### Text Input Bar

```
+------------------------------------------+
| [mic]  Type a message...          [send] |
+------------------------------------------+
```

### Keyboard Behavior
- Input bar sticks to bottom when keyboard is open (`position: sticky` or `visualViewport` API).
- Conversation scrolls up to keep latest messages visible above keyboard.
- Send on Enter (single line); Shift+Enter for newline.
- Cmd/Ctrl+Enter always sends regardless of multiline state.

### Voice Input (Phone Mic)
- Tap microphone icon to start Web Speech API recognition.
- Interim results appear in the input field in real-time.
- Tap again to stop and auto-send.
- Visual: mic icon turns red with pulsing ring while recording.
- This is independent of glasses mic; it is a phone-only fallback.

### Rich Input (Future)
- Attach image from phone gallery.
- Paste code snippet with auto-formatting.
- Slash commands (e.g., `/task`, `/deploy`, `/status`) with autocomplete dropdown.

---

## 11. Gesture Reference

All supported gestures and their actions across the webview.

| Gesture | Context | Action | Mode Availability |
|---------|---------|--------|-------------------|
| Tap | Message | Expand/collapse tool output | All |
| Tap | Task card | Expand task details | All |
| Tap | Tab bar | Switch tabs | All |
| Tap | Approval button | Approve or reject | All |
| Long-press | Message | Copy text to clipboard | All |
| Long-press | Task card | Enter reorder mode | Dev, General |
| Swipe right | Approval card | Approve (General mode) | General |
| Swipe left | Approval card | Reject (General mode) | General |
| Swipe right | Task card | Mark complete | All except Field |
| Swipe left | Task card | Delete (with undo) | All except Field |
| Swipe right | Toast | Dismiss | All |
| Pull down | Conversation/Tasks | Refresh | All |
| Pinch | Image viewer | Zoom | All |
| Double-tap | Image viewer | Toggle fit/fill | All |
| Swipe left/right | Image gallery | Navigate images | All |
| Swipe from left edge | Any screen | Open conversation list | All |

### Field Mode Restrictions
- No swipe-to-approve (explicit buttons only).
- No swipe-to-delete tasks (explicit button only).
- No swipe-to-reorder (explicit drag handle or up/down buttons).
- All destructive actions require confirmation tap.

---

## 12. Deep Link Patterns

Navigation from glasses audio prompts or system notifications to specific webview screens.

### URL Scheme

```
openclaw://chat                      -> Chat tab, latest message
openclaw://chat/{messageId}          -> Chat tab, scrolled to specific message
openclaw://approval/{approvalId}     -> Approval card (full-screen in Field mode)
openclaw://task/{taskId}             -> Task detail view
openclaw://diff/{diffId}             -> Full diff viewer
openclaw://settings                  -> Settings panel
openclaw://settings/mode             -> Mode selection
```

### Glasses-to-Phone Handoff

```
Glasses audio: "I've prepared a detailed report. Check your phone for the full analysis."
    |
    v
Phone notification (if screen off):
    "OpenClaw: Full analysis ready"
    Tap -> opens openclaw://chat/{messageId}
    |
    v
Webview scrolls to the specific message with the full analysis.
```

### Implementation
- Deep links handled via the MentraOS app's URL scheme.
- Webview listens for `hashchange` events for internal navigation.
- Each navigable state produces a unique URL hash for back-button support.
- Browser history (`pushState`) used for back/forward navigation within the webview.
