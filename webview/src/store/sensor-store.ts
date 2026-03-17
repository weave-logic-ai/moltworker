/**
 * Sensor store -- reactive state for live Mentra glasses sensor data.
 *
 * Follows the same pub/sub pattern as app-state.ts.
 * Framework-agnostic, no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Transcription {
  text: string;
  isFinal: boolean;
  language: string;
  confidence: number;
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
}

export interface PhotoInfo {
  mimeType: string;
  size: number;
  timestamp: number;
}

export interface ButtonEvent {
  buttonId: string;
  pressType: string;
  timestamp: number;
}

export type TtsStatus = 'idle' | 'speaking' | 'done' | 'error';
export type AgentSensorStatus = 'idle' | 'thinking' | 'responding';

export interface ServiceHealthMap {
  openclaw?: 'up' | 'down' | 'unknown';
  bridge?: 'up' | 'down' | 'unknown';
  glasses?: 'up' | 'down' | 'unknown';
  [key: string]: 'up' | 'down' | 'unknown' | undefined;
}

export interface SensorState {
  transcription: Transcription;
  battery: BatteryInfo;
  lastPhoto: PhotoInfo | null;
  buttonHistory: ButtonEvent[];
  ttsStatus: TtsStatus;
  agentStatus: AgentSensorStatus;
  servicesHealth: ServiceHealthMap;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BUTTON_HISTORY = 10;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: SensorState = {
  transcription: { text: '', isFinal: false, language: 'en-US', confidence: 0 },
  battery: { level: 0, charging: false },
  lastPhoto: null,
  buttonHistory: [],
  ttsStatus: 'idle',
  agentStatus: 'idle',
  servicesHealth: {
    openclaw: 'unknown',
    bridge: 'unknown',
    glasses: 'unknown',
  },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type Listener = (state: SensorState) => void;

let state: SensorState = { ...DEFAULT_STATE };
const listeners: Set<Listener> = new Set();

/** Get the current sensor state (immutable snapshot). */
export function getSensorState(): Readonly<SensorState> {
  return state;
}

/** Subscribe to sensor state changes. Returns an unsubscribe fn. */
export function subscribeSensorState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(update: Partial<SensorState>): void {
  state = { ...state, ...update };
  listeners.forEach((fn) => fn(state));
}

// ---------------------------------------------------------------------------
// Actions (called by relay.ts)
// ---------------------------------------------------------------------------

/** Update live transcription. */
export function setTranscription(t: Transcription): void {
  setState({ transcription: t });
}

/** Update battery info. */
export function setBattery(b: BatteryInfo): void {
  setState({ battery: b });
}

/** Update last photo info. */
export function setLastPhoto(p: PhotoInfo): void {
  setState({ lastPhoto: p });
}

/** Add a button press event (keeps last N). */
export function addButtonEvent(evt: ButtonEvent): void {
  const next = [evt, ...state.buttonHistory].slice(0, MAX_BUTTON_HISTORY);
  setState({ buttonHistory: next });
}

/** Update TTS status. */
export function setTtsStatus(status: TtsStatus): void {
  setState({ ttsStatus: status });
}

/** Update agent status as seen by the relay. */
export function setAgentRelayStatus(status: AgentSensorStatus): void {
  setState({ agentStatus: status });
}

/** Update services health map. */
export function setServiceHealth(health: ServiceHealthMap): void {
  setState({
    servicesHealth: { ...state.servicesHealth, ...health },
  });
}

/** Reset sensor state to defaults. */
export function resetSensorState(): void {
  state = { ...DEFAULT_STATE };
  listeners.forEach((fn) => fn(state));
}
