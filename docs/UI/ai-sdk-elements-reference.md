# Vercel AI SDK Elements - Component Reference

> AI Elements is a component library and custom registry built on top of shadcn/ui to help you build AI-native applications faster.

- **Package**: `ai-elements` (npm, v1.9.0+)
- **Repository**: https://github.com/vercel/ai-elements
- **Documentation**: https://elements.ai-sdk.dev
- **Targets**: React 19, Tailwind CSS 4
- **Prerequisites**: Node.js 18+, shadcn/ui initialized, AI SDK installed

---

## Installation

### Quick Start (dedicated CLI)

```bash
npx ai-elements@latest
```

### Add Specific Components

```bash
npx ai-elements@latest add prompt-input
npx ai-elements@latest add conversation
npx ai-elements@latest add message
npx ai-elements@latest add agent
```

### Alternative: shadcn CLI (all components at once)

```bash
npx shadcn@latest add https://elements.ai-sdk.dev/api/registry/all.json
```

Components are installed to `@/components/ai-elements/` (configurable via `components.json`). They become editable source files in your codebase, not opaque node_modules.

### Vite + React Setup

Since AI Elements is built on shadcn/ui, a Vite project needs shadcn initialized first:

```bash
# 1. Initialize shadcn/ui for Vite
pnpm dlx shadcn@latest init -t vite

# 2. Install AI SDK dependencies
pnpm add ai @ai-sdk/react

# 3. Add AI Elements components
npx ai-elements@latest add prompt-input message conversation
```

The `@/` path alias must be configured in both `tsconfig.json` (paths) and `vite.config.ts` (resolve.alias). The shadcn init command handles this automatically.

**Important**: Some components (like Persona) use WebGL2 via Rive and may require additional polyfills in non-Next.js environments. Server-side features (streaming routes via `streamText`) require a backend -- in Vite projects, use a separate API server or a framework like Hono.

---

## Complete Component Inventory

### Chatbot Components (19)

| Component | Description |
|-----------|-------------|
| Attachments | File/image attachment display with grid/inline/list layouts |
| Chain of Thought | Collapsible AI reasoning step visualization |
| Checkpoint | Progress checkpoint display |
| Confirmation | Tool approval request and outcome display |
| Context | Token usage, context window, and cost visualization |
| Conversation | Scrollable message container with auto-scroll |
| Inline Citation | Inline source citation links |
| Message | Chat message bubble (user and assistant) |
| Model Selector | LLM model picker dropdown |
| Plan | Multi-step plan display |
| Prompt Input | Full-featured text input with attachments, model select, actions |
| Queue | Structured task/message queue with sections |
| Reasoning | AI reasoning display |
| Shimmer | Loading shimmer animation |
| Sources | Source document list |
| Suggestion | Clickable prompt suggestion chips |
| Task | Collapsible task list with progress tracking |
| Tool | Tool invocation display |

### Code Components (14)

| Component | Description |
|-----------|-------------|
| Agent | AI agent configuration display (tools, instructions, output) |
| Artifact | Generated artifact viewer |
| Code Block | Syntax-highlighted code display |
| Commit | Git commit display |
| Environment Variables | Env var editor/display |
| File Tree | File system tree view |
| JSX Preview | Live JSX component preview |
| Package Info | npm package metadata display |
| Sandbox | Sandboxed code execution environment |
| Schema Display | Data schema visualization |
| Snippet | Code snippet with copy button |
| Stack Trace | Error stack trace display |
| Terminal | Terminal output display |
| Test Results | Test suite results display |
| Web Preview | Embedded web page preview |

### Voice Components (6)

| Component | Description |
|-----------|-------------|
| Audio Player | Audio playback controls |
| Mic Selector | Microphone device picker |
| Persona | Animated AI avatar (Rive WebGL2, 6 variants, 5 states) |
| Speech Input | Voice-to-text input |
| Transcription | Real-time transcription display |
| Voice Selector | Voice/TTS voice picker |

### Workflow Components (7)

