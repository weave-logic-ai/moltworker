/**
 * Simple hash-based router for WebView compatibility.
 * Matches URL routes from docs/UI/app-structure.md:
 *
 *   /                         -> Home screen
 *   /chat                     -> Home > Chat tab
 *   /comms                    -> Home > Comms tab
 *   /admin                    -> Home > Admin tab
 *   /settings                 -> Home > Settings tab
 *   /w/:workflowId            -> Workflow > Chat tab
 *   /w/:workflowId/tasks      -> Workflow > Tasks tab
 *   /w/:workflowId/files      -> Workflow > Files tab
 *   /w/:workflowId/settings   -> Workflow > Settings tab
 */

import type { RouteMatch } from '@/types';

// ---------------------------------------------------------------------------
// Route Definitions
// ---------------------------------------------------------------------------

interface RoutePattern {
  pattern: RegExp;
  paramNames: string[];
}

const ROUTES: RoutePattern[] = [
  { pattern: /^\/$/, paramNames: [] },
  { pattern: /^\/chat$/, paramNames: [] },
  { pattern: /^\/comms$/, paramNames: [] },
  { pattern: /^\/admin$/, paramNames: [] },
  { pattern: /^\/settings$/, paramNames: [] },
  { pattern: /^\/w\/([^/]+)$/, paramNames: ['workflowId'] },
  { pattern: /^\/w\/([^/]+)\/tasks$/, paramNames: ['workflowId'] },
  { pattern: /^\/w\/([^/]+)\/files$/, paramNames: ['workflowId'] },
  { pattern: /^\/w\/([^/]+)\/settings$/, paramNames: ['workflowId'] },
];

// ---------------------------------------------------------------------------
// Hash Parsing
// ---------------------------------------------------------------------------

/** Extract the path from window.location.hash (e.g., '#/w/abc' -> '/w/abc') */
export function getHashPath(): string {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

/** Match the current hash path against defined routes */
export function matchRoute(path: string): RouteMatch {
  for (const route of ROUTES) {
    const match = path.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { path, params };
    }
  }

  // Default: home screen
  return { path: '/', params: {} };
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/** Navigate to a hash path */
export function navigate(path: string): void {
  window.location.hash = path;
}

/** Subscribe to hash changes. Returns an unsubscribe function. */
export function onRouteChange(callback: (route: RouteMatch) => void): () => void {
  const handler = () => {
    const path = getHashPath();
    callback(matchRoute(path));
  };

  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

// ---------------------------------------------------------------------------
// Route Helpers
// ---------------------------------------------------------------------------

/** Check if the current route is a workflow route */
export function isWorkflowRoute(path: string): boolean {
  return path.startsWith('/w/');
}

/** Extract workflow ID from a workflow route path */
export function getWorkflowId(path: string): string | null {
  const match = path.match(/^\/w\/([^/]+)/);
  return match ? match[1] : null;
}

/** Get the active tab index from the current route path */
export function getTabFromPath(path: string): number {
  if (isWorkflowRoute(path)) {
    if (path.endsWith('/tasks')) return 1;
    if (path.endsWith('/files')) return 2;
    if (path.endsWith('/settings')) return 3;
    return 0; // chat
  }

  switch (path) {
    case '/comms': return 1;
    case '/admin': return 2;
    case '/settings': return 3;
    default: return 0; // chat or home
  }
}

/** Build a workflow route path */
export function workflowPath(workflowId: string, tab?: 'tasks' | 'files' | 'settings'): string {
  const base = `/w/${workflowId}`;
  return tab ? `${base}/${tab}` : base;
}

/** Build a home route path */
export function homePath(tab?: 'chat' | 'comms' | 'admin' | 'settings'): string {
  return tab ? `/${tab}` : '/';
}
