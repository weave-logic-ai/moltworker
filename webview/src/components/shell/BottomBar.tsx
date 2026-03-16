/**
 * BottomBar — Context-aware tab bar.
 *
 * Home tabs:     Chat | Comms | Admin | Settings
 * Workflow tabs:  Chat | Tasks | Files | Settings
 *
 * The tabs change labels when entering/exiting a workflow.
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
  { label: 'Chat', icon: '\u{1F4AC}' },    // speech bubble
  { label: 'Comms', icon: '\u{2709}' },     // envelope
  { label: 'Admin', icon: '\u{1F5A5}' },    // desktop
  { label: 'Settings', icon: '\u{2699}' },  // gear
];

const WORKFLOW_TABS: TabDef[] = [
  { label: 'Chat', icon: '\u{1F4AC}' },     // speech bubble
  { label: 'Tasks', icon: '\u{2611}' },      // checklist
  { label: 'Files', icon: '\u{1F4C4}' },     // document
  { label: 'Settings', icon: '\u{2699}' },   // gear
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
    }}>
      {tabs.map((tab, i) => {
        const isActive = activeTab === i;
        return (
          <button
            key={tab.label}
            onClick={() => handleTabClick(i)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              color: isActive ? 'var(--text)' : 'var(--text-subtle)',
              transition: 'color 150ms ease',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