| Component | Description |
|-----------|-------------|
| Canvas | Workflow canvas container |
| Connection | Node connection lines |
| Controls | Workflow control buttons |
| Edge | Directed graph edge |
| Node | Workflow graph node |
| Panel | Side panel for node properties |
| Toolbar | Workflow editing toolbar |

---

## Detailed Component Reference (Selected Components)

---

### Persona

**Category**: Voice
**Install**: `npx ai-elements@latest add persona`
**Import**: `import { Persona } from "@/components/ai-elements/persona"`

An animated AI visual built with Rive WebGL2 that responds to different conversational states.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `state` | `"idle" \| "listening" \| "thinking" \| "speaking" \| "asleep"` | `"idle"` | Animation state |
| `variant` | `"obsidian" \| "mana" \| "opal" \| "halo" \| "glint" \| "command"` | `"obsidian"` | Visual style |
| `className` | `string` | -- | CSS classes |
| `onLoad` | `RiveParameters["onLoad"]` | -- | Rive file load start |
| `onLoadError` | `RiveParameters["onLoadError"]` | -- | Rive file load failure |
| `onReady` | `() => void` | -- | Animation ready |
| `onPlay` | `RiveParameters["onPlay"]` | -- | Animation play |
| `onPause` | `RiveParameters["onPause"]` | -- | Animation pause |
| `onStop` | `RiveParameters["onStop"]` | -- | Animation stop |

#### Example

```tsx
import { Persona } from "@/components/ai-elements/persona";
import { useState } from "react";

export default function VoiceAgent() {
  const [state, setState] = useState<
    "idle" | "listening" | "thinking" | "speaking" | "asleep"
  >("idle");

  return (
    <Persona
      state={state}
      variant="opal"
      className="size-64 rounded-full border border-border"
      onReady={() => console.log("Animation ready")}
    />
  );
}
```

**Renders**: An animated circular AI avatar that transitions between idle, listening, thinking, speaking, and asleep states with smooth WebGL2 animations. Six visual variants (obsidian, mana, opal, halo, glint, command) provide different aesthetics.

---

### Chain of Thought

**Category**: Chatbot
**Install**: `npx ai-elements@latest add chain-of-thought`
**Import**: `import { ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtStep, ChainOfThoughtContent, ChainOfThoughtSearchResults, ChainOfThoughtSearchResult, ChainOfThoughtImage } from "@/components/ai-elements/chain-of-thought"`

Visualizes AI reasoning through a collapsible interface with step-by-step thinking, search results, images, and progress indicators.

#### Subcomponents and Props

**ChainOfThought** (root)

| Prop | Type | Default |
|------|------|---------|
| `open` | `boolean` | -- (controlled) |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `(open: boolean) => void` | -- |

**ChainOfThoughtHeader**

| Prop | Type | Default |
|------|------|---------|
| `children` | `ReactNode` | `"Chain of Thought"` |

**ChainOfThoughtStep**

| Prop | Type | Default |
|------|------|---------|
| `icon` | `LucideIcon` | `DotIcon` |
| `label` | `string` | -- |
| `description` | `string` | -- |
| `status` | `"complete" \| "active" \| "pending"` | `"complete"` |

**ChainOfThoughtSearchResult** -- spreads to Badge component

**ChainOfThoughtImage**

| Prop | Type | Default |
|------|------|---------|
| `caption` | `string` | -- |

#### Example

```tsx
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import { SearchIcon, BrainIcon, CheckIcon } from "lucide-react";

<ChainOfThought defaultOpen>
  <ChainOfThoughtHeader>Reasoning</ChainOfThoughtHeader>
  <ChainOfThoughtContent>
    <ChainOfThoughtStep
      icon={SearchIcon}
      label="Searching for relevant information"
      status="complete"
    />
    <ChainOfThoughtStep
      icon={BrainIcon}
      label="Analyzing results"
      description="Cross-referencing 3 sources"
      status="active"
    />
    <ChainOfThoughtStep
      icon={CheckIcon}
      label="Forming response"
      status="pending"
    />
    <ChainOfThoughtSearchResults>
      <ChainOfThoughtSearchResult>wikipedia.org</ChainOfThoughtSearchResult>
      <ChainOfThoughtSearchResult>arxiv.org</ChainOfThoughtSearchResult>
    </ChainOfThoughtSearchResults>
  </ChainOfThoughtContent>
</ChainOfThought>
```

