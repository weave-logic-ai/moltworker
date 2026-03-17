/**
 * Chat store -- reactive state for conversation messages.
 *
 * Follows the same pub/sub pattern as app-state.ts.
 * Framework-agnostic, no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  latencyMs?: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isAgentThinking: boolean;
  /** Partial content while the agent is streaming. */
  streamingContent: string;
  streamingModel: string;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: ChatState = {
  messages: [],
  isAgentThinking: false,
  streamingContent: '',
  streamingModel: '',
  lastError: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type Listener = (state: ChatState) => void;

let state: ChatState = { ...DEFAULT_STATE };
const listeners: Set<Listener> = new Set();

/** Get the current chat state (immutable snapshot). */
export function getChatState(): Readonly<ChatState> {
  return state;
}

/** Subscribe to chat state changes. Returns an unsubscribe fn. */
export function subscribeChatState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(update: Partial<ChatState>): void {
  state = { ...state, ...update };
  listeners.forEach((fn) => fn(state));
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

let msgCounter = 0;

function nextId(): string {
  return `msg-${Date.now()}-${++msgCounter}`;
}

/** Add a message to the conversation. */
export function addMessage(msg: Omit<ChatMessage, 'id'> & { id?: string }): ChatMessage {
  const full: ChatMessage = {
    id: msg.id || nextId(),
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    model: msg.model,
    latencyMs: msg.latencyMs,
  };
  setState({
    messages: [...state.messages, full],
    lastError: null,
  });
  return full;
}

/** Clear all messages. */
export function clearMessages(): void {
  setState({ messages: [], lastError: null, streamingContent: '', streamingModel: '' });
}

/** Set the agent thinking flag. */
export function setAgentThinking(thinking: boolean): void {
  setState({ isAgentThinking: thinking });
}

/** Update streaming content (partial agent response). */
export function setStreamingContent(content: string, model?: string): void {
  setState({
    streamingContent: content,
    ...(model ? { streamingModel: model } : {}),
  });
}

/** Finalize the streaming content into a real message. */
export function finalizeStream(model: string, latencyMs: number): void {
  if (state.streamingContent) {
    addMessage({
      role: 'assistant',
      content: state.streamingContent,
      timestamp: Date.now(),
      model,
      latencyMs,
    });
  }
  setState({
    streamingContent: '',
    streamingModel: '',
    isAgentThinking: false,
  });
}

/** Set last error. */
export function setChatError(error: string | null): void {
  setState({ lastError: error, isAgentThinking: false });
}

/** Get the messages in the OpenAI-compatible format for API calls. */
export function getMessagesForApi(): Array<{ role: string; content: string }> {
  return state.messages.map((m) => ({ role: m.role, content: m.content }));
}
