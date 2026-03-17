/**
 * Core types for the Clawdflare Bridge webview application.
 * Based on docs/UI/app-structure.md
 */

// ---------------------------------------------------------------------------
// Context Hierarchy: Client > Project > Workflow
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  name: string;
  plan: string;
  seats: number;
  projects: Project[];
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  workflows: Workflow[];
}

export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  messageCount: number;
  lastActivity: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// App State
// ---------------------------------------------------------------------------

export type ContextLevel = 'none' | 'client' | 'project' | 'workflow';

export type BottomBarMode = 'home' | 'workflow';

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting' | 'error';

export interface AppState {
  // Context hierarchy
  activeClient: Client | null;
  activeProject: Project | null;
  activeWorkflow: Workflow | null;

  // Derived
  contextLevel: ContextLevel;
  bottomBarMode: BottomBarMode;
  breadcrumb: string[];

  // UI state
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
  notificationCenterOpen: boolean;
  activeTab: number; // 0-3

  // Connection
  glassesConnected: boolean;
  bridgeConnected: boolean;
  agentStatus: AgentStatus;

  // Audio
  muted: boolean;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/** Home context tabs (bottom bar) */
export type HomeTab = 'chat' | 'comms' | 'admin' | 'settings';

/** Workflow context tabs (bottom bar) */
export type WorkflowTab = 'chat' | 'tasks' | 'files' | 'settings';

/** Route definition */
export interface RouteMatch {
  path: string;
  params: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationPriority = 'critical' | 'warning' | 'info' | 'success';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  priority: NotificationPriority;
  timestamp: string;
  read: boolean;
}
