---
name: mentra-ux
description: Smart glasses UX patterns for voice-first interaction, contextual computing, and multi-modal experience design
model: opus
---

# MentraOS UX Design Skill

## Before You Design Flows

**Always search the docs vector index before designing interaction flows.** Confirm available events, hardware capabilities, and session lifecycle against the documentation.

```bash
npx @claude-flow/cli@latest memory search --query "mentra session events interaction" --namespace mentra-docs
```

Or use InfraNodus:

```
mcp__infranodus__retrieve_from_knowledge_base { query: "mentra voice transcription event handling" }
```

Reference docs directory: `/home/aepod/dev/moltworker/docs/mentraOS/`

Check hardware capabilities before assuming feature availability in any flow you design.

## Interaction Modalities

Ranked by priority for smart glasses use. Design for the top of this list first, then layer additional modalities.

### 1. Voice (Primary)

Natural speech is the primary input on smart glasses. Users cannot look at a keyboard or touchscreen while wearing glasses in the real world.

- Design for natural language, not commands: "What's the weather?" not "/weather"
- Handle partial and misheard input gracefully
- Confirm destructive actions: "Delete all? Say YES to confirm"
- Provide escape hatches: "Say CANCEL anytime"
- Keep voice responses under 15 seconds
- Use display + voice together: show the answer AND speak key parts
- Do not repeat what is on the display -- add context via audio
- Process only `isFinal=true` transcriptions; ignore interim results

```javascript
session.events.onTranscription(async (data) => {
  if (!data.isFinal) return; // Only process final transcriptions

  await session.layouts.showTextWall('Thinking...');
  const response = await processQuery(data.text);
  await session.layouts.showTextWall(formatForGlasses(response));
});
```

### 2. Button (Secondary)

Physical buttons on the glasses frame provide tactile confirmation and mode switching.

| Interaction | Purpose |
|------------|---------|
| Short press | Primary action: listen, confirm, advance |
| Long press | Secondary action: capture photo, cancel, open menu |
| Double press | Toggle mode, dismiss notification |

Every press must produce immediate feedback. See the UI skill for button feedback patterns.

### 3. Head Gesture (Tertiary)

Head position changes trigger contextual UI.

| Gesture | Action |
|---------|--------|
| Look up | Show dashboard view |
| Nod | Confirm (in supported contexts) |

```javascript
session.events.onHeadPosition(async (data) => {
  if (data.position === 'up') {
    await showDashboard(session);
  }
});
```

### 4. Touch (Webview Only)

Full touch interaction is available exclusively in the phone companion webview. Never design a core glasses flow that requires touch input.

## Voice-First Design Principles

### Natural Language Over Commands

| Bad (command syntax) | Good (natural language) |
|---------------------|----------------------|
| `/weather 94043` | "What's the weather?" |
| `/timer 5m` | "Set a timer for 5 minutes" |
| `/translate es hello` | "How do you say hello in Spanish?" |
| `/note save` | "Save that as a note" |

### Handling Misheard Input

Design flows that tolerate imperfect transcription:

1. **Fuzzy matching**: "whether" should still trigger weather if context supports it
2. **Clarification prompts**: "Did you mean weather or whether?"
3. **Graceful fallback**: "I didn't catch that. Could you say it again?"
4. **No dead ends**: Every misunderstanding should offer a path forward

### Destructive Action Confirmation

Any action that deletes, sends, or permanently changes data must require explicit confirmation:

```
HUD: "Delete all notes?\nSay YES to confirm."
User: "Yes"
HUD: "Done! Notes deleted."
```

Never auto-confirm destructive actions. Never accept confirmation from a partial transcription.

## Session Lifecycle UX

Every session state must have a defined user experience.

### State Machine

```
CONNECTING -> ACTIVE -> THINKING -> RESPONSE -> IDLE -> DISCONNECTED
                ^          |            |          |          |
                |          v            v          v          v
                +--- ACTIVE <--- ACTIVE <--- ACTIVE --- RECONNECTING
```

### State-by-State Design

| State | HUD Display | Audio | Duration |
|-------|------------|-------|----------|
| Connecting | -- (pre-session) | -- | Container boot ~90s |
| Connected | "Ready" | Brief chime | 2-3 seconds |
| Active (listening) | "Listening..." | -- | Until transcription completes |
| Thinking | "Thinking..." | -- | Until AI responds |
| Response | Formatted result | Speak result (if enabled) | 3-7 seconds or until dismissed |
| Idle | Dashboard content or clear | -- | After 30s of inactivity |
| Disconnected | "Reconnecting..." | Disconnect tone | Until reconnected |
| Reconnected | "Back online" | Connect chime | 2-3 seconds, then resume |

### Key Rules

