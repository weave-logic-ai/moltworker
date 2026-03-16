/**
 * TopBar — Status bar with breadcrumb, connection indicators, alert badges.
 * Surfaces context-breaking information regardless of current screen.
 *
 * Layout: [= Drawer] | Breadcrumb | [status dots] | [Tool Drawer =]
 */

import type { AgentStatus } from '@/types';
import { toggleLeftDrawer, toggleRightDrawer } from '@/store/app-state';

interface TopBarProps {
  breadcrumb: string[];
  glassesConnected: boolean;
  bridgeConnected: boolean;
  agentStatus: AgentStatus;
}

const AGENT_STATUS_COLOR: Record<AgentStatus, string> = {
  idle: 'var(--text-subtle)',
  thinking: 'var(--accent)',
  executing: 'var(--warning)',
  waiting: 'var(--info)',
  error: 'var(--destructive)',
};

export function TopBar({ breadcrumb, glassesConnected, bridgeConnected, agentStatus }: TopBarProps) {
  const breadcrumbText = breadcrumb.length > 0
    ? breadcrumb.join(' > ')
    : 'Clawdflare';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      minHeight: '44px',
    }}>
      {/* Left: Drawer trigger + Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <button
          onClick={toggleLeftDrawer}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
            flexShrink: 0,
          }}
          aria-label="Open context selector"
        >
          =
        </button>
        <span style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {breadcrumbText}
        </span>
      </div>

      {/* Center/Right: Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Glasses connection */}
        <span
          className={`status-dot ${glassesConnected ? 'status-dot--success' : 'status-dot--error'}`}
          title={glassesConnected ? 'Glasses connected' : 'Glasses disconnected'}
        />

        {/* Bridge connection */}
        <span
          className={`status-dot ${bridgeConnected ? 'status-dot--success' : 'status-dot--idle'}`}
          title={bridgeConnected ? 'Bridge connected' : 'Bridge disconnected'}
        />

        {/* Agent status */}
        <span
          className={`status-dot ${agentStatus === 'thinking' ? 'status-dot--glow' : ''}`}
          style={{ background: AGENT_STATUS_COLOR[agentStatus] }}
          title={`Agent: ${agentStatus}`}
        />

        {/* Time */}
        <span className="text-meta" style={{ marginLeft: '4px' }}>
          {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Right: Tool drawer trigger */}
      <button
        onClick={toggleRightDrawer}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '4px',
          marginLeft: '10px',
          flexShrink: 0,
        }}
        aria-label="Open debug tools"
      >
        =
      </button>
    </header>
  );
}
