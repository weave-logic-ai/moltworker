---
name: ai-elements
description: Vercel AI SDK Elements - 49 React components for AI chatbots, code, voice, and workflows. Install via npx ai-elements@latest add <component>.
model: sonnet
---

# Vercel AI SDK Elements

AI-native React component library built on shadcn/ui. 49 components across 4 categories.

## Installation

```bash
# Add individual components (copies source into your project)
npx ai-elements@latest add <component-name>

# Examples
npx ai-elements@latest add prompt-input
npx ai-elements@latest add persona
npx ai-elements@latest add chain-of-thought
```

Components install to `@/components/ai-elements/`. Requires React 19 + Tailwind CSS 4 + shadcn/ui initialized.

## Component Categories

### Chatbot (19 components)
| Component | Description | Docs |
|-----------|-------------|------|
| `attachments` | File upload with drag-drop, preview thumbnails | [docs](https://elements.ai-sdk.dev/components/attachments) |
| `chain-of-thought` | Expandable reasoning steps with status indicators | [docs](https://elements.ai-sdk.dev/components/chain-of-thought) |
| `checkpoint` | Save/restore conversation state | [docs](https://elements.ai-sdk.dev/components/checkpoint) |
| `confirmation` | Yes/no decision cards with description | [docs](https://elements.ai-sdk.dev/components/confirmation) |
| `context` | Token usage visualization (used/remaining) | [docs](https://elements.ai-sdk.dev/components/context) |
| `conversation` | Full chat thread with message grouping | [docs](https://elements.ai-sdk.dev/components/conversation) |
| `inline-citation` | Source references within messages | [docs](https://elements.ai-sdk.dev/components/inline-citation) |
| `message` | Single chat message (user/assistant/system) | [docs](https://elements.ai-sdk.dev/components/message) |
| `model-selector` | AI model picker dropdown | [docs](https://elements.ai-sdk.dev/components/model-selector) |
| `plan` | Multi-step plan with progress | [docs](https://elements.ai-sdk.dev/components/plan) |
| `prompt-input` | Rich input with attachments, mic, submit | [docs](https://elements.ai-sdk.dev/components/prompt-input) |
| `queue` | Ordered task queue with status | [docs](https://elements.ai-sdk.dev/components/queue) |
| `reasoning` | AI reasoning display | [docs](https://elements.ai-sdk.dev/components/reasoning) |
| `shimmer` | Loading placeholder animation | [docs](https://elements.ai-sdk.dev/components/shimmer) |
| `sources` | Reference source cards | [docs](https://elements.ai-sdk.dev/components/sources) |
| `suggestion` | Clickable suggestion chips | [docs](https://elements.ai-sdk.dev/components/suggestion) |
| `task` | Individual task card with status | [docs](https://elements.ai-sdk.dev/components/task) |
| `tool` | Tool execution display with input/output | [docs](https://elements.ai-sdk.dev/components/tool) |

### Code (14 components)
| Component | Description | Docs |
|-----------|-------------|------|
| `agent` | Agent execution with tool calls, output | [docs](https://elements.ai-sdk.dev/components/agent) |
| `artifact` | Generated artifact display | [docs](https://elements.ai-sdk.dev/components/artifact) |
| `code-block` | Syntax-highlighted code with copy | [docs](https://elements.ai-sdk.dev/components/code-block) |
| `commit` | Git commit display | [docs](https://elements.ai-sdk.dev/components/commit) |
| `file-tree` | File/folder tree navigation | [docs](https://elements.ai-sdk.dev/components/file-tree) |
| `sandbox` | Code execution sandbox | [docs](https://elements.ai-sdk.dev/components/sandbox) |
| `snippet` | Inline code snippet | [docs](https://elements.ai-sdk.dev/components/snippet) |
| `stack-trace` | Error stack trace display | [docs](https://elements.ai-sdk.dev/components/stack-trace) |
| `terminal` | Terminal output display | [docs](https://elements.ai-sdk.dev/components/terminal) |
| `test-results` | Test suite results | [docs](https://elements.ai-sdk.dev/components/test-results) |

### Voice (6 components)
| Component | Description | Docs |
|-----------|-------------|------|
| `persona` | Agent avatar with name, status, animated border | [docs](https://elements.ai-sdk.dev/components/persona) |
| `speech-input` | Voice input with waveform | [docs](https://elements.ai-sdk.dev/components/speech-input) |
| `transcription` | Real-time transcription display | [docs](https://elements.ai-sdk.dev/components/transcription) |
| `voice-selector` | Voice picker for TTS | [docs](https://elements.ai-sdk.dev/components/voice-selector) |

### Workflow (7 components)
| Component | Description | Docs |
|-----------|-------------|------|
| `canvas` | Workflow canvas container | [docs](https://elements.ai-sdk.dev/components/canvas) |
| `node` | Workflow node | [docs](https://elements.ai-sdk.dev/components/node) |
| `edge` | Connection between nodes | [docs](https://elements.ai-sdk.dev/components/edge) |
| `panel` | Side panel for node details | [docs](https://elements.ai-sdk.dev/components/panel) |

## Usage in This Project

Search `mentra-docs` namespace for display constraints before using components. Components used in the webview must work within MentraOS mobile app (Chromium webview).

Key components for our app:
- **prompt-input**: Main chat input with mic toggle, attachments
- **persona**: Agent avatar in messages and status cards
- **chain-of-thought**: Show agent reasoning steps
- **task + queue**: Task management and parallel execution display
- **confirmation**: Approval cards for deployments/decisions
- **suggestion**: Quick action chips
- **context**: Token usage visualization
- **agent**: Tool execution display
- **code-block + terminal**: Code and command output
- **file-tree**: Project file browser
- **transcription**: Real-time voice transcription in input area
