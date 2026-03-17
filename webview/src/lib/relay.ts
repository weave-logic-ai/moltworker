/**
 * Mentra Bridge Relay WebSocket connection layer.
 *
 * Connects to the bridge relay to receive live sensor data from
 * the Mentra glasses: transcriptions, photos, button presses,
 * TTS status, battery levels, and general status updates.
 *
 * Updates the sensor-store and app-state with live data.
 */

import { getConfig } from '@/lib/config';
import { setConnectionStatus } from '@/store/app-state';
import {
  setTranscription,
  setBattery,
  setLastPhoto,
  addButtonEvent,
  setTtsStatus,
  setAgentRelayStatus,
  setServiceHealth,
  type ServiceHealthMap,
} from '@/store/sensor-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RelayConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** Relay protocol: each message has a `type` field. */
export interface RelayEvent {
  type: string;
  [key: string]: unknown;
}

type RelayListener = (evt: RelayEvent) => void;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let ws: WebSocket | null = null;
let state: RelayConnectionState = 'disconnected';
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

const listeners: Set<RelayListener> = new Set();
const stateListeners: Set<(s: RelayConnectionState) => void> = new Set();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 20;

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function setRelayState(next: RelayConnectionState): void {
  state = next;
  stateListeners.forEach((fn) => fn(next));

  // Update app-state: bridge connected status
  setConnectionStatus(
    false, // glasses status is derived from relay events, not connection state
    next === 'connected',
  );
}

function backoffDelay(): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, reconnectAttempt), MAX_DELAY_MS);
  return delay * (0.75 + Math.random() * 0.5);
}

function scheduleReconnect(): void {
  if (intentionalClose) return;
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    setRelayState('error');
    return;
  }
  const delay = backoffDelay();
  reconnectTimer = setTimeout(() => {
    reconnectAttempt++;
    connectWs();
  }, delay);
}

/** Route incoming relay events to the appropriate store updaters. */
function handleRelayEvent(evt: RelayEvent): void {
  switch (evt.type) {
    case 'transcription':
      setTranscription({
        text: (evt.text as string) || '',
        isFinal: (evt.is_final as boolean) ?? (evt.isFinal as boolean) ?? false,
        language: (evt.language as string) || 'en-US',
        confidence: (evt.confidence as number) ?? 1.0,
      });
      break;

    case 'photo':
      setLastPhoto({
        mimeType: (evt.mime_type as string) || (evt.mimeType as string) || 'image/jpeg',
        size: (evt.size as number) || 0,
        timestamp: Date.now(),
      });
      break;

    case 'button':
      addButtonEvent({
        buttonId: (evt.button_id as string) || (evt.buttonId as string) || 'main',
        pressType: (evt.press_type as string) || (evt.pressType as string) || 'single',
        timestamp: Date.now(),
      });
      break;

    case 'agent-response':
      // Agent-side responses that come through the relay
      setAgentRelayStatus((evt.status as string) === 'thinking' ? 'thinking' : 'idle');
      break;

    case 'tts':
      setTtsStatus(
        (evt.status as 'idle' | 'speaking' | 'done' | 'error') || 'idle',
      );
      break;

    case 'battery':
      setBattery({
        level: (evt.level as number) ?? (evt.glasses_percent as number) ?? 0,
        charging: (evt.charging as boolean) ?? false,
      });
      break;

    case 'status': {
      // General status update -- may include glasses connectivity
      const glasses = evt.glasses_connected ?? evt.glassesConnected;
      if (typeof glasses === 'boolean') {
        setConnectionStatus(glasses, state === 'connected');
      }
      // Service health
      if (evt.services && typeof evt.services === 'object') {
        setServiceHealth(evt.services as ServiceHealthMap);
      }
      break;
    }

    case 'error':
      // Surface errors but don't crash
      console.warn('[relay] error event:', evt.message || evt);
      break;

    default:
      // Unknown event types are forwarded to raw listeners but not processed
      break;
  }

  // Forward all events to raw listeners
  listeners.forEach((fn) => fn(evt));
}

function connectWs(): void {
  const config = getConfig();
  setRelayState('connecting');

  try {
    ws = new WebSocket(config.relayUrl);
  } catch {
    setRelayState('error');
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    setRelayState('connected');
    reconnectAttempt = 0;
  };

  ws.onmessage = (event) => {
    try {
      const evt: RelayEvent = JSON.parse(event.data as string);
      handleRelayEvent(evt);
    } catch {
      // Non-JSON relay messages are ignored
    }
  };

  ws.onerror = () => {
    // onclose handles reconnect
  };

  ws.onclose = () => {
    ws = null;
    if (!intentionalClose) {
      setRelayState('disconnected');
      scheduleReconnect();
    } else {
      setRelayState('disconnected');
    }
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Connect to the Mentra bridge relay WebSocket. */
export function connect(): void {
  if (ws) return;
  intentionalClose = false;
  reconnectAttempt = 0;
  connectWs();
}

/** Disconnect from the relay. */
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
  setRelayState('disconnected');
}

/** Send a message to the relay (e.g., TTS request). */
export function sendRelayMessage(msg: RelayEvent): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Subscribe to raw relay events. Returns unsubscribe fn. */
export function onRelayEvent(listener: RelayListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to relay connection state changes. Returns unsubscribe fn. */
export function onRelayStateChange(listener: (s: RelayConnectionState) => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/** Get current relay connection state. */
export function getRelayConnectionState(): RelayConnectionState {
  return state;
}
