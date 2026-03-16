/**
 * BottomBar -- Context-aware tab bar.
 *
 * Home tabs:     Chat | Comms | Admin | Settings
 * Workflow tabs:  Chat | Tasks | Files | Settings
 *
 * Features:
 * - Unicode icons for each tab
 * - Active tab has 2px accent underline
 * - Inactive tabs use --text-subtle color
 * - Smooth 200ms cross-fade transition when switching modes
 * - Calls navigate() to the correct route on tap
 */

import type { BottomBarMode } from '@/types';
import { navigate, homePath, workflowPath } from '@/lib/router';

interface BottomBarProps {
  mode: BottomBarMode;
  activeTab: number;
  workflowId?: string;
}

interface TabDef {
  label: string;
  icon: string;
}

const HOME_TABS: TabDef[] = [
  { label: 'Chat', icon: '\u2026' },       // horizontal ellipsis as chat bubble stand-in
  { label: 'Comms', icon: '\u2709' },      // envelope
  { label: 'Admin', icon: '\u2302' },      // house/server
  { label: 'Settings', icon: '\u2699' },   // gear
];

const WORKFLOW_TABS: TabDef[] = [
  { label: 'Chat', icon: '\u2026' },       // horizontal ellipsis
  { label: 'Tasks', icon: '\u2611' },      // checklist
  { label: 'Files', icon: '\u2630' },      // trigram/document
  { label: 'Settings', icon: '\u2699' },   // gear
];

const HOME_ROUTES: Array<'chat' | 'comms' | 'admin' | 'settings'> = ['chat', 'comms', 'admin', 'settings'];
const WORKFLOW_ROUTE_SUFFIXES: Array<undefined | 'tasks' | 'files' | 'settings'> = [undefined, 'tasks', 'files', 'settings'];

export function BottomBar({ mode, activeTab, workflowId }: BottomBarProps) {
  const tabs = mode === 'workflow' ? WORKFLOW_TABS : HOME_TABS;

  const handleTabClick = (index: number) => {
    if (mode === 'workflow' && workflowId) {
      navigate(workflowPath(workflowId, WORKFLOW_ROUTE_SUFFIXES[index]));
    } else {
      navigate(index === 0 ? '/' : homePath(HOME_ROUTES[index]));
    }
  };

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '428px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 0 env(safe-area-inset-bottom, 8px)',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      zIndex: 20,
      transition: 'opacity 200ms ease',
    }}>
      {tabs.map((tab, i) => {
        const isActive = activeTab === i;
        return (
          <button
            key={`${mode}-${tab.label}`}
            onClick={() => handleTabClick(i)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              color: isActive ? 'var(--text)' : 'var(--text-subtle)',
              transition: 'color 200ms ease',
              position: 'relative',
            }}
          >
            <span style={{
              fontSize: '18px',
              lineHeight: 1,
              transition: 'color 200ms ease',
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 600 : 400,
              transition: 'color 200ms ease, font-weight 200ms ease',
            }}>
              {tab.label}
            </span>
            {/* Active indicator underline */}
            <span style={{
              position: 'absolute',
              bottom: 0,
              left: '20%',
              right: '20%',
              height: '2px',
              borderRadius: '1px',
              background: isActive ? 'var(--accent)' : 'transparent',
              transition: 'background 200ms ease',
            }} />
          </button>
        );
      })}
    </nav>
  );
}