**Renders**: A collapsible panel with a clickable header. When expanded, shows sequential reasoning steps with status icons (checkmark for complete, spinner for active, dot for pending), optional search result badges, and images with captions.

---

### Task

**Category**: Chatbot
**Install**: `npx ai-elements@latest add task`
**Import**: `import { Task, TaskItem, TaskItemFile, TaskTrigger, TaskContent } from "@/components/ai-elements/task"`

Displays structured task lists with collapsible details, status indicators, and progress tracking.

#### Props

**Task** (root, wraps Radix Collapsible)

| Prop | Type | Default |
|------|------|---------|
| `defaultOpen` | `boolean` | `true` |

**TaskTrigger**

| Prop | Type | Default |
|------|------|---------|
| `title` | `string` | required |

**TaskContent**, **TaskItem**, **TaskItemFile** -- spread to underlying elements.

#### Example

```tsx
"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import {
  Task,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
  TaskContent,
} from "@/components/ai-elements/task";

export default function TaskDemo() {
  const { object, submit, isLoading } = useObject({
    api: "/api/agent",
    schema: tasksSchema,
  });

  return (
    <div className="space-y-4">
      {object?.tasks?.map((task, i) => (
        <Task key={i} defaultOpen={i === 0}>
          <TaskTrigger title={task.title || "Loading..."} />
          <TaskContent>
            {task.items?.map((item, j) => (
              <TaskItem key={j}>
                {item.type === "file" ? (
                  <span className="inline-flex items-center gap-1">
                    {item.text}
                    <TaskItemFile>
                      <span>{item.file.name}</span>
                    </TaskItemFile>
                  </span>
                ) : (
                  item.text
                )}
              </TaskItem>
            ))}
          </TaskContent>
        </Task>
      ))}
    </div>
  );
}
```

**Renders**: Collapsible sections with a title trigger showing a progress counter (e.g., "3/6 completed"). Each section expands to show task items -- plain text or file references with colored icons. Status indicators show pending, in-progress, completed, and error states.

---

### Queue

**Category**: Chatbot
**Install**: `npx ai-elements@latest add queue`
**Import**: `import { Queue, QueueSection, QueueSectionTrigger, QueueSectionLabel, QueueSectionContent, QueueList, QueueItem, QueueItemIndicator, QueueItemContent, QueueItemDescription, QueueItemActions, QueueItemAction, QueueItemAttachment, QueueItemImage, QueueItemFile } from "@/components/ai-elements/queue"`

Displays message lists, todos, attachments, and collapsible task sections for AI workflow progress.

#### Key Props

| Component | Key Prop | Type | Default |
|-----------|----------|------|---------|
| `QueueSection` | `defaultOpen` | `boolean` | `true` |
| `QueueSectionLabel` | `label` | `string` | -- |
| `QueueSectionLabel` | `count` | `number` | -- |
| `QueueSectionLabel` | `icon` | `ReactNode` | -- |
| `QueueItemIndicator` | `completed` | `boolean` | `false` |
| `QueueItemContent` | `completed` | `boolean` | `false` |
| `QueueItemDescription` | `completed` | `boolean` | `false` |

#### Types

```ts
interface QueueMessage {
  id: string;
  parts: QueueMessagePart[];
}

interface QueueMessagePart {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
}

interface QueueTodo {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "completed";
}
```

#### Example

```tsx
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
} from "@/components/ai-elements/queue";
import { ListTodoIcon } from "lucide-react";

<Queue>
  <QueueSection defaultOpen>
    <QueueSectionTrigger>
      <QueueSectionLabel icon={<ListTodoIcon />} count={3} label="Tasks" />
    </QueueSectionTrigger>
    <QueueSectionContent>
      <QueueList>
        <QueueItem>
          <QueueItemIndicator completed />
          <QueueItemContent completed>Set up database</QueueItemContent>
        </QueueItem>
        <QueueItem>
          <QueueItemIndicator completed={false} />
          <QueueItemContent>Write API endpoints</QueueItemContent>
          <QueueItemDescription>REST + WebSocket handlers</QueueItemDescription>
        </QueueItem>
      </QueueList>
    </QueueSectionContent>
  </QueueSection>
</Queue>
```

