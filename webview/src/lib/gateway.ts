/**
 * OpenClaw Gateway WebSocket connection layer.
 *
 * Responsibilities:
 * - Connect/disconnect to the OpenClaw gateway
 * - Authenticate with an optional bearer token
 * - Exponential backoff reconnection
 * - Publish connection state to app-state store
 * - Send chat messages via the REST completions API (streaming)
 * - Expose an event emitter for incoming WS messages
 */

import { getConfig } from '@/lib/config';
import { setAgentStatus } from '@/store/app-state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GatewayConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface GatewayMessage {
  type: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: { content?: string; role?: string };
    finish_reason: string | null;
    index: number;
  }>;
  model?: string;
}

type GatewayListener = (msg: GatewayMessage) => void;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let ws: WebSocket | null = null;
let state: GatewayConnectionState = 'disconnected';
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

const listeners: Set<GatewayListener> = new Set();
const stateListeners: Set<(s: GatewayConnectionState) => void> = new Set();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 20;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function setConnectionState(next: GatewayConnectionState): void {
  state = next;
  stateListeners.forEach((fn) => fn(next));
}

function backoffDelay(): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, reconnectAttempt), MAX_DELAY_MS);
  // Add jitter: +/- 25%
  return delay * (0.75 + Math.random() * 0.5);
}

function scheduleReconnect(): void {
  if (intentionalClose) return;
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    setConnectionState('error');
    return;
  }
  const delay = backoffDelay();
  reconnectTimer = setTimeout(() => {
    reconnectAttempt++;
    connectWs();
  }, delay);
}

function connectWs(): void {
  const config = getConfig();
  setConnectionState('connecting');

  try {
    const url = config.gatewayToken
      ? `${config.gatewayUrl}?token=${encodeURIComponent(config.gatewayToken)}`
      : config.gatewayUrl;

    ws = new WebSocket(url);
  } catch {
    setConnectionState('error');
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    setConnectionState('connected');
    reconnectAttempt = 0;
    // Send auth if token present and not in URL
    const config = getConfig();
    if (config.gatewayToken) {
      ws?.send(JSON.stringify({ type: 'auth', token: config.gatewayToken }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg: GatewayMessage = JSON.parse(event.data as string);
      listeners.forEach((fn) => fn(msg));
    } catch {
      // Non-JSON messages are ignored
    }
  };

  ws.onerror = () => {
    // onerror is always followed by onclose, so reconnect is handled there
  };

  ws.onclose = () => {
    ws = null;
    if (!intentionalClose) {
      setConnectionState('disconnected');
      scheduleReconnect();
    } else {
      setConnectionState('disconnected');
    }
  };
}

// ---------------------------------------------------------------------------
// Public API: WebSocket
// ---------------------------------------------------------------------------

/** Connect to the OpenClaw gateway WebSocket. */
export function connect(): void {
  if (ws) return;
  intentionalClose = false;
  reconnectAttempt = 0;
  connectWs();
}

/** Disconnect from the gateway. */
export function disconnect(): void {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  setConnectionState('disconnected');
}

/** Send a raw message over the WebSocket. */
export function sendWsMessage(msg: GatewayMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Subscribe to incoming WebSocket messages. Returns unsubscribe fn. */
export function onMessage(listener: GatewayListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to connection state changes. Returns unsubscribe fn. */
export function onStateChange(listener: (s: GatewayConnectionState) => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/** Get current connection state. */
export function getConnectionState(): GatewayConnectionState {
  return state;
}

// ---------------------------------------------------------------------------
// Public API: Chat Completions (REST streaming)
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request via the REST API (SSE streaming).
 *
 * Calls onChunk for each streamed delta. Calls onDone when stream ends.
 * Returns an AbortController so callers can cancel.
 */
export function sendChatMessage(
  messages: ChatMessage[],
  opts: {
    onChunk: (chunk: ChatCompletionChunk) => void;
    onDone: (fullContent: string, model: string) => void;
    onError: (err: Error) => void;
    model?: string;
    maxTokens?: number;
  },
): AbortController {
  const config = getConfig();
  const controller = new AbortController();

  setAgentStatus('thinking');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.gatewayToken) {
    headers['Authorization'] = `Bearer ${config.gatewayToken}`;
  }

  const body = JSON.stringify({
    model: opts.model || 'auto',
    messages,
    max_tokens: opts.maxTokens || 2048,
    stream: true,
  });

  fetch(config.chatCompletionsUrl, {
    method: 'POST',
    headers,
    body,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`Chat API error ${res.status}: ${text}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let model = '';

      setAgentStatus('executing');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const chunk: ChatCompletionChunk = JSON.parse(trimmed.slice(6));
            if (chunk.model) model = chunk.model;
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
            opts.onChunk(chunk);
          } catch {
            // Skip malformed chunks
          }
        }
      }

      setAgentStatus('idle');
      opts.onDone(fullContent, model);
    })
    .catch((err: Error) => {
      if (err.name === 'AbortError') return;
      setAgentStatus('error');
      opts.onError(err);
    });

  return controller;
}