- Show "Thinking..." immediately when processing starts -- never leave the HUD blank
- Show "Reconnecting..." on disconnect, never "Error" or a stack trace
- Resume the last context after reconnection
- Clear to idle after 30 seconds of no interaction

```javascript
session.events.onDisconnected(async () => {
  await session.layouts.showTextWall('Reconnecting...');
});

session.events.onReconnected(async () => {
  await session.layouts.showTextWall('Back online');
  setTimeout(() => restoreLastContext(session), 3000);
});
```

## Contextual Intelligence

Smart glasses are worn throughout the day. Adapt behavior to context.

### Time of Day

| Time | Behavior |
|------|----------|
| Morning (6-10 AM) | Offer daily briefing: weather, calendar, commute |
| Midday (10 AM-2 PM) | Focus mode: reduce notifications, prioritize work context |
| Afternoon (2-6 PM) | Meeting prep, upcoming events |
| Evening (6-10 PM) | Summary mode: day recap, tomorrow preview |
| Night (10 PM-6 AM) | Minimal: reduce brightness references, quiet mode |

### Location Awareness

```javascript
const loc = await session.location.getLatestLocation();
```

Use location for: nearby POIs, navigation assistance, local information (weather, time zone), geo-relevant answers.

### Activity Awareness

- Do not interrupt during driving or walking unless the alert is urgent
- Reduce display updates during physical activity
- Pause non-essential notifications during meetings (check calendar)

### Battery Awareness

```javascript
session.events.onGlassesBattery(async (data) => {
  if (data.batteryLevel < 10) {
    await session.layouts.showTextWall('Battery: ' + data.batteryLevel + '%\nLow power mode on.');
    enableLowPowerMode();
  }
});
```

Below 10% battery: reduce display update frequency, disable auto-refresh, suppress non-urgent notifications.

### Calendar Integration

Use calendar data for proactive assistance:

- 5 minutes before a meeting: "Sprint Review in 5 min\nConf Room B"
- Show relevant prep info before meetings
- Suppress non-urgent notifications during calendar events

## Notification Triage

Not all notifications deserve HUD screen time. Classify and route appropriately.

### Priority Levels

| Level | Examples | Delivery |
|-------|---------|----------|
| **Urgent** | Incoming calls, timer alarms, safety alerts | Show immediately on HUD + audio |
| **Important** | Messages from favorites, calendar reminders | Show in dashboard rotation |
| **Informational** | News, social updates, app notifications | Queue for next idle period |
| **Silent** | Marketing, low-priority app updates | Log only, visible in webview |

```javascript
session.events.onPhoneNotifications(async (notifications) => {
  for (const notif of notifications) {
    switch (classifyPriority(notif)) {
      case 'urgent':
        await session.layouts.showReferenceCard({
          title: notif.app,
          text: notif.title + '\n' + truncate(notif.content, 120),
        });
        await session.audio.speak(notif.title);
        break;
      case 'important':
        await session.dashboard.write({ text: notif.title });
        break;
      case 'informational':
        queueForIdle(notif);
        break;
      // silent: log only
    }
  }
});
```

Users should be able to configure their priority thresholds in the webview settings.

## Error Recovery Patterns

Every error state must have a user-facing message and a recovery path. Never show technical details on the HUD.

### Error Messages

| Error Type | HUD Message | Recovery |
|-----------|-------------|----------|
| Network error | "No connection.\nI'll retry in a moment." | Auto-retry with backoff |
| AI timeout | "Taking longer than expected.\nTry a shorter question." | User retries |
| Camera failure | "Couldn't capture.\nHold steady and try again." | User retries |
| Auth expired | "Session expired.\nReopen the app." | User action required |
| Unknown error | "Something went wrong.\nTry again." | User retries |

### Recovery Rules

- Never show stack traces, error codes, or technical messages on the HUD
- Always tell the user what to do next
- Auto-retry network errors (up to 3 times with exponential backoff)
- Log full error details to console for debugging -- the HUD is not for developers

```javascript
try {
  const response = await queryOpenClaw(data.text);
  await session.layouts.showTextWall(formatForGlasses(response));
} catch (err) {
  console.error('[mentra-bridge] Query failed:', err);

  if (err.name === 'AbortError') {
    await session.layouts.showTextWall('Taking longer than expected.\nTry a shorter question.');
  } else if (err.message?.includes('fetch')) {
    await session.layouts.showTextWall('No connection.\nRetrying...');
    scheduleRetry(data.text, session);
  } else {
    await session.layouts.showTextWall('Something went wrong.\nTry again.');
  }
}
```

## Progressive Disclosure

Layer information across surfaces from most constrained to least constrained.

### Disclosure Stack