**Renders**: Collapsible sections with labeled headers showing item counts. Each section contains a scrollable list of items with completion indicators (checkmarks or empty circles), text content (with strikethrough when completed), descriptions, hover-revealed action buttons, and optional image/file attachments.

---

### Confirmation

**Category**: Chatbot
**Install**: `npx ai-elements@latest add confirmation`
**Import**: `import { Confirmation, ConfirmationTitle, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected, ConfirmationActions, ConfirmationAction } from "@/components/ai-elements/confirmation"`

Displays tool approval requests and outcomes. Designed for dangerous operations that need user consent before AI execution.

#### Props

**Confirmation** (root, wraps Alert)

| Prop | Type | Description |
|------|------|-------------|
| `approval` | `ToolUIPart["approval"]` | Approval object with ID and status; won't render if undefined |
| `state` | `ToolUIPart["state"]` | Tool state: `"approval-requested"`, `"approval-responded"`, `"output-denied"`, `"output-available"` |

**ConfirmationRequest** -- renders only during `"approval-requested"` state
**ConfirmationAccepted** -- renders when approved and state is responded/output
**ConfirmationRejected** -- renders when rejected and state is responded/output
**ConfirmationActions** -- button container, only during `"approval-requested"`
**ConfirmationAction** -- button (default: h-8 px-3 text-sm)

