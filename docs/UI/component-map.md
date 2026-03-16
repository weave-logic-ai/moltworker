# Component Map — Page by Page

Every component used on each page, its source package, and documentation link.

## Package Legend

| Prefix | Package | Source |
|--------|---------|--------|
| `ai:` | ai-elements | `npx ai-elements@latest add <name>` · [docs](https://elements.ai-sdk.dev/components/) |
| `ui:` | shadcn/ui | `npx shadcn@latest add <name>` · [docs](https://ui.shadcn.com/docs/components/) |
| `track:` | Track template theme | [repo](https://github.com/shadcnstudio/shadcn-nextjs-track-landing-page-free) |
| `studio:` | shadcn-studio | [repo](https://github.com/shadcnstudio/shadcn-studio/tree/main/src) |
| `custom:` | Custom built | Project-specific |

---

## Home Screen

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Agent Status Card | `ai:persona` | Agent avatar, name, model, status | [link](https://elements.ai-sdk.dev/components/persona) |
| Quick Actions | `ai:suggestion` | Horizontal pill buttons for common actions | [link](https://elements.ai-sdk.dev/components/suggestion) |
| Recent Workflows | `ui:card` + `ui:badge` | Workflow list with status indicators | [link](https://ui.shadcn.com/docs/components/card) |
| Notifications Feed | `custom:notification-feed` | Left-border priority items | — |
| System Pulse | `custom:status-dots` | Service health indicators | — |
| Context Usage | `ai:context` | Token/resource usage bar | [link](https://elements.ai-sdk.dev/components/context) |
| Bottom Tab Bar | `custom:tab-bar` | Chat, Comms, Admin, Settings | — |
| Edge Handles | `custom:drawer-handle` | Left/right visible drag edges | — |

## Workflow — Chat View

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Conversation Thread | `ai:conversation` | Full chat thread with grouping | [link](https://elements.ai-sdk.dev/components/conversation) |
| User Message | `ai:message` | User chat bubble | [link](https://elements.ai-sdk.dev/components/message) |
| Agent Message | `ai:message` + `ai:persona` | Agent response with avatar | [link](https://elements.ai-sdk.dev/components/message) |
| Thinking Indicator | `ai:chain-of-thought` | Expandable reasoning steps | [link](https://elements.ai-sdk.dev/components/chain-of-thought) |
| Tool Output | `ai:agent` | Tool execution with input/output | [link](https://elements.ai-sdk.dev/components/agent) |
| Code Block | `ai:code-block` | Syntax-highlighted code | [link](https://elements.ai-sdk.dev/components/code-block) |
| Diff Viewer | `custom:diff-viewer` | Unified diff (DiffMate-style) | [DiffMate](https://github.com/AkshayMoolya/DiffMate) |
| Terminal Output | `ai:terminal` | Command output display | [link](https://elements.ai-sdk.dev/components/terminal) |
| Approval Card | `ai:confirmation` | Swipe-to-approve with modal | [link](https://elements.ai-sdk.dev/components/confirmation) |
| Suggestion Chips | `ai:suggestion` | Quick reply options | [link](https://elements.ai-sdk.dev/components/suggestion) |
| Prompt Input | `ai:prompt-input` + `ai:attachments` | Rich input with mic, files | [link](https://elements.ai-sdk.dev/components/prompt-input) |
| Transcription | `ai:transcription` | Real-time voice-to-text in input | [link](https://elements.ai-sdk.dev/components/transcription) |
| New Message Pill | `custom:scroll-pill` | "New message ↓" indicator | — |
| Loading Skeleton | `ai:shimmer` | Content placeholder | [link](https://elements.ai-sdk.dev/components/shimmer) |

## Workflow — Tasks View

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Task List | `ai:task` | Individual task cards with status | [link](https://elements.ai-sdk.dev/components/task) |
| Task Queue | `ai:queue` | Ordered execution queue | [link](https://elements.ai-sdk.dev/components/queue) |
| Plan View | `ai:plan` | Multi-step plan with progress | [link](https://elements.ai-sdk.dev/components/plan) |
| Section Headers | `ui:collapsible` | In Progress / To Do / Done groups | [link](https://ui.shadcn.com/docs/components/collapsible) |
| Task Badges | `ui:badge` | Status, priority, assignee | [link](https://ui.shadcn.com/docs/components/badge) |
| Empty State | `custom:empty-state` | "No tasks" or mission statement | — |

## Workflow — Files View

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| File Tree | `ai:file-tree` | Project file browser | [link](https://elements.ai-sdk.dev/components/file-tree) |
| Code Block | `ai:code-block` | File content viewer | [link](https://elements.ai-sdk.dev/components/code-block) |
| Diff Viewer | `custom:diff-viewer` | File changes | [DiffMate](https://github.com/AkshayMoolya/DiffMate) |
| Commit | `ai:commit` | Git commit display | [link](https://elements.ai-sdk.dev/components/commit) |
| Test Results | `ai:test-results` | Test suite output | [link](https://elements.ai-sdk.dev/components/test-results) |
| Stack Trace | `ai:stack-trace` | Error display | [link](https://elements.ai-sdk.dev/components/stack-trace) |

## Workflow — Settings

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Model Selector | `ai:model-selector` | AI model picker | [link](https://elements.ai-sdk.dev/components/model-selector) |
| Context Usage | `ai:context` | Token window visualization | [link](https://elements.ai-sdk.dev/components/context) |
| Toggle Settings | `ui:switch` | Feature toggles | [link](https://ui.shadcn.com/docs/components/switch) |
| Select Dropdowns | `ui:select` | Configuration options | [link](https://ui.shadcn.com/docs/components/select) |
| Input Fields | `ui:input` | Text configuration | [link](https://ui.shadcn.com/docs/components/input) |
| Danger Actions | `ui:alert-dialog` | Destructive action confirmation | [link](https://ui.shadcn.com/docs/components/alert-dialog) |

## Left Drawer — Context Selector

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Search | `ui:input` | Filter clients/projects/workflows | [link](https://ui.shadcn.com/docs/components/input) |
| Collapsible Tree | `ui:collapsible` | Expandable hierarchy | [link](https://ui.shadcn.com/docs/components/collapsible) |
| Avatar | `ui:avatar` | Client/project initials | [link](https://ui.shadcn.com/docs/components/avatar) |
| Badge | `ui:badge` | Plan tier, workflow status | [link](https://ui.shadcn.com/docs/components/badge) |
| Drawer Container | `ui:sheet` | Slide-in panel | [link](https://ui.shadcn.com/docs/components/sheet) |

## Right Drawer — Debug Tools

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Accordion | `ui:accordion` | Collapsible sensor sections | [link](https://ui.shadcn.com/docs/components/accordion) |
| Progress | `ui:progress` | Battery, signal strength bars | [link](https://ui.shadcn.com/docs/components/progress) |
| Badge | `ui:badge` | Connection status per sensor | [link](https://ui.shadcn.com/docs/components/badge) |
| Waveform | `custom:waveform` | Mic audio visualization | — |
| Data Grid | `custom:data-pairs` | Label: value monospace display | — |
| Drawer Container | `ui:sheet` | Slide-in panel | [link](https://ui.shadcn.com/docs/components/sheet) |

## Comms Screen

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Tabs | `ui:tabs` | Email / Messages / Posts | [link](https://ui.shadcn.com/docs/components/tabs) |
| Email Row | `custom:email-row` | From, subject, preview, priority | — |
| Quick Reply | `ai:suggestion` | AI-drafted response options | [link](https://elements.ai-sdk.dev/components/suggestion) |
| Avatar | `ui:avatar` | Contact avatars | [link](https://ui.shadcn.com/docs/components/avatar) |
| Badge | `ui:badge` | Unread count, priority, channel tags | [link](https://ui.shadcn.com/docs/components/badge) |

## Admin Screen

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Service Status | `custom:service-card` | Dot + name + version + status | — |
| Quick Actions | `ui:button` | Restart, redeploy, clear cache | [link](https://ui.shadcn.com/docs/components/button) |
| Progress | `ui:progress` | Memory, CPU bars | [link](https://ui.shadcn.com/docs/components/progress) |
| Deploy List | `custom:deploy-row` | Status icon, name, time, env badge | — |
| Danger Zone | `ui:alert-dialog` | Destructive action confirmation | [link](https://ui.shadcn.com/docs/components/alert-dialog) |

## Top Bar (Global)

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Status Icons | `custom:status-bar` | QoS bars, battery, bluetooth, network | — |
| Alert Badge | `ui:badge` | Notification count | [link](https://ui.shadcn.com/docs/components/badge) |
| Agent Activity | `ai:persona` (mini) | Thinking/idle indicator | [link](https://elements.ai-sdk.dev/components/persona) |
| Notification Sheet | `ui:sheet` | Expanded notification center | [link](https://ui.shadcn.com/docs/components/sheet) |

## Toast Notifications (Global)

| Component | Package | Purpose | Docs |
|-----------|---------|---------|------|
| Toast | `ui:sonner` | Bottom toast notifications, 2s auto-dismiss | [link](https://ui.shadcn.com/docs/components/sonner) |

---

## Install Summary

```bash
# shadcn/ui components
npx shadcn@latest add card badge avatar tabs button input select switch
npx shadcn@latest add accordion collapsible sheet alert-dialog progress sonner

# ai-elements components
npx ai-elements@latest add persona prompt-input attachments message conversation
npx ai-elements@latest add chain-of-thought task queue plan confirmation suggestion
npx ai-elements@latest add context agent code-block terminal file-tree commit
npx ai-elements@latest add test-results stack-trace shimmer transcription
npx ai-elements@latest add model-selector tool

# Custom components to build
# drawer-handle, tab-bar, status-bar, notification-feed, status-dots
# diff-viewer, scroll-pill, empty-state, waveform, data-pairs
# email-row, service-card, deploy-row
```

## Component Count

| Source | Count |
|--------|-------|
| ai-elements | 22 |
| shadcn/ui | 12 |
| Custom | 13 |
| **Total** | **47** |
