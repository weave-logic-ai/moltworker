# Smart Glasses UI/UX Design System Reference

> Comprehensive design principles for smart glasses applications covering all interaction modalities.
> Synthesized from Google Glass, Google Glimmer, Apple Vision Pro HIG, Meta Quest, Snap Spectacles,
> Microsoft HoloLens, Nielsen Norman Group, Material Design for Wear OS, MentraOS, and academic research.

---

## Table of Contents

1. [Foundational Principles](#1-foundational-principles)
2. [HUD Display Design](#2-hud-display-design)
3. [Typography for See-Through Displays](#3-typography-for-see-through-displays)
4. [Color, Contrast, and the Additive Display Model](#4-color-contrast-and-the-additive-display-model)
5. [Information Architecture and Progressive Disclosure](#5-information-architecture-and-progressive-disclosure)
6. [Micro-Interaction Design](#6-micro-interaction-design)
7. [Voice-First UX Patterns](#7-voice-first-ux-patterns)
8. [Spatial and Contextual UI](#8-spatial-and-contextual-ui)
9. [Button and Gesture Input Patterns](#9-button-and-gesture-input-patterns)
10. [Audio Feedback Design](#10-audio-feedback-design)
11. [Notification Triage](#11-notification-triage)
12. [Multi-Modal Feedback](#12-multi-modal-feedback)
13. [Accessibility](#13-accessibility)
14. [Privacy-Aware UX](#14-privacy-aware-ux)
15. [Mobile Companion App (Webview) UX](#15-mobile-companion-app-webview-ux)
16. [MentraOS-Specific Constraints](#16-mentraos-specific-constraints)
17. [Platform-Specific Reference Tables](#17-platform-specific-reference-tables)

---

## 1. Foundational Principles

These principles are shared across every major smart glasses platform and represent consensus
from Google, Apple, Meta, Snap, Microsoft, and Nielsen Norman Group.

### 1.1 Design for the Glance, Not the Session

Smart glasses are not phones. The average smartwatch interaction is under 8 seconds; smart
glasses interactions should target 1-3 seconds for passive glances and no more than 10-30
seconds for active tasks.

- **Google Glass**: "Glass works best with information that is simple, relevant, and current."
- **Wear OS**: "Help people complete tasks within seconds to avoid ergonomic discomfort."
- **NN/G**: Average phone interaction is ~70 seconds; watch/glasses sessions are
  "substantially shorter."

### 1.2 Be There When Needed, Invisible When Not

The display is an opt-in surface, not an always-on screen. Users consciously shift focus from
the real world to the UI and back.

- **Google Glass**: "Glass is designed to be there when you need it and out of the way
  when you don't."
- **Google Glimmer**: "The display is a space you opt into with focus."
- **Meta Quest**: "Avoid locking HUD content to the user's head movements."

### 1.3 Complement, Do Not Replace

Never replicate smartphone or desktop workflows. Deliver experiences unique to the head-worn,
always-present, context-aware form factor.

- **Google Glass**: "Don't try to replace a smartphone by transferring features designed
  for these devices to Glass."
- **Wear OS**: "Focus on one or two tasks rather than a full app experience."

### 1.4 Avoid the Unexpected

Poorly timed or irrelevant content on glasses is far more disruptive than on any other device
because the display is millimeters from the user's eyes and competes with their real-world
visual field.

- **Google Glass**: "Unexpected functionality and bad experiences on Glass are much worse
  than on other devices, because Glass is so close to your users' senses."

### 1.5 Fire-and-Forget Interaction Model

Users should be able to start an action quickly and immediately return to what they were
doing. The system should handle the rest asynchronously and notify upon completion.

- **Google Glass**: "Focus on a fire-and-forget usage model."
- **Zero UI**: "Technology operates invisibly in the background, responding to surroundings."

---

## 2. HUD Display Design

### 2.1 Focal vs. Peripheral Content

| Zone | Description | Content Type | Duration |
|------|-------------|-------------|----------|
| **Focal center** | Where the user actively looks | Primary content, active tasks | User-controlled |
| **Near periphery** | Visible without eye movement | Status indicators, badges, counters | Persistent |
| **Far periphery** | Requires slight eye movement | Incoming notifications, alerts | Transient (fade in/out) |

- Place primary content in the center of the field of view so users do not need to move
  their neck (Apple Vision Pro HIG, Snap Spectacles).
- Use near-peripheral space for persistent dashboard items (MentraOS dashboard vs. layouts).
- Reserve far-peripheral animation for incoming notifications; use slow fade-in (~2 seconds)
  to invite attention rather than demand it (Google Glimmer).

### 2.2 Information Density Rules

| Constraint | Guideline | Source |
|-----------|-----------|--------|
| Max characters per line | ~40 characters | MentraOS G1 (640x200 @ green mono) |
| Max lines visible | 5-7 lines depending on device | MentraOS `maxTextLines` capability |
| Total display payload | ~220 characters for full-frame text | MentraOS integration spec |
| Dashboard text limit | Under 60 characters | MentraOS content guidelines |
| Headline benchmark | 34 characters for a meaningful headline | NN/G Apple Watch study |

- Replace sentences with labels, short values, arrows, checkmarks, and progress indicators.
- If content requires scrolling or extended reading, it belongs on the phone, not the glasses.
- Show one step, one decision, or one alert at a time.

### 2.3 Depth and Spatial Placement

All major platforms converge on a ~1 meter focal distance:

| Platform | Recommended Focal Distance | Notes |
|----------|---------------------------|-------|
| Google Glimmer | ~1 meter (arm's length) | "Reduces accommodation changes" |
| Snap Spectacles | 1 meter (focus plane) | "Most comfortable for detailed content" |
| Apple Vision Pro | Centered in field of view | Keep main content in comfortable range |
| Meta Quest | Anchored in physical space | "Avoid locking to head movements" |

- Anchor information to space rather than to the user's head.
- If content must follow the user, use smoothing animation with gentle lag
  (Meta Quest guideline).
- Use depth/shadow hierarchy to communicate which elements are foreground vs. background
  (Google Glimmer shadow system).

### 2.4 Animation and Motion

| Action | Timing | Rationale |
|--------|--------|-----------|
| Notification fade-in | ~2 seconds | "Slower, more deliberate motion respects the user's periphery" (Glimmer) |
| Notification fade-out | ~1.5 seconds | Gentle dismissal without jarring disappearance |
| User input feedback | Immediate (<100ms) | Focus rings, highlights, button depression |
| Layout transition | 300-500ms | Standard for layout swap; do not exceed 500ms |
| Content auto-dismiss | configurable via `durationMs` | Match to content importance (MentraOS) |

- Avoid rapid motion that causes motion blur on low-refresh-rate displays.
- Use easing curves (ease-in-out) for all transitions.
- Never animate text content itself; only animate containers and surfaces.

---

## 3. Typography for See-Through Displays

### 3.1 Fundamental Constraints of Additive Displays

On optical see-through head-mounted displays (OST-HMDs), the display adds light on top of
the real-world view. This means:

- Black is transparent (cannot subtract light).
- Dark text on light backgrounds causes "halation" (bright bleed around text edges).
- Ambient lighting directly affects perceived contrast.
- Thin strokes vibrate and become illegible at small sizes.

### 3.2 Font Selection

| Recommendation | Source |
|----------------|--------|
| Use sans-serif fonts with adequate stroke thickness | Microsoft HoloLens, Google Glimmer |
| Avoid light/semilight weights below 42pt | Microsoft HoloLens typography guide |
| Use bold or medium weights for body text | All platforms |
| Recommended: Google Sans Flex, Segoe UI, Helvetica, Arial | Google, Microsoft |
| Custom: Even Roster Grotesk (Even Realities G1) | Engineered specifically for waveguide displays |
| Avoid serif fonts on OST displays | Research: Verdana outperforms Times New Roman |

### 3.3 Font Sizing by Distance

Size is measured in visual angle (degrees), not pixels. Traditional pixel measurements are
meaningless when the display is projected at variable depth.

**Google Glimmer minimum**: 0.6 degrees of visual angle.

**Microsoft HoloLens reference table**:

| Distance | Min Legible | Comfortable | Viewing Angle (min) | Viewing Angle (comfortable) |
|----------|------------|-------------|--------------------|-----------------------------|
| 45cm (direct manipulation) | 9-12pt / 3.1-3.9mm | 14-18pt / 5.1-6.3mm | 0.4-0.5 deg | 0.65-0.8 deg |
| 2m (far field) | 35-40pt / 12.2-14mm | 59-74pt / 20.9-26.2mm | 0.35-0.4 deg | 0.6-0.75 deg |

**Snap Spectacles interactive element sizing (at focus plane, 1m)**:

| Category | Angular Size | Physical Size at 1.1m |
|----------|-------------|----------------------|
| Minimum targetable | 2 degrees | 4.0cm |
| Recommended | 3 degrees | 6.0cm |
| Large | 4 degrees | 8.0cm |
| Minimum spacing | 1 degree apart | 2.0cm |

### 3.4 Spacing Guidelines

- **Line spacing**: at least 1.5x the font size (W3C recommendation for OST-HMDs).
- **Letter spacing**: no less than 0.12x the font size (W3C recommendation).
- **Google Sans Flex**: uses optical sizing axis to increase letter counters and spacing
  automatically.
- Increased letter spacing improves legibility more than typeface selection on transparent
  displays (research finding from ScienceDirect 2025).

### 3.5 Green Monochrome Display Typography

For devices like the Even Realities G1 with green monochrome micro-OLED:

- Green light (~555nm) aligns with peak human photopic sensitivity, maximizing perceived
  brightness at minimum power.
- Green-on-transparent provides inherently high contrast across variable lighting conditions.
- Pupil stability: green text avoids the constant dilation/contraction caused by switching
  between bright white elements and dark real-world backgrounds.
- Automatic brightness adjustment based on ambient light sensors is critical for
  all-day wearability.
- Even Realities designed Even Roster Grotesk with custom glyphs and kerning tuned
  specifically for their waveguide optics.

---

## 4. Color, Contrast, and the Additive Display Model

### 4.1 The Additive Display Problem

On traditional screens, you control the entire pixel. On see-through displays, the display
only adds light. This fundamentally changes color design:

| Traditional Screen | See-Through Display |
|-------------------|---------------------|
| Black = darkest color | Black = fully transparent |
| White = brightest | White = brightest, boldest |
| Saturated colors pop | Saturated colors vanish against bright backgrounds |
| Light backgrounds work | Light backgrounds cause halation |
| Standard contrast ratio | Additive contrast: (environment + display) / display |

### 4.2 Color Rules

**Do:**
- Use dark surfaces with bright (light/white) content.
- Use a desaturated color palette shifted toward white.
- Use white text on dark or colored back plates.
- Apply subtle textures or patterns to reduce display variations (Snap Spectacles).
- Maintain intensity rather than maximizing saturation.

**Do Not:**
- Use light surfaces with dark text (causes halation).
- Use saturated colors as the sole differentiator (they fade against real-world backgrounds).
- Rely on black for occlusion (it is transparent).
- Use gradients with opacity transitions (performance-intensive, unclear rendering).

### 4.3 Contrast Requirements

- Calculate additive contrast ratio: (environment brightness + display brightness) / display
  brightness.
- Test in multiple lighting conditions: bright sunlight, overcast, indoor fluorescent, dim room.
- Outdoor use demands high display brightness to compete with sunlight.
- Google Glimmer: "That vibrant, saturated color you love on your phone? It practically vanishes."

### 4.4 Priority-Based Color Coding (Notifications)

Research on peripheral notification systems proposes color-coded urgency:

| Priority | Color | Animation | Behavior |
|----------|-------|-----------|----------|
| Low | Green (opacity ramp) | Gradually becoming more opaque | Passive awareness |
| Medium | Yellow | Gentle up/down movement | Moderate attention request |
| High | Red/Yellow flash | Flashing pattern | Urgent interruption |

---

## 5. Information Architecture and Progressive Disclosure

### 5.1 Layered Information Strategy for Constrained Displays

Given a ~220-character display limit (MentraOS G1 at ~40x6 lines), content must be organized
in layers:

**Layer 0 -- Dashboard (persistent, <60 chars)**
- Counters, status badges, timers
- Examples: "3 unread", "Recording: 1:23", "Connected"
- Visible when user glances up; does not interrupt

**Layer 1 -- TextWall / Primary Layout (~220 chars max)**
- The current active content or response
- Single focused message or answer
- Auto-dismisses after configurable duration

**Layer 2 -- ReferenceCard (title + body)**
- Structured content for longer reference
- Title provides context; body provides detail
- Supports multi-line text for recipes, directions, etc.

**Layer 3 -- Companion App (webview, unlimited)**
- Full settings, configuration, history
- Detailed content that does not fit on glasses
- Data visualization, charts, account management

### 5.2 Progressive Disclosure Rules

1. **Show one thing at a time.** Never overlay multiple UI elements simultaneously.
2. **Reveal on demand.** Users explicitly request more detail (button press, voice command,
   or gesture).
3. **Default to the minimum.** Start with the shortest useful representation.
4. **Truncate intelligently.** If content must be shortened, preserve the actionable core and
   append "..." -- never truncate mid-word or mid-number.
5. **Provide escape routes.** Every screen must have a clear path to dismiss or go deeper.

### 5.3 Content Prioritization Framework

When formatting AI responses or any content for the HUD:

| Priority | Content Type | Example |
|----------|-------------|---------|
| 1 (must show) | Direct answer / action result | "72F, Partly Cloudy" |
| 2 (show if space) | Supporting context | "High: 78F, Low: 65F" |
| 3 (omit, defer to phone) | Background detail | "UV Index: 6, Humidity: 45%, Wind: 12mph NW" |
| 4 (never show on HUD) | Long-form content | Full weather report, multi-paragraph text |

### 5.4 Text Formatting for HUD

- Strip all markdown (headers, bold, italic, code blocks, links).
- Remove bullet points; use commas or line breaks instead.
- Replace URLs with action labels ("Open in app").
- Numbers and times should use compact formats (72F not 72 degrees Fahrenheit).
- Use line breaks deliberately to separate semantic chunks.

---

## 6. Micro-Interaction Design

### 6.1 The 1-3 Second Interaction Window

Smart glasses micro-interactions should complete in 1-3 seconds:

| Phase | Duration | Action |
|-------|----------|--------|
| Notice | 0-300ms | User perceives content in peripheral or focal zone |
| Comprehend | 300ms-1s | User reads/understands the glanceable content |
| Decide | 0-500ms | User decides to act or dismiss |
| Act | 0-1s | Single tap, voice command, or dismiss by looking away |
| Confirm | 100-300ms | System provides feedback (haptic, audio, visual) |

### 6.2 Cognitive Load Reduction

- **Consistency beats novelty.** Use the same patterns for the same actions everywhere.
- **Reduce decisions.** The system should make smart defaults; the user should confirm or
  override, not configure.
- **Predictable patterns.** Users should know what will happen before they act.
- **One action per interaction.** Do not chain multi-step flows on the glasses.
- **Adaptive interfaces.** Use NAMI-style (Neuro-Adaptive Multimodal Architecture) cognitive
  load inference where available to adjust information density dynamically.

### 6.3 Ambient Computing Patterns

- **Anticipatory design**: The system learns user behavior and proactively surfaces information
  before it is requested (e.g., showing commute time when the user leaves home).
- **Context-driven triggers**: Time, location, activity, and sensor data determine what appears.
- **Invisible technology**: The best interaction is no interaction -- the system provides value
  without requiring user input.
- **Graceful degradation**: When sensors fail or context is ambiguous, fall back to a safe
  default rather than showing nothing or showing incorrect content.

---

## 7. Voice-First UX Patterns

### 7.1 Voice as Primary Input

On smart glasses, voice is frequently the most natural input method because users' hands are
occupied and the display is too small for complex visual navigation.

**When to use voice:**
- Initiating actions ("Hey [wake word], what time is my next meeting?")
- Dictating text content
- Navigating when hands are unavailable
- Complex queries that would require many button presses

**When NOT to use voice:**
- Quiet/private environments (libraries, meetings)
- Noisy environments where recognition fails
- Social situations where speaking to glasses feels awkward
- Simple binary choices (use button tap instead)

### 7.2 Command vs. Natural Language

| Approach | When to Use | Example |
|----------|------------|---------|
| **Command** | Frequent, predictable actions | "Next", "Stop", "Take photo" |
| **Natural language** | Complex queries, first-time use | "What's on my calendar tomorrow?" |
| **Hybrid** | System detects intent from either | "Navigate home" or "Take me home" |

- Support both command and natural language for the same actions.
- Use confidence scores to decide when to execute immediately vs. confirm.
- Handle synonyms and flexible wording gracefully.

### 7.3 Conversational Flow Design

1. **Keep prompts short.** "Where to?" not "Please tell me your desired destination."
2. **Maintain context across turns.** Remember the previous exchange so users do not repeat
   themselves.
3. **Progressive prompting for new users.** List 2-3 common intents on first use, then fade
   to minimal prompts as the user learns.
4. **Quick confirmations.** "Saved." / "Sent." / "Next step." -- not verbose assistant-like
   chatter.
5. **Allow interruptions.** Users should be able to interrupt TTS at any time (MentraOS:
   `session.audio.stopAudio()`).

### 7.4 Error Recovery Patterns

| Confidence Level | System Response | Pattern Name |
|-----------------|----------------|--------------|
| High (>0.9) | Execute immediately + implicit confirmation | **Act & confirm** |
| Medium (0.6-0.9) | "Did you mean [X]?" with suggested action | **Clarification** |
| Low (0.3-0.6) | "I didn't catch that. Try saying [example]." | **Reprompt with hint** |
| Very low (<0.3) | "Sorry, I couldn't understand. Try again or tap to type." | **Graceful fallback** |
| Repeated failure | Escalate to companion app or alternative input | **Mode switch** |

- Never force users to repeat the entire utterance; ask for clarification of the ambiguous part.
- Always offer an alternative input method (button, companion app) as escape hatch.
- Provide audible confirmation for all voice-initiated actions.

### 7.5 TTS Output Best Practices

| Parameter | Recommended | Source |
|-----------|-------------|--------|
| Model for real-time | `eleven_flash_v2_5` (~75ms latency) | MentraOS |
| Model for quality | `eleven_turbo_v2_5` (~250ms latency) | MentraOS |
| Speed | 0.95-1.1x normal | Slightly faster than normal for notification-style delivery |
| Stability | 0.4-0.8 | Lower for emotional range; higher for factual content |
| Max utterance length | 1-2 sentences | Keep TTS output under 10 seconds |
| Feedback style | Compact ("Saved", "Sent") | Not verbose ("Your file has been saved successfully") |

---

## 8. Spatial and Contextual UI

### 8.1 Context-Driven Content Selection

The interface should be context-aware, not command-heavy. Map these triggers to determine what
content to display:

| Context Signal | Example Trigger | Content Decision |
|---------------|-----------------|-----------------|
| **Location** | User arrives at grocery store | Show shopping list |
| **Time** | Morning commute window | Show calendar + traffic |
| **Activity** | User is walking (IMU data) | Reduce visual density, prefer audio |
| **Environment** | Bright sunlight detected | Increase display brightness |
| **Social** | Meeting in progress | Suppress non-urgent notifications |
| **Sensor failure** | GPS unavailable | Fall back to manual input |

### 8.2 World-Locked vs. Head-Locked Content

| Type | Behavior | Use For | Avoid For |
|------|----------|---------|-----------|
| **World-locked** | Stays fixed in physical space | Navigation arrows, object labels, wayfinding | Status info, notifications |
| **Head-locked** | Follows head movement | AVOID (causes nausea, Meta guideline) | Everything except brief toast |
| **Body-locked (loose follow)** | Follows with smooth lag | Dashboard, persistent status | Precision interaction |
| **Hand-anchored** | Attached to hand position | Quick controls, contextual menus | Long-form content |

- Prefer world-locked guidance (arrows, markers) over head-locked elements for directional cues.
- If content must follow the user, use smooth animation with dampened lag.
- Attach labels to objects only when they improve understanding.

### 8.3 Snap Spectacles Field of View Reference

| Z Distance | Display Width | Display Height | Best For |
|-----------|---------------|----------------|----------|
| 35cm | 13cm | 24cm | Hand-anchored quick controls |
| 55cm | 23cm | 38cm | Arm's reach controls |
| 110cm | 53cm | 77cm | Default content (focus plane) |
| 160cm | 75cm | 112cm | Large environmental content |

Portrait aspect ratio (~3:4). Content should be centered horizontally within binocular
overlap to avoid monocular edge degradation.

---

## 9. Button and Gesture Input Patterns

### 9.1 Single-Button and Minimal-Input Vocabulary

For devices with limited physical controls (e.g., Mentra Live with programmable buttons):

| Input | Duration / Pattern | Assigned Action | Reliability |
|-------|-------------------|-----------------|-------------|
| **Single tap** | 50-100ms press | Primary action / confirm / select | Highest |
| **Double tap** | Two taps within 300ms | Secondary action / toggle mode | Medium |
| **Long press** | 500ms+ hold | Context menu / cancel / power action | High |
| **Triple tap** | Three taps within 500ms | Emergency / accessibility shortcut | Low (avoid for primary) |

Design rules:
- Single tap is always the most reliable input. Assign the most frequent action to it.
- Long press for destructive or mode-changing actions (requires deliberate intent).
- Avoid assigning critical functions to double-tap (timing ambiguity with single tap).
- Every physical input must produce immediate feedback (haptic or audio).

### 9.2 Temple Touch and Swipe Patterns

For glasses with capacitive temple controls:

| Gesture | Action | Notes |
|---------|--------|-------|
| Forward swipe | Scroll forward / next item | Natural reading direction |
| Backward swipe | Scroll back / previous item | |
| Tap | Select / confirm | Most reliable touch gesture |
| Two-finger tap | Dismiss / cancel | Alternative to long press |

### 9.3 Gesture Design Principles

- **Invisible actions need visible feedback.** Since gestures have no visual signifier,
  confirm every gesture with immediate haptic or audio response.
- **Simple > complex.** Tap and swipe are far more reliable than pinch, rotate, or drag
  on small surfaces.
- **Consistency.** Swipe right always means "forward/next"; swipe left always means
  "back/previous" -- never reassign directional semantics per app.
- **Fat-finger tolerance.** Touch targets should be at least 1cm x 1cm (NN/G recommendation).
  On small temple pads, prefer swipes over precise taps.

### 9.4 Haptic Feedback for Button/Gesture Confirmation

| Event | Haptic Pattern | Duration |
|-------|---------------|----------|
| Successful tap | Light single pulse | 50-100ms |
| Navigation (swipe) | Gentle tick | 30-50ms |
| Mode change | Double pulse | 100ms + 50ms gap + 100ms |
| Error / rejected action | Longer buzz | 200-300ms |
| Long-press threshold reached | Ramp-up pulse | Gradual increase over 500ms |

---

## 10. Audio Feedback Design

### 10.1 When to Speak vs. Display

| Condition | Prefer Audio | Prefer Display |
|-----------|-------------|----------------|
| User is walking/moving | Yes (eyes on environment) | No |
| User has hands occupied | Yes | No |
| Content is short confirmation | Yes ("Done", "Saved") | Also acceptable |
| Content requires reference | No | Yes (stays visible) |
| Environment is noisy | No | Yes |
| Environment is quiet/private | Depends on social context | Yes |
| Content includes numbers/data | Both (speak + show) | Yes |
| Device has no speaker | N/A | Yes (only option) |

### 10.2 Earcon Design

Earcons are brief musical motifs that represent system events without speech:

| Event Type | Earcon Characteristics | Duration |
|-----------|----------------------|----------|
| Success / completion | Rising tone, major interval | 200-400ms |
| Error / failure | Descending tone, minor interval | 300-500ms |
| Notification incoming | Gentle chime, neutral tone | 300-600ms |
| Recording started | Ascending two-note | 200ms |
| Recording stopped | Descending two-note | 200ms |
| Mode switch | Tonal shift | 150-300ms |

Design rules:
- Each earcon must be unique and learnable -- users should recognize meaning without
  explanation after 3-5 exposures.
- Use stereo panning and spatialization for directional cues.
- Combine earcons with TTS for critical events (play chime, then speak explanation).
- Spearcons (sped-up speech) can supplement earcons for menu navigation.

### 10.3 TTS Pacing and Prosody

- Speak at 0.95-1.1x normal speed for notification-style delivery.
- Use natural pauses between sentences (200-400ms).
- Lower stability (0.4) for empathetic/emotional content.
- Higher stability (0.8) for factual/data content.
- Keep utterances under 10 seconds; if longer, break into segments with user-controlled
  continuation.

### 10.4 Spatial Audio Cues

- Position audio sources to match the direction of relevant content.
- Notification from the right = content appearing on the right of the display.
- Navigation audio should come from the direction the user should turn.
- Use bone conduction speakers (where available) for private audio that does not leak
  to bystanders.

### 10.5 MentraOS Audio Capabilities

| Feature | API | Notes |
|---------|-----|-------|
| Text-to-speech | `session.audio.speak(text, options?)` | ElevenLabs-powered, 75ms latency |
| Audio file playback | `session.audio.playAudio({ audioUrl, volume? })` | MP3/WAV/OGG/M4A |
| Stop audio | `session.audio.stopAudio()` | Interruption support |
| Check pending | `session.audio.hasPendingRequest()` | Prevent audio queue overflow |
| Speaker detection | `session.capabilities?.hasSpeaker` | Fall back to phone or display |
| Private speaker check | `session.capabilities.speaker?.isPrivate` | Bone conduction detection |

---

## 11. Notification Triage

### 11.1 The Interruption Problem

Research shows that even unimportant notifications frequently interrupt users during primary
tasks, leading to distraction and performance degradation. On smart glasses, this problem is
amplified because the interface competes directly with the user's real-world visual field.

### 11.2 Priority Filtering Framework

| Level | Display Method | Interruption | Example |
|-------|---------------|-------------|---------|
| **Critical** | Full layout + audio alert + haptic | Immediate, full attention | Emergency alert, incoming call |
| **High** | Layout with gentle fade-in | Moderate, user decides timing | Direct message from priority contact |
| **Medium** | Dashboard badge only | Minimal, glanceable | Email from known sender |
| **Low** | Suppressed; batched to companion app | None | Social media, promotions |
| **Silent** | Not forwarded to glasses at all | None | Marketing, system updates |

### 11.3 Notification Filtering Implementation (MentraOS)

```typescript
session.events.onPhoneNotifications((notifications) => {
  const priorityApps = ['Messages', 'Phone', 'Calendar'];
  const mediumApps = ['Email', 'Slack'];

  notifications.forEach(notification => {
    if (priorityApps.includes(notification.app)) {
      // High priority: show immediately as layout
      session.layouts.showTextWall(
        `${notification.app}: ${notification.title}`,
        { durationMs: 5000, priority: 'HIGH' }
      );
    } else if (mediumApps.includes(notification.app)) {
      // Medium: dashboard badge only
      session.dashboard.content.writeToMain(
        `${notification.app}: ${notification.title}`
      );
    }
    // Low priority: silently ignored on glasses
  });
});
```

### 11.4 Notification Design Rules

1. **Notifications must be short, action-oriented, and immediately understandable.**
   BBC benchmark: meaningful in 34 characters.
2. **Never queue multiple notifications visually.** Show the latest; batch the rest.
3. **Use peripheral visual cues for non-urgent notifications** (opacity ramp, not flashing).
4. **Context-aware suppression:** Suppress during driving, exercise, or meetings.
5. **User-configurable filters.** Let users set priority apps in the companion app.
6. **Only 9.4% of watch notifications result in interaction** (NN/G) -- design for the 90.6%
   that are dismissed. Make dismissal effortless.
7. **Notification sound design:** Use distinct earcons per notification category to allow
   audio-only triage without looking.

---

## 12. Multi-Modal Feedback

### 12.1 Combining Visual + Audio + Haptic

The most effective feedback uses multiple channels simultaneously, each reinforcing the same
message:

| Event | Visual | Audio | Haptic |
|-------|--------|-------|--------|
| **Action confirmed** | Brief green checkmark or text "Done" | Rising two-note earcon | Light single pulse (50ms) |
| **Error occurred** | Red/amber indicator + error text | Descending tone | Longer buzz (200ms) |
| **State change** | UI transition animation | Mode-switch earcon | Double pulse |
| **Recording started** | "REC" indicator on dashboard | Ascending tone | Sustained light vibration |
| **Notification received** | Fade-in from periphery | Gentle chime | Quick tap |
| **Voice command accepted** | Confirmation text on HUD | Spoken confirmation | Light tap |

### 12.2 Synchronization Requirements

- Haptic feedback must be triggered at the exact moment of the corresponding visual event
  (button depression peak, animation apex).
- Out-of-sync haptics feel "broken" and "unsettling" (Android haptics guidelines).
- Audio and visual feedback must begin within 50ms of each other.

### 12.3 Channel Fallback Strategy

When a channel is unavailable, fall back gracefully:

```
Display available + Speaker available -> Visual + Audio + Haptic (full)
Display available + No speaker       -> Visual + Haptic (Even G1 via phone haptic)
No display + Speaker available       -> Audio + Haptic (Mentra Live)
No display + No speaker              -> Haptic only (minimal device)
```

Always check `session.capabilities` before selecting feedback channels (MentraOS pattern).

### 12.4 Over-Stimulation Prevention

- Do not fire haptics more than once per second for repeated events (causes numbness).
- Do not play overlapping audio cues; queue with 200ms minimum gap.
- Correlate feedback intensity to event importance: subtle for frequent events (scrolling),
  strong for rare important events (error, call).

---

## 13. Accessibility

### 13.1 Vision Impairment Considerations

Smart glasses serve as powerful assistive tools for people with visual impairments:

- **Text-to-speech**: Convert displayed content to audio automatically when visual
  impairment is detected or user-configured.
- **High contrast mode**: Increase text weight, size, and spacing beyond defaults.
- **Object recognition**: Announce surroundings, read text, identify faces via camera.
- **Magnification**: Enlarge text and UI elements beyond standard sizing.
- **Audio-first mode**: Complete app functionality through voice + audio alone, with
  display as optional supplement.

### 13.2 Motor Limitations

- Standard hand-gesture interfaces are inaccessible for users with post-stroke paralysis
  or limited hand mobility (HoloLens accessibility research).
- Provide voice-only interaction paths for all features.
- Single-button interaction should support all critical functions (press patterns, not
  precision gestures).
- Minimize required physical movement; avoid sustained arm-raise positions.

### 13.3 Cognitive Accessibility

- Use plain language; avoid jargon and technical terms.
- Present one choice at a time (progressive disclosure).
- Provide clear, consistent navigation patterns.
- Support face recognition to help users with cognitive impairment identify people.
- Use predictable layouts -- same information in the same place every time.
- Allow adjustable text speed for TTS.

### 13.4 Hearing Impairment

- All audio feedback must have a visual equivalent.
- All TTS content must also be displayed as text.
- Haptic feedback substitutes for audio alerts.
- Support real-time captioning (a core MentraOS use case).

### 13.5 Implementation Checklist

- [ ] All features accessible via voice alone
- [ ] All features accessible via button alone (where hardware exists)
- [ ] All audio has visual fallback
- [ ] All visual content has audio fallback
- [ ] Text size/weight adjustable
- [ ] TTS speed adjustable
- [ ] High contrast mode available
- [ ] Content readable in bright and dim conditions
- [ ] No feature requires precise hand gestures as the only input

---

## 14. Privacy-Aware UX

### 14.1 Camera Indicator Design

Camera-equipped smart glasses require unmistakable recording indicators:

| Approach | Effectiveness | Notes |
|----------|--------------|-------|
| **LED indicator (Meta approach)** | Low-medium | White LED during capture; perceived as inadequate by research -- faint, missed in sunlight |
| **On-screen badge** | Medium | "REC" text on display; only visible to wearer |
| **Bright, large LED** | Higher | Must be visible from multiple angles and in direct sunlight |
| **Audible tone on start** | Medium-high | Cannot be disabled; alerts bystanders |
| **Multi-modal indicator** | Highest | LED + sound + on-screen badge simultaneously |

Research finding: "Both LED and audio indicators were perceived as inadequate and ineffective
for notifying bystanders" under many real-world conditions (CHI 2024 paper).

### 14.2 Privacy-by-Design Principles

1. **Just-in-time consent.** Ask at the moment data is collected, in plain language.
2. **Minimal data retention.** Prefer on-device processing; do not upload unless necessary.
3. **"No capture zones."** Allow users to define locations where camera/microphone are
   automatically paused.
4. **Quick "pause sensors" control.** One-tap button to disable all sensors immediately.
5. **Obvious recording state.** The recording indicator must be hardware-controlled and
   cannot be disabled by software.
6. **Automatic blur options.** Blur faces/text in captured images by default.
7. **Transparent data flow.** Show users exactly what data leaves the device and where it goes.

### 14.3 Social Acceptability Design

- Always offer silent input paths (gaze + confirm, gesture + confirm) for environments
  where speaking aloud is socially awkward.
- Field-test whether bystanders react negatively to the glasses form factor.
- Avoid "Glasshole" behavior: do not display content that causes the wearer to disengage
  from social interaction for extended periods.
- Design for task-specific, brief interactions that minimize visible distraction.

### 14.4 MentraOS Privacy Features

- **LED indicators**: Mentra Live has RGB + white LEDs with designated privacy light purposes.
- **Permission system**: Explicit permissions (MICROPHONE, CAMERA, DISPLAY, NOTIFICATIONS)
  declared in Developer Console and enforced by cloud infrastructure.
- **Sensor control**: Individual sensor streams can be started/stopped programmatically.

---

## 15. Mobile Companion App (Webview) UX

### 15.1 Role of the Companion App

The companion app handles everything that does not belong on the glasses:

| Glasses (HUD) | Companion App (Webview) |
|---------------|------------------------|
| Glanceable status | Full settings and configuration |
| Brief answers (<220 chars) | Detailed responses, history |
| Real-time notifications | Notification filter configuration |
| Voice command input | Text input, forms, account management |
| Current context | Historical data, analytics, logs |
| Single active task | Multi-tab browsing, search |

### 15.2 Webview Architecture (MentraOS)

MentraOS companion webviews use `@mentra/react` with automatic authentication:

- **MentraAuthProvider** wraps the app for seamless auth within the MentraOS Mobile App.
- **useMentraAuth hook** provides `userId`, `frontendToken`, `isAuthenticated`, `logout()`.
- **Browser fallback** via OAuth flow for direct web access outside the MentraOS app.
- **Authenticated API calls** use Bearer token from the auth hook.

### 15.3 Companion App Design Patterns

1. **Settings and Preferences**: Notification filters, voice/display preferences, account
   management. Use standard mobile UI patterns (lists, toggles, sliders).
2. **History and Logs**: Conversation history, photo gallery, transcription logs. Provide
   search and filtering.
3. **Detailed Content**: Full articles, long responses, maps, images that exceed HUD capacity.
4. **Handoff from Glasses**: When content is too complex for the HUD, display a prompt like
   "Details on phone" and deep-link to the relevant companion app screen.
5. **Onboarding and Setup**: Glasses pairing, permission granting, initial configuration.
   This is the one flow that should be fully guided with step-by-step instructions.

### 15.4 Handoff Design

- The watch/glasses show a truncated result with a call-to-action ("Open on phone").
- The companion app opens directly to the relevant detail screen (deep linking).
- Never require the user to unlock their phone and manually find the app (NN/G critique).
- Maintain visual consistency between glasses UI and companion app (same terminology,
  same information hierarchy).

---

## 16. MentraOS-Specific Constraints

### 16.1 Device Specifications

| Spec | Even Realities G1 | Vuzix Z100 | Mentra Live |
|------|-------------------|------------|-------------|
| Display | Green mono, 640x200 | Monochrome | None |
| Camera | None | None | 1080p, streaming |
| Microphone | Yes | No | Yes (VAD) |
| Speaker | No (phone audio) | No | Yes |
| Buttons | Yes | No | Yes (press, double, long) |
| LEDs | None | None | RGB + white |
| IMU | No | No | Yes |
| WiFi | No | No | Yes |

### 16.2 Display API Summary

| Layout Type | Method | Best For |
|-------------|--------|----------|
| TextWall | `showTextWall(text)` | Simple messages, AI responses |
| DoubleTextWall | `showDoubleTextWall(top, bottom)` | Header + content pairs |
| ReferenceCard | `showReferenceCard(title, text)` | Structured reference content |
| DashboardCard | `showDashboardCard(label, value)` | Key-value metrics |
| BitmapView | Advanced API | Custom pixel-level rendering (400x240) |

### 16.3 Display Constraints Summary

- **Text only** (no images except BitmapView).
- **Single color** (green on supported devices).
- **Update throttle**: 1 update per 300ms minimum.
- **Dashboard character limit**: under 60 characters.
- **Full-frame text**: ~220 characters (~40 wide x ~6 lines).
- **Auto-dismiss**: Configurable via `durationMs`.
- **Priority levels**: LOW / NORMAL / HIGH.

### 16.4 Dashboard vs. Layout Decision Matrix

| Content | Use Dashboard | Use Layout |
|---------|:------------:|:----------:|
| Status updates ("Recording: 1:23") | Yes | No |
| Notification counts ("3 unread") | Yes | No |
| AI response text | No | Yes |
| User input/output | No | Yes |
| Persistent background info | Yes | No |
| Detailed multi-line content | No | Yes |

### 16.5 Audio Integration Patterns

```typescript
// Capability-aware output selection
if (session.capabilities?.hasDisplay) {
  session.layouts.showTextWall(responseText);
}
if (session.capabilities?.hasSpeaker) {
  await session.audio.speak(responseText, {
    model_id: 'eleven_flash_v2_5',  // Ultra-low latency
    voice_settings: { speed: 1.0, stability: 0.7 }
  });
} else if (!session.capabilities?.hasDisplay) {
  // Neither display nor speaker: play through phone
  session.layouts.showTextWall('Audio not supported, playing through phone');
}
```

---

## 17. Platform-Specific Reference Tables

### 17.1 Google Glass / Glimmer

| Principle | Guideline |
|-----------|-----------|
| Display model | Additive light, dark surface + bright content |
| Color palette | Desaturated, shifted toward white |
| Typography | Google Sans Flex, min 0.6 deg visual angle |
| Focal distance | ~1 meter (arm's length) |
| Notification timing | ~2-second fade-in transition |
| Animation | Slower, more deliberate; respect periphery |
| Shadow system | Rich shadows for depth hierarchy |
| Content philosophy | "Simple, relevant, and current" |

### 17.2 Apple Vision Pro / visionOS

| Principle | Guideline |
|-----------|-----------|
| Content placement | Centered in field of view for comfort |
| Interaction model | Eyes (focus) + hands (pinch to select) |
| Immersion | Start in a window; let users control immersion level |
| Spatial audio | Position sound at the source object |
| Accessibility | Support system gestures for indirect interaction |
| Ergonomics | Minimize neck/body movement requirements |

### 17.3 Meta Quest MR

| Principle | Guideline |
|-----------|-----------|
| HUD content | Never lock to head; anchor to space or loose follow |
| Visual feedback | Hover and pressed states are critical (no physical tactile feedback) |
| Input methods | Hand tracking + controllers; support ray-casting |
| Spatial anchoring | Fix virtual objects to physical space |
| Testing | Prototype and test in-headset before implementing |
| Comfort | Ensure users are physically comfortable at all times |

### 17.4 Snap Spectacles

| Principle | Guideline |
|-----------|-----------|
| Focus plane | 1 meter from user |
| Aspect ratio | Portrait, ~3:4 |
| Minimum target size | 2 degrees angular (4cm at 1.1m) |
| Minimum spacing | 1 degree between elements (2cm at 1.1m) |
| Color model | Additive RGB; white is boldest, black is transparent |
| 3D forms | Round geometry for interactive elements |
| 2D shapes | For text and icons (legibility) |
| Input | Hands as primary interface |
| Audio | Spatial audio for directional cues |

### 17.5 Microsoft HoloLens

| Principle | Guideline |
|-----------|-----------|
| Text construction | 2D type in 3D space (not extruded 3D text) |
| Font recommendation | Segoe UI, Helvetica, Arial in regular/bold |
| Min font at 45cm | 9-12pt (0.4-0.5 deg) |
| Comfortable font at 45cm | 14-18pt (0.65-0.8 deg) |
| Min font at 2m | 35-40pt (0.35-0.4 deg) |
| Color | White text on dark/colored back plate |
| Font weight | Avoid light/semilight under 42pt |
| Fonts limit | Max 2 font families per context |
| Interaction models | GGV (Gaze, Gesture, Voice) and hand menus |

### 17.6 Wear OS / Material Design

| Principle | Guideline |
|-----------|-----------|
| Interaction time | Under 5 seconds per interaction |
| Touch target | 1cm x 1cm minimum |
| Primary surfaces | Complications and tiles |
| Content strategy | Glanceable, scannable without detailed reading |
| Offline support | Core functionality must work without network |
| Context | Update based on time, place, and activity |
| Typography | Optimized for quick glances; variable fonts supported |

---

## Appendix A: Quick Reference Card

### The 10 Commandments of Smart Glasses UX

1. **1-3 seconds max.** If it takes longer, it belongs on the phone.
2. **One thing at a time.** Never overlay multiple decisions or content pieces.
3. **Dark surface, bright content.** The additive display demands it.
4. **Bold, wide-spaced type.** Thin fonts vibrate and die on transparent displays.
5. **Speak when they are moving, display when they are still.** Match modality to activity.
6. **Every input gets instant feedback.** Haptic, audio, or visual -- within 100ms.
7. **Context decides content.** Time, place, activity, and environment drive what appears.
8. **Voice is primary, button is backup, screen is last resort.**
9. **Protect attention.** Filter ruthlessly; show only what matters right now.
10. **The phone is the escape hatch.** Anything complex hands off to the companion app.

### Display Budget Cheat Sheet

| Zone | Character Budget | Update Frequency |
|------|-----------------|-----------------|
| Dashboard (persistent) | <60 chars | Max 1/300ms |
| TextWall (primary) | ~220 chars (~40x6) | On demand |
| ReferenceCard title | ~30 chars | On demand |
| ReferenceCard body | ~190 chars | On demand |
| Notification preview | ~34 chars (NN/G benchmark) | Event-driven |
| TTS utterance | 1-2 sentences (<10 sec) | On demand |

---

## Appendix B: Sources

### Platform Guidelines
- [Google Glass Design Principles](https://developers.google.com/glass/design/principles)
- [Google: How to Design for Transparent Screens (Glimmer)](https://design.google/library/transparent-screens)
- [Google Android XR Glimmer Design Language](https://www.androidauthority.com/google-android-xr-glimmer-design-3641899/)
- [Apple: Designing for visionOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos)
- [Meta MR Design Guidelines](https://developers.meta.com/horizon/design/mr-design-guideline/)
- [Snap Spectacles: Introduction to Spatial Design](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/introduction-to-spatial-design)
- [Snap Spectacles: UI Design](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/ui-design)
- [Snap Spectacles: Positioning and Sizing Content](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/positioning-sizing-content)
- [Microsoft HoloLens Typography](https://learn.microsoft.com/en-us/windows/mixed-reality/design/typography)
- [Android Wear OS Design Principles](https://developer.android.com/design/ui/wear/guides/get-started/design-for-wearables/principles)
- [Android Haptics Design Principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles)

### MentraOS Documentation
- [MentraOS GitHub](https://github.com/Mentra-Community/MentraOS)
- [MentraOS Quickstart](https://docs.mentraglass.com/app-devs/getting-started/quickstart)
- [MentraOS Display Layouts](https://docs.mentraglass.com/app-devs/core-concepts/display/layouts)
- [MentraOS Dashboard](https://docs.mentraglass.com/app-devs/core-concepts/display/dashboard)

### Research and Analysis
- [NN/G: The Paradox of Wearable Technologies](https://www.nngroup.com/articles/paradox-wearable-technologies/)
- [NN/G: The Apple Watch UX Appraisal](https://www.nngroup.com/articles/smartwatch/)
- [NN/G: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [Text Readability in AR: Multivocal Literature Review (Springer, 2024)](https://link.springer.com/article/10.1007/s10055-024-00949-6)
- [Typeface and Spacing Legibility on OST-HMDs While Walking (ScienceDirect, 2025)](https://www.sciencedirect.com/science/article/abs/pii/S0003687025002194)
- [Priority-Dependent Notifications for Smart Glasses (De Gruyter, 2022)](https://www.degruyter.com/document/doi/10.1515/icom-2022-0022/html)
- [In Focus, Out of Privacy: Camera Glasses Privacy (CHI 2024)](https://dl.acm.org/doi/10.1145/3613904.3642242)
- [Smart Glasses for Older Adults with Cognitive Impairment (PMC, 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12633631/)
- [Smartglasses Accessibility for People with Aphasia (Nature, 2025)](https://www.nature.com/articles/s41598-025-22253-2)
- [Spearcons Improve Auditory Menu Navigation (SAGE, 2013)](https://journals.sagepub.com/doi/10.1177/0018720812450587)
- [Smart Glasses Green Text and Readability (INAIRSPACE)](https://inairspace.com/blogs/learn-with-inair/smart-glasses-green-text-the-future-of-augmented-reality-communication)
- [AR One Sans Font for AR/VR Readability](https://niteeshyadav.com/blog/how-ar-one-sans-solves-readability-in-ar-vr-environments-247217/)
- [Google Fonts: Technical Challenges for Typography in AR/VR](https://fonts.google.com/knowledge/using_type_in_ar_and_vr/technical_challenges_for_typography_in_ar_vr)

### Industry Analysis
- [Zero UI: Voice, AI, and Screenless Interface Design (Algoworks, 2026)](https://www.algoworks.com/blog/zero-ui-designing-screenless-interfaces-in-2025/)
- [VUI Design Principles Guide (Parallel HQ, 2026)](https://www.parallelhq.com/blog/voice-user-interface-vui-design-principles)
- [VUI Design Patterns Complete Guide (UI Deploy, 2025)](https://ui-deploy.com/blog/voice-user-interface-design-patterns-complete-vui-development-guide-2025)
- [Smart Glasses UX Design for Comfort and Privacy (2025)](https://www.influencers-time.com/design-smart-glasses-apps-for-user-comfort-and-privacy-in-2025/)
- [Smart Glasses vs Smartwatches: UX Shift (Onething Design)](https://www.onething.design/post/smart-glasses-vs-smartwatches-ux-shift)
- [Multi-Sensory UX: Haptics, Sound, and Visual Cues (Wings Design)](https://wings.design/multi-sensory-ux-integrating-haptics-sound-and-visual-cues-to-enhance-user-interaction/)
- [Error Recovery and Graceful Degradation (AI UX Design Guide)](https://www.aiuxdesign.guide/patterns/error-recovery)
- [Even Realities G1 Review (9to5Mac)](https://9to5mac.com/2025/01/27/review-these-ar-glasses-show-me-what-i-want-apple-to-make/)
