/**
 * BottomBar -- Two-row layout: Control Row (PTT + mic/audio) + Nav Rail.
 *
 * Control Row: [Mic Mode 36px] --- [PTT 72px center] --- [Audio 36px]
 * Nav Rail:    [Chat] [Comms/Tasks] [Admin/Files] [Settings]
 *
 * PTT is the primary interaction. Hold to talk, release to stop.
 * Mic mode cycles: PTT → Always-Listening → Muted
 */

import { useState, useCallback } from 'react';
import type { BottomBarMode } from '@/types';
import { navigate, homePath, workflowPath } from '@/lib/router';
import { toggleMicMute, toggleAudioSilence } from '@/store/app-state';

export type MicMode = 'ptt' | 'always' | 'muted';

interface BottomBarProps {
  mode: BottomBarMode;
  activeTab: number;
  workflowId?: string;
  micMuted: boolean;
  audioSilenced: boolean;
  onPttDown?: () => void;
  onPttUp?: () => void;
  onMicModeChange?: (mode: MicMode) => void;
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

const MIC_MODES: MicMode[] = ['ptt', 'always', 'muted'];

export function BottomBar({ mode, activeTab, workflowId, micMuted, audioSilenced, onPttDown, onPttUp, onMicModeChange }: BottomBarProps) {
  const tabs = mode === 'workflow' ? WORKFLOW_TABS : HOME_TABS;
  const [pttActive, setPttActive] = useState(false);
  const [micMode, setMicMode] = useState<MicMode>(micMuted ? 'muted' : 'ptt');

  const handleTabClick = (i: number) => {
    if (mode === 'workflow' && workflowId) navigate(workflowPath(workflowId, WORKFLOW_SUFFIXES[i]));
    else navigate(i === 0 ? '/' : homePath(HOME_ROUTES[i]));
  };

  // PTT handlers
  const handlePttDown = useCallback(() => {
    if (micMode === 'muted') return;
    setPttActive(true);
    onPttDown?.();
    try { navigator.vibrate?.(30); } catch {}
  }, [micMode, onPttDown]);

  const handlePttUp = useCallback(() => {
    setPttActive(false);
    onPttUp?.();
    try { navigator.vibrate?.(15); } catch {}
  }, [onPttUp]);

  // Mic mode cycling
  const cycleMicMode = () => {
    const idx = MIC_MODES.indexOf(micMode);
    const next = MIC_MODES[(idx + 1) % MIC_MODES.length];
    setMicMode(next);
    if (next === 'muted') toggleMicMute();
    else if (micMuted) toggleMicMute(); // unmute
    onMicModeChange?.(next);
  };

  // PTT button color/state
  const pttBg = micMode === 'muted' ? 'var(--text-subtle)' : micMode === 'always' ? 'var(--success)' : 'var(--accent)';
  const pttLabel = micMode === 'ptt' ? (pttActive ? 'LISTENING' : 'HOLD') : micMode === 'always' ? 'LIVE' : '';

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '428px', zIndex: 20 }}>
      {/* Control Row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '68px', padding: '0 20px', background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
      }}>
        {/* Mic Mode (left) */}
        <button
          onClick={cycleMicMode}
          style={{
            width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, position: 'absolute', left: '40px',
            background: micMode === 'muted' ? 'rgba(239,68,68,0.1)' : 'transparent',
            border: `1.5px solid ${micMode === 'muted' ? 'var(--destructive)' : micMode === 'always' ? 'var(--success)' : 'var(--border-strong, rgba(255,255,255,0.12))'}`,
            color: micMode === 'muted' ? 'var(--destructive)' : micMode === 'always' ? 'var(--success)' : 'var(--text)',
            transition: 'all 200ms ease',
          }}
          title={`Mic: ${micMode}`}
        >
          <span style={{ fontSize: '10px', fontWeight: 600 }}>
            {micMode === 'ptt' ? 'PTT' : micMode === 'always' ? '\uD83C\uDF99' : '\uD83D\uDD07'}
          </span>
        </button>

        {/* PTT Button (center) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button
            onMouseDown={micMode === 'ptt' ? handlePttDown : undefined}
            onMouseUp={micMode === 'ptt' ? handlePttUp : undefined}
            onMouseLeave={pttActive ? handlePttUp : undefined}
            onTouchStart={micMode === 'ptt' ? handlePttDown : undefined}
            onTouchEnd={micMode === 'ptt' ? handlePttUp : undefined}
            onClick={micMode === 'always' ? toggleMicMute : undefined}
            style={{
              width: '72px', height: '72px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: pttBg,
              border: pttActive ? '3px solid var(--text)' : '3px solid transparent',
              transform: pttActive ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 80ms ease-out, border 80ms ease-out, box-shadow 200ms ease',
              boxShadow: pttActive
                ? '0 0 0 6px rgba(233,69,96,0.3)'
                : micMode !== 'muted'
                  ? '0 0 0 4px rgba(233,69,96,0.15)'
                  : 'none',
              opacity: micMode === 'muted' ? 0.5 : 1,
            }}
            disabled={micMode === 'muted'}
          >
            <span style={{ fontSize: '28px', color: 'var(--text)' }}>
              {micMode === 'muted' ? '\uD83D\uDD07' : pttActive ? '\uD83C\uDF99' : '\uD83C\uDF99'}
            </span>
          </button>
          <span style={{
            fontSize: '9px', fontWeight: 500, letterSpacing: '1.5px',
            color: pttActive ? 'var(--text)' : 'var(--text-muted)',
            height: '12px',
          }}>
            {pttLabel}
          </span>
        </div>

        {/* Audio (right) */}
        <button
          onClick={toggleAudioSilence}
          style={{
            width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, position: 'absolute', right: '40px',
            background: audioSilenced ? 'rgba(245,158,11,0.1)' : 'transparent',
            border: `1.5px solid ${audioSilenced ? 'var(--warning)' : 'var(--border-strong, rgba(255,255,255,0.12))'}`,
            color: audioSilenced ? 'var(--warning)' : 'var(--text)',
            transition: 'all 200ms ease',
          }}
          title={audioSilenced ? 'Audio silenced' : 'Audio on'}
        >
          <span style={{ fontSize: '16px' }}>
            {audioSilenced ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
          </span>
        </button>
      </div>

      {/* Nav Rail */}
      <div style={{
        display: 'flex', height: '44px', background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '0 0 env(safe-area-inset-bottom, 4px)',
      }}>
        {tabs.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <button key={`${mode}-${tab.label}`} onClick={() => handleTabClick(i)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '2px', background: 'none', border: 'none',
              cursor: 'pointer', position: 'relative',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 200ms ease',
            }}>
              {isActive && <span style={{
                position: 'absolute', top: '-1px', width: '24px', height: '3px',
                borderRadius: '2px', background: 'var(--accent)',
              }} />}
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: '9px', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text-subtle)' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