#### Example

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import {
  Confirmation,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ai-elements/confirmation";
import { CheckIcon, XIcon } from "lucide-react";

export default function ToolApproval() {
  const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const latestMessage = messages[messages.length - 1];
  const deleteTool = latestMessage?.parts?.find(
    (part) => part.type === "tool-delete_file"
  );

  return (
    deleteTool?.approval && (
      <Confirmation approval={deleteTool.approval} state={deleteTool.state}>
        <ConfirmationRequest>
          This tool wants to delete: <code>{deleteTool.input?.filePath}</code>
          <br />Do you approve this action?
        </ConfirmationRequest>
        <ConfirmationAccepted>
          <CheckIcon className="size-4" />
          <span>You approved this tool execution</span>
        </ConfirmationAccepted>
        <ConfirmationRejected>
          <XIcon className="size-4" />
          <span>You rejected this tool execution</span>
        </ConfirmationRejected>
        <ConfirmationActions>
          <ConfirmationAction
            variant="outline"
            onClick={() =>
              addToolApprovalResponse({
                id: deleteTool.approval.id,
                approved: false,
              })
            }
          >
            Reject
          </ConfirmationAction>
          <ConfirmationAction
            variant="default"
            onClick={() =>
              addToolApprovalResponse({
                id: deleteTool.approval.id,
                approved: true,
              })
            }
          >
            Approve
          </ConfirmationAction>
        </ConfirmationActions>
      </Confirmation>
    )
  );
}
```

Backend requires `requireApproval: true` on the tool definition:

```ts
tools: {
  delete_file: {
    description: "Delete a file from the file system",
    parameters: z.object({
      filePath: z.string(),
      confirm: z.boolean().default(false),
    }),
    requireApproval: true,
    execute: async ({ filePath }) => {
      return { success: true, message: `Deleted ${filePath}` };
    },
  },
},
```

**Renders**: An alert-style card. In "approval-requested" state, shows the request message with Reject/Approve buttons. After response, shows either a checkmark with acceptance text or an X icon with rejection text.

---

### Suggestion

**Category**: Chatbot
**Install**: `npx ai-elements@latest add suggestion`
**Import**: `import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion"`

A horizontal row of clickable suggestion chips for predefined prompts.

#### Props

**Suggestions** (container, wraps ScrollArea) -- standard ScrollArea props

**Suggestion**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `suggestion` | `string` | yes | Text to display and emit on click |
| `onClick` | `(suggestion: string) => void` | no | Click callback |
| `...props` | Button props | no | Spread to shadcn Button |

#### Example

```tsx
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useChat } from "@ai-sdk/react";

const prompts = [
  "Can you explain how to play tennis?",
  "What is the weather in Tokyo?",
  "Write a haiku about programming",
];

export default function SuggestionBar() {
  const { sendMessage } = useChat();

  return (
    <Suggestions>
      {prompts.map((text) => (
        <Suggestion
          key={text}
          suggestion={text}
          onClick={(s) => sendMessage({ text: s })}
        />
      ))}
    </Suggestions>
  );
}
```

**Renders**: A horizontal scrollable row of pill-shaped buttons. Each displays the suggestion text and fires the onClick callback with that text when clicked. Wraps on mobile. Styled with hover effects.

---

### Attachments

**Category**: Chatbot
**Install**: `npx ai-elements@latest add attachments`
**Import**: `import { Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove, AttachmentHoverCard, AttachmentHoverCardTrigger, AttachmentHoverCardContent, AttachmentEmpty } from "@/components/ai-elements/attachments"`

Displays file attachments and source documents with three layout variants.

#### Props

**Attachments** (container)

| Prop | Type | Default |
|------|------|---------|
| `variant` | `"grid" \| "inline" \| "list"` | `"grid"` |

**Attachment**

| Prop | Type | Description |
|------|------|-------------|
| `data` | `(FileUIPart & { id: string }) \| (SourceDocumentUIPart & { id: string })` | Attachment data |
| `onRemove` | `() => void` | Remove callback |

**AttachmentPreview** -- `fallbackIcon?: ReactNode`
**AttachmentInfo** -- `showMediaType?: boolean` (default false)
**AttachmentRemove** -- `label?: string` (default "Remove")

#### Utility Functions

- `getMediaCategory(data)` -- returns `"image" | "video" | "audio" | "document" | "source" | "unknown"`
- `getAttachmentLabel(data)` -- returns display label (filename or fallback)

#### Example

```tsx
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import type { FileUIPart } from "ai";

interface Props {
  attachments: (FileUIPart & { id: string })[];
  onRemove?: (id: string) => void;
}

export function FileList({ attachments, onRemove }: Props) {
  return (
    <Attachments variant="grid">
      {attachments.map((file) => (
        <Attachment
          key={file.id}
          data={file}
          onRemove={onRemove ? () => onRemove(file.id) : undefined}
        >
          <AttachmentPreview />
          <AttachmentInfo showMediaType />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}
```

**Renders**: Three layout modes -- **grid** shows thumbnails in a grid, **inline** shows compact badges, **list** shows full-width rows. Each attachment shows a media preview (image thumbnail, video icon, etc.), filename, optional media type badge, and a hover-revealed remove button. Hover cards provide larger previews.

---

### Prompt Input

**Category**: Chatbot
**Install**: `npx ai-elements@latest add prompt-input`
**Import**: `import { PromptInput, PromptInputTextarea, PromptInputSubmit, PromptInputHeader, PromptInputBody, PromptInputFooter, PromptInputTools, PromptInputButton, PromptInputSelect, PromptInputSelectTrigger, PromptInputSelectContent, PromptInputSelectItem, PromptInputSelectValue, PromptInputActionMenu, PromptInputActionMenuTrigger, PromptInputActionMenuContent, PromptInputActionAddAttachments, PromptInputActionAddScreenshot, usePromptInputAttachments } from "@/components/ai-elements/prompt-input"`

Full-featured prompt input with auto-resizing textarea, file attachments (drag-and-drop), model selector, action menus, and submit button.

#### Root Props

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `(message: PromptInputMessage, event: FormEvent) => void` | Submit handler |
| `accept` | `string` | Accepted file types (e.g., `"image/*"`) |
| `multiple` | `boolean` | Allow multiple files |
| `globalDrop` | `boolean` | Accept drops anywhere on document |
| `maxFiles` | `number` | Maximum files allowed |
| `maxFileSize` | `number` | Maximum file size in bytes |
| `onError` | `(err) => void` | Validation error handler |

#### Subcomponents

- **Layout**: `PromptInputHeader`, `PromptInputBody`, `PromptInputFooter`, `PromptInputTools`
- **Input**: `PromptInputTextarea`, `PromptInputSubmit` (takes `status` prop)
- **Buttons**: `PromptInputButton` (with `tooltip` prop for shortcut hints)
- **Model Select**: `PromptInputSelect`, `PromptInputSelectTrigger`, `PromptInputSelectContent`, `PromptInputSelectItem`, `PromptInputSelectValue`
- **Action Menu**: `PromptInputActionMenu`, `PromptInputActionMenuTrigger`, `PromptInputActionMenuContent`, `PromptInputActionAddAttachments`, `PromptInputActionAddScreenshot`
- **Advanced**: `PromptInputProvider`, `PromptInputHoverCard`, `PromptInputCommand`, `PromptInputTab`

#### Hooks

- `usePromptInputAttachments()` -- `{ files, add, remove, clear, openFileDialog }`
- `usePromptInputController()` -- `{ textInput: { value, setInput, clear }, attachments }`
- `usePromptInputReferencedSources()` -- `{ sources, add, remove, clear }`

#### Example

```tsx
"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";

const models = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-opus-4-20250514", name: "Claude 4 Opus" },
];

function AttachmentsDisplay() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="inline">
      {attachments.files.map((a) => (
        <Attachment key={a.id} data={a} onRemove={() => attachments.remove(a.id)}>
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

export default function ChatInput() {
  const [text, setText] = useState("");
  const [model, setModel] = useState(models[0].id);
  const { status, sendMessage } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text && !message.files?.length) return;
    sendMessage(
      { text: message.text || "Sent with attachments", files: message.files },
      { body: { model } }
    );
    setText("");
  };

  return (
    <PromptInput onSubmit={handleSubmit} globalDrop multiple>
      <PromptInputHeader>
        <AttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea value={text} onChange={(e) => setText(e.target.value)} />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputSelect value={model} onValueChange={setModel}>
            <PromptInputSelectTrigger>
              <PromptInputSelectValue />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {models.map((m) => (
                <PromptInputSelectItem key={m.id} value={m.id}>
                  {m.name}
                </PromptInputSelectItem>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
        </PromptInputTools>
        <PromptInputSubmit disabled={!text && !status} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}
```

**Renders**: A multi-zone input area. Top zone shows inline attachment previews. Middle zone is an auto-resizing textarea. Bottom toolbar holds action menus (attach files, screenshot), custom buttons with tooltips, a model selector dropdown, and a submit button whose icon changes based on chat status (arrow for ready, stop for streaming).

---

### Context

**Category**: Chatbot
**Install**: `npx ai-elements@latest add context`
**Import**: `import { Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage } from "@/components/ai-elements/context"`

Displays AI model context window usage, token consumption breakdown, and cost estimation via an interactive hover card.

#### Props

**Context** (root)

| Prop | Type | Description |
|------|------|-------------|
| `maxTokens` | `number` | Total context window size |
| `usedTokens` | `number` | Currently consumed tokens |
| `usage` | `LanguageModelUsage` | Breakdown: `{ inputTokens, outputTokens, reasoningTokens, cachedInputTokens }` |
| `modelId` | `ModelId` | Model ID for cost calculations (e.g., `"anthropic:claude-3-opus"`) |

Subcomponents: `ContextTrigger`, `ContextContent`, `ContextContentHeader`, `ContextContentBody`, `ContextContentFooter`, `ContextInputUsage`, `ContextOutputUsage`, `ContextReasoningUsage`, `ContextCacheUsage`

#### Example

```tsx
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from "@/components/ai-elements/context";

<Context
  maxTokens={200000}
  usedTokens={45000}
  usage={{
    inputTokens: 25000,
    outputTokens: 15000,
    reasoningTokens: 5000,
    cachedInputTokens: 0,
  }}
  modelId="anthropic:claude-3-opus"
>
  <ContextTrigger />
  <ContextContent>
    <ContextContentHeader />
    <ContextContentBody>
      <ContextInputUsage />
      <ContextOutputUsage />
      <ContextReasoningUsage />
      <ContextCacheUsage />
    </ContextContentBody>
    <ContextContentFooter />
  </ContextContent>
</Context>
```

**Renders**: A small trigger button showing usage percentage. On hover, opens a card with: circular SVG progress ring, token count with automatic formatting (K/M/B suffixes), breakdown by input/output/reasoning/cached tokens with individual costs, and total estimated cost in USD. Uses the `tokenlens` library for cost calculations.

---

### Agent

**Category**: Code
**Install**: `npx ai-elements@latest add agent`
**Import**: `import { Agent, AgentContent, AgentHeader, AgentInstructions, AgentOutput, AgentTool, AgentTools } from "@/components/ai-elements/agent"`

Displays AI agent configuration: model info, system instructions (rendered as markdown), available tools with expandable schemas, and output format.

#### Props

**AgentHeader**

| Prop | Type | Required |
|------|------|----------|
| `name` | `string` | yes |
| `model` | `string` | no |

**AgentInstructions** -- `children: string` (rendered as markdown)

**AgentTool**

| Prop | Type | Required |
|------|------|----------|
| `tool` | `Tool` (AI SDK tool object) | yes |
| `value` | `string` | yes (accordion item ID) |

**AgentOutput** -- `schema: string` (displayed with syntax highlighting)

#### Example

```tsx
"use client";

import { tool } from "ai";
import { z } from "zod";
import {
  Agent,
  AgentContent,
  AgentHeader,
  AgentInstructions,
  AgentOutput,
  AgentTool,
  AgentTools,
} from "@/components/ai-elements/agent";

const webSearch = tool({
  description: "Search the web for information",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
});

const readUrl = tool({
  description: "Read and parse content from a URL",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to read"),
  }),
});

const outputSchema = `z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  score: z.number(),
  summary: z.string(),
})`;

export default function AgentConfig() {
  return (
    <Agent>
      <AgentHeader name="Sentiment Analyzer" model="anthropic/claude-sonnet-4-5" />
      <AgentContent>
        <AgentInstructions>
          Analyze the sentiment of the provided text and return a structured
          analysis with sentiment classification, confidence score, and summary.
        </AgentInstructions>
        <AgentTools>
          <AgentTool tool={webSearch} value="web_search" />
          <AgentTool tool={readUrl} value="read_url" />
        </AgentTools>
        <AgentOutput schema={outputSchema} />
      </AgentContent>
    </Agent>
  );
}
```

