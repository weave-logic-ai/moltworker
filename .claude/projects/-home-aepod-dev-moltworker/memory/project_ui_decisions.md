---
name: UI Design Decisions from Symposium
description: Comprehensive UI decisions from user answers to symposium questions. Use AI SDK Elements, Track theme, Geist font, Discord-style chat, swipe-to-modal approvals.
type: project
---

Key UI decisions from symposium answers (2026-03-16):

**Components:** Use elements.ai-sdk.dev components (persona, chain-of-thought, task, queue, confirmation, suggestions, attachments, prompt-input, context)
**Theme:** Track landing page repo exact palette (github.com/shadcnstudio/shadcn-nextjs-track-landing-page-free)
**Font:** Geist, 16pt for readable text
**Diffs:** Use DiffMate-style (github.com/AkshayMoolya/DiffMate), unified view, full-screen option
**Chat:** Discord-style — threads, infinite scroll, auto-collapse into logical units
**Approvals:** Swipe 50% triggers modal with decision details, follow-up creation, cancel/confirm
**Status bar:** QoS bars (not pulse), battery, bluetooth, network icons
**Toasts:** Bottom over bottom bar, 2s auto-dismiss, animate into notifications
**Transcription:** In input area as greyed text that solidifies
**Context:** Client→Project→Workflow wraps all context, deep linking from notifications
**Offline:** No offline queue — gateway down = no actions
**Zoom:** Hold for magnifying glass, no pinch-to-zoom
**Agent identity:** Agent is "in the glasses", other agents use different voices (team feel)
**Agent avatars:** Use persona component, keep voice-agent identity persistent
**Errors:** Try-again + magnifying glass for logs, adjustable verbosity
**Focus:** Never steal focus, notify and escalate through repeating messages
**Target:** Chromium in MentraOS app, dev agency as primary use case
**Animations:** Minimal, fastest transitions, functional only
**Settings:** Per-conversation and global, delta tracking for rollback
**History:** Indefinite storage via OpenClaw channel
