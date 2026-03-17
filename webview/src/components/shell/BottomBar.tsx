/**
 * BottomBar -- Tab navigation + mic mute + audio silence controls.
 *
 * Layout: [tabs...] | [mic] [audio]
 *
 * Mic and audio buttons are always visible with clear active/muted states.
 * Red background when muted/silenced, green when active.
 */

import type { BottomBarMode } from '@/types';
import { navigate, homePath, workflowPath } from '@/lib/router';
import { toggleMicMute, toggleAudioSilence } from '@/store/app-state';

interface BottomBarProps {
  mode: BottomBarMode;
  activeTab: number;
  workflowId?: string;
  micMuted: boolean;
  audioSilenced: boolean;
}

interface TabDef { label: string; icon: string; }

const HOME_TABS: TabDef[] = [
  { label: 'Chat', icon: '\u2026' },
  { label: 'Comms', icon: '\u2709' },
  { label: 'Admin', icon: '\u2302' },
  { label: 'Settings', icon: '\u2699' },
];

const WORKFLOW_TABS: TabDef[] = [
  { label: 'Chat', icon: '\u2026' },
  { label: 'Tasks', icon: '\u2611' },
  { label: 'Files', icon: '\u2630' },
  { label: 'Settings', icon: '\u2699' },
];

const HOME_ROUTES: Array<'chat' | 'comms' | 'admin' | 'settings'> = ['chat', 'comms', 'admin', 'settings'];
const WORKFLOW_SUFFIXES: Array<undefined | 'tasks' | 'files' | 'settings'> = [undefined, 'tasks', 'files', 'settings'];

export function BottomBar({ mode, activeTab, workflowId, micMuted, audioSilenced }: BottomBarProps) {
  const tabs = mode === 'workflow' ? WORKFLOW_TABS : HOME_TABS;

  const handleTabClick = (i: number) => {
    if (mode === 'workflow' && workflowId) navigate(workflowPath(workflowId, WORKFLOW_SUFFIXES[i]));
    else navigate(i === 0 ? '/' : homePath(HOME_ROUTES[i]));
  };

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '428px', display: 'flex', alignItems: 'center',
      padding: '6px 4px env(safe-area-inset-bottom, 6px)',
      borderTop: '1px solid var(--border)', background: 'var(--bg)', zIndex: 20,
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
        {tabs.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <button key={`${mode}-${tab.label}`} onClick={() => handleTabClick(i)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
              color: isActive ? 'var(--text)' : 'var(--text-subtle)', position: 'relative',
            }}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: '9px', fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
              <span style={{
                position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '2px',
                borderRadius: '1px', background: isActive ? 'var(--accent)' : 'transparent',
              }} />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', background: 'var(--border)', flexShrink: 0 }} />

      {/* Mic mute button */}
      <button
        onClick={toggleMicMute}
        title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          border: 'none', cursor: 'pointer', padding: '4px 10px', flexShrink: 0,
          borderRadius: '8px', margin: '0 2px',
          background: micMuted ? 'rgba(239,68,68,0.15)' : 'rgba(78,204,163,0.1)',
          color: micMuted ? 'var(--destructive)' : 'var(--success)',
          transition: 'all 200ms ease',
        }}
      >
        <span style={{ fontSize: '18px', lineHeight: 1 }}>
          {micMuted ? '\uD83D\uDD07' : '\uD83C\uDF99'}
        </span>
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.3px' }}>
          {micMuted ? 'MIC OFF' : 'MIC'}
        </span>
      </button>

      {/* Audio silence button */}
      <button
        onClick={toggleAudioSilence}
        title={audioSilenced ? 'Unmute Audio' : 'Silence Audio'}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          border: 'none', cursor: 'pointer', padding: '4px 10px', flexShrink: 0,
          borderRadius: '8px', margin: '0 2px',
          background: audioSilenced ? 'rgba(239,68,68,0.15)' : 'rgba(78,204,163,0.1)',
          color: audioSilenced ? 'var(--destructive)' : 'var(--success)',
          transition: 'all 200ms ease',
        }}
      >
        <span style={{ fontSize: '18px', lineHeight: 1 }}>
          {audioSilenced ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
        </span>
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.3px' }}>
          {audioSilenced ? 'MUTED' : 'AUDIO'}
        </span>
      </button>
    </nav>
  );
}