**Renders**: A card-style display with: header showing agent name and model badge, markdown-rendered instruction text, an accordion list of tools (click to expand and see input schema JSON), and a syntax-highlighted output schema section.

---

## Key AI SDK Integration Patterns

### useChat Hook (streaming chat)

```tsx
import { useChat } from "@ai-sdk/react";

const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
});
```

### useObject Hook (structured streaming)

```tsx
import { experimental_useObject as useObject } from "@ai-sdk/react";

const { object, submit, isLoading } = useObject({
  api: "/api/agent",
  schema: myZodSchema,
});
```

### Backend Route Pattern

```ts
import { streamText, UIMessage, convertToModelMessages } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "openai/gpt-4o",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

---

## Package Dependencies

| Package | Purpose |
|---------|---------|
| `ai` | Core AI SDK (streamText, tool definitions, UIMessage types) |
| `@ai-sdk/react` | React hooks (useChat, useObject) |
| `ai-elements` | CLI for adding components |
| shadcn/ui dependencies | UI primitives (Button, Alert, Badge, ScrollArea, Accordion, etc.) |
| `zod` | Schema validation for tools and structured output |
| `lucide-react` | Icons |
| `@rive-app/react-webgl2` | Persona component animations (installed automatically) |
| `tokenlens` | Context component cost calculations (installed automatically) |
