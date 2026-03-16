/**
 * AppState store for the Clawdflare Bridge webview.
 * Simple reactive store based on the state management section in app-structure.md.
 *
 * Uses a pub/sub pattern with immutable state updates.
 * No external dependencies -- framework-agnostic.
 */

import type { AppState, Client, Project, Workflow, BottomBarMode, ContextLevel, AgentStatus } from '@/types';

// ---------------------------------------------------------------------------
// Default State
// ---------------------------------------------------------------------------

export const DEFAULT_STATE: AppState = {
  activeClient: null,
  activeProject: null,
  activeWorkflow: null,

  contextLevel: 'none',
  bottomBarMode: 'home',
  breadcrumb: [],

  leftDrawerOpen: false,
  rightDrawerOpen: false,
  notificationCenterOpen: false,
  activeTab: 0,

  glassesConnected: false,
  bridgeConnected: false,
  agentStatus: 'idle',
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type Listener = (state: AppState) => void;

let state: AppState = { ...DEFAULT_STATE };
const listeners: Set<Listener> = new Set();

/** Get the current state (immutable snapshot) */
export function getState(): Readonly<AppState> {
  return state;
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Update state with a partial update and notify listeners */
function setState(update: Partial<AppState>): void {
  state = { ...state, ...update };
  listeners.forEach((fn) => fn(state));
}

// ---------------------------------------------------------------------------
// Derived State Helpers
// ---------------------------------------------------------------------------

function deriveBreadcrumb(client: Client | null, project: Project | null, workflow: Workflow | null): string[] {
  const parts: string[] = [];
  if (client) parts.push(client.name);
  if (project) parts.push(project.name);
  if (workflow) parts.push(workflow.name);
  return parts;
}

function deriveContextLevel(client: Client | null, project: Project | null, workflow: Workflow | null): ContextLevel {
  if (workflow) return 'workflow';
  if (project) return 'project';
  if (client) return 'client';
  return 'none';
}

function deriveBottomBarMode(workflow: Workflow | null): BottomBarMode {
  return workflow ? 'workflow' : 'home';
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Set the active client (clears project and workflow) */
export function setActiveClient(client: Client | null): void {
  setState({
    activeClient: client,
    activeProject: null,
    activeWorkflow: null,
    contextLevel: deriveContextLevel(client, null, null),
    bottomBarMode: 'home',
    breadcrumb: deriveBreadcrumb(client, null, null),
    activeTab: 0,
  });
}

/** Set the active project (clears workflow, keeps client) */
export function setActiveProject(project: Project | null): void {
  setState({
    activeProject: project,
    activeWorkflow: null,
    contextLevel: deriveContextLevel(state.activeClient, project, null),
    bottomBarMode: 'home',
    breadcrumb: deriveBreadcrumb(state.activeClient, project, null),
    activeTab: 0,
  });
}

/** Enter a workflow (switches bottom bar to workflow mode) */
export function enterWorkflow(workflow: Workflow): void {
  setState({
    activeWorkflow: workflow,
    contextLevel: 'workflow',
    bottomBarMode: 'workflow',
    breadcrumb: deriveBreadcrumb(state.activeClient, state.activeProject, workflow),
    activeTab: 0,
  });
}

/** Exit the current workflow (returns to home mode) */
export function exitWorkflow(): void {
  setState({
    activeWorkflow: null,
    contextLevel: deriveContextLevel(state.activeClient, state.activeProject, null),
    bottomBarMode: 'home',
    breadcrumb: deriveBreadcrumb(state.activeClient, state.activeProject, null),
    activeTab: 0,
  });
}

/** Set the active bottom bar tab */
export function setActiveTab(tab: number): void {
  setState({ activeTab: tab });
}

/** Toggle left drawer */
export function toggleLeftDrawer(): void {
  setState({
    leftDrawerOpen: !state.leftDrawerOpen,
    rightDrawerOpen: false,
    notificationCenterOpen: false,
  });
}

/** Toggle right drawer */
export function toggleRightDrawer(): void {
  setState({
    rightDrawerOpen: !state.rightDrawerOpen,
    leftDrawerOpen: false,
    notificationCenterOpen: false,
  });
}

/** Close all overlays */
export function closeAllOverlays(): void {
  setState({
    leftDrawerOpen: false,
    rightDrawerOpen: false,
    notificationCenterOpen: false,
  });
}

/** Update connection status */
export function setConnectionStatus(glasses: boolean, bridge: boolean): void {
  setState({ glassesConnected: glasses, bridgeConnected: bridge });
}

/** Update agent status */
export function setAgentStatus(status: AgentStatus): void {
  setState({ agentStatus: status });
}
