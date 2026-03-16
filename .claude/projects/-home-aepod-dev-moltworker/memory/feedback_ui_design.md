---
name: UI Design Direction
description: Use shadcn/ui for webview app. Grid-based home, visible drawer edges, no hamburger/wrench. Track timeline format for workflows.
type: feedback
---

UI design decisions for the Clawdflare Bridge webview:

**Why:** User prefers shadcn/ui design system, grid-based flexible layouts, and visible drawer affordances over hidden navigation.

**How to apply:**
- Use **shadcn/ui** component library (React + Tailwind CSS)
- Homepage: **flexible grid** with replaceable widget elements (not fixed layout)
- No hamburger menu icon — left drawer should have a **visible edge/handle** to drag
- No wrench icon at top — right drawer also has **visible drag edge**
- Workflow view: use **track timeline format** (like shadcn studio timeline/kanban)
- Reference designs: shadcn-studio-figma-uikit-preview nodes 40379-82848 (dashboard) and 40379-48982 (track timeline)
- Dark theme, mobile-first, React + Tailwind + shadcn/ui
- Build the actual app with shadcn, not just mockups