```
Voice Input: "What's the weather?"

Layer 1 - HUD (220 chars max):
  72F Partly Cloudy
  Wind: 5mph NE

Layer 2 - TTS (15s max):
  "It's 72 degrees and partly cloudy with light winds from the northeast."

Layer 3 - Webview (unlimited):
  7-day forecast with hourly chart
  Radar map
  Precipitation probability
  UV index and air quality
  Sunrise/sunset times
```

### Design Rules

- HUD gets the headline answer -- the minimum viable response
- TTS expands on the HUD with natural language -- adds context, not repetition
- Webview contains everything else -- full data, history, interactive elements
- If a result requires scrolling, it belongs in the webview, not the HUD
- When deferring to the webview, indicate on the HUD: "Details in app"

## Multi-Modal Feedback Matrix

Every significant system event should produce feedback on at least one channel.

| Action | Visual (HUD) | Audio (TTS/earcon) | Haptic |
|--------|-------------|-------------------|--------|
| Command received | "Listening..." | Subtle chime | -- |
| Processing | "Thinking..." | -- | -- |
| Success | Result text | Speak result (if enabled) | -- |
| Error | Error message | Error tone | -- |
| Notification | Title + preview | Notification sound | Vibrate |
| Low battery | "Battery: 10%" | "Low battery" | -- |
| Connected | "Ready" | Connect chime | -- |
| Disconnected | "Reconnecting..." | Disconnect tone | -- |
| Photo captured | "Photo taken" | Shutter sound | -- |
| Timer complete | "Timer done!" | Alarm tone | Vibrate |

### Channel Selection Rules

- Visual is the default feedback channel for all actions
- Audio supplements visual for important events and when the user may not be looking at the HUD
- Haptic is reserved for notifications and alarms that need physical attention
- At least one channel must fire for every user action
- Urgent events fire on all available channels

## Conversation Memory and Context

Smart glasses interactions are conversational, not transactional. Design for follow-up.

### Context Window

- Maintain the last **3-5 exchanges** for follow-up questions
- "What about tomorrow?" should work after a weather query
- "Tell me more" should expand the last result
- Use session context, not just individual messages

### Context Lifecycle

| Event | Context Action |
|-------|---------------|
| Session start | Initialize empty context |
| Each exchange | Append to context (FIFO, max 5) |
| 5 minutes silence | Clear context |
| Session restart | Clear context |
| Explicit reset | "Start over" clears context |

### Context Implementation

```javascript
const conversationHistory = [];
const CONTEXT_WINDOW = 5;
const CONTEXT_TIMEOUT_MS = 5 * 60 * 1000;
let lastInteractionTime = Date.now();

function addToContext(role, content) {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > CONTEXT_WINDOW) {
    conversationHistory.shift();
  }
  lastInteractionTime = Date.now();
}

function getContextMessages() {
  if (Date.now() - lastInteractionTime > CONTEXT_TIMEOUT_MS) {
    conversationHistory.length = 0;
  }
  return [...conversationHistory];
}
```

## Accessibility

### Core Principle

Every piece of information and every interaction must be available through at least two modalities. No user should be locked out because one channel is unavailable.

### Visual Accessibility

- All HUD content must also be available via TTS
- Do not rely solely on visual cues -- provide audio alternatives
- Support large text mode: fewer characters, bigger font rendered via `showBitmapView`
- High contrast is inherent (green on black) but verify edge cases

### Auditory Accessibility

- Provide haptic feedback option for deaf or hard-of-hearing users
- All audio alerts should have visual equivalents on the HUD
- TTS rate should be configurable in webview settings

### Webview Accessibility

- Must pass **WCAG 2.1 AA** compliance
- Minimum touch target size: 44x44px
- Color contrast ratio: 4.5:1 minimum for text
- Screen reader compatible (proper ARIA labels)
- Keyboard navigable

### Cognitive Accessibility

- Keep HUD messages simple and direct
- One idea per HUD screen
- Avoid jargon and technical terms in user-facing text
- Provide consistent patterns -- same action should always look the same

## Privacy UX

### Camera Privacy

- Show "Camera active" indicator on HUD when capturing
- Display "Photo taken" confirmation before sending to AI
- Never auto-capture without user-initiated action (button press or voice command)

```javascript
session.events.onButtonPress(async (data) => {
  if (data.pressType === 'long') {
    await session.layouts.showTextWall('Capturing...');
    const photo = await session.camera.requestPhoto({ purpose: 'AI analysis' });
    await session.layouts.showTextWall('Photo taken.\nAnalyzing...');
    // Process photo with user's knowledge
  }
});
```

### Public Mode

- Offer "private mode" that suppresses HUD display and uses audio-only output
- In public mode, notification content should not appear on the HUD (show "New notification" instead of the content)
- Private mode toggle via double button press or voice command: "Go private"

### Data Visibility

- Never display sensitive information (passwords, tokens, personal data) on the HUD in full
- Mask sensitive content: "Card ending in 4242" not the full number
- Clear sensitive content from HUD after 5 seconds

## Testing Heuristics

Use these questions to validate any MentraOS UX design. If the answer to any question is "no", the design needs revision.

### Core Heuristics

1. **Phone-free completion**: Can the user complete the task without looking at their phone?
2. **2-second comprehension**: Can the user understand the HUD content in under 2 seconds?
3. **Immediate feedback**: Does every button press give immediate visual feedback?
4. **Natural voice**: Are voice responses natural enough to use in public without embarrassment?
5. **Graceful degradation**: Does the app degrade gracefully without camera, mic, or network?
6. **Error recovery**: Can the user recover from every error without technical knowledge?
7. **Context continuity**: Do follow-up questions work naturally?
8. **Battery consciousness**: Does the feature avoid unnecessary battery drain?
9. **Privacy respect**: Is the user always aware when camera or mic is active?
10. **Accessibility**: Can a user with a single impaired modality still use the feature?

### Flow Validation Template

For each interaction flow, document:

```markdown
## Flow: [Name]

### Happy Path
1. User says/does: [input]
2. HUD shows: [exact text, under 220 chars]
3. Audio plays: [TTS text or earcon, under 15s]
4. Webview shows: [detailed view description]

### Error Paths
- Network failure: [HUD message] -> [recovery action]
- Misheard input: [HUD message] -> [clarification prompt]
- Timeout: [HUD message] -> [retry guidance]

### Accessibility Check
- Visual-only user: [can complete? how?]
- Audio-only user: [can complete? how?]
- Limited dexterity: [can complete? how?]

### Heuristic Results
- Phone-free: [yes/no]
- 2-second comprehension: [yes/no]
- Immediate feedback: [yes/no]
- Natural voice: [yes/no]
- Graceful degradation: [yes/no]
```

## UX Patterns Library

### Pattern: Quick Answer

The most common flow. User asks a question, gets an immediate answer.

```
User: "What time is it in Tokyo?"
HUD:  "Tokyo: 3:42 AM\nTuesday"
TTS:  "It's 3:42 AM on Tuesday in Tokyo."
```

### Pattern: Photo Analysis

User captures a photo and gets AI analysis.

```
User: [long press button]
HUD:  "Capturing..."
HUD:  "Photo taken.\nAnalyzing..."
HUD:  "Italian restaurant\nRating: 4.2 stars\nOpen until 10 PM"
TTS:  "That's an Italian restaurant rated 4.2 stars, open until 10 PM."
```

### Pattern: Multi-Turn Conversation

User has a follow-up conversation.

```
User: "What's the weather?"
HUD:  "72F Partly Cloudy\nWind: 5mph NE"
User: "What about tomorrow?"
HUD:  "Tomorrow: 68F\nRain likely afternoon"
User: "Should I bring an umbrella?"
HUD:  "Yes, 70% chance of rain\nafter 2 PM tomorrow."
```

### Pattern: Proactive Alert

System initiates based on context.

```
[Calendar event in 5 minutes]
HUD:   "Sprint Review in 5 min\nConf Room B"
Audio: [notification chime]
[User looks up]
Dashboard: "Next: Sprint Review\n2:30 PM - Conf Room B"
```

### Pattern: Guided Wizard

Multi-step flow with user confirmation at each stage.

```
User: "Send a message to Sarah"
HUD:  "What should I say?"
User: "Running 10 minutes late"
HUD:  "Send to Sarah:\nRunning 10 minutes late\nSay YES or CANCEL"
User: "Yes"
HUD:  "Message sent to Sarah."
```

## Design Checklist

Before finalizing any UX flow for MentraOS, verify each item:

- [ ] **Voice-first**: Is the primary interaction voice-driven, not touch-dependent?
- [ ] **Natural language**: Does the flow accept natural speech, not rigid commands?
- [ ] **Immediate feedback**: Does every input produce visible feedback within 300ms?
- [ ] **Loading state**: Is "Thinking..." or equivalent shown during processing?
- [ ] **Error recovery**: Does every error state tell the user what to do next?
- [ ] **Progressive disclosure**: Does info flow from HUD (summary) to webview (detail)?
- [ ] **Context memory**: Do follow-up questions work within 5 minutes?
- [ ] **Accessibility**: Is every interaction available through at least two modalities?
- [ ] **Privacy**: Is the user always aware of camera/mic activity?
- [ ] **Battery**: Does the flow avoid unnecessary polling or continuous sensor use?
- [ ] **Phone-free**: Can the core task be completed on the glasses alone?
- [ ] **Graceful degradation**: What happens without network, camera, or mic?
- [ ] **Search docs**: Have you searched `mentra-docs` namespace for capability constraints?
