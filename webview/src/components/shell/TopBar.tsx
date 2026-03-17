/**
 * TopBar -- Status bar with breadcrumb, connection indicators, alert badges.
 * Surfaces context-breaking information regardless of current screen.
 *
 * Layout: [= Drawer] | Breadcrumb | [status dots] | [Tool Drawer =]
 *
 * Status dots are wired to live connection state:
 *   Dot 1: Glasses (from app-state, set by relay events)
 *   Dot 2: Bridge relay connection
 *   Dot 3: Agent/gateway status
 *
 * Colors: green=connected, amber=reconnecting, red=disconnected
 */

import { useState, useEffect } from 'react';
import type { AgentStatus } from '@/types';
import { toggleLeftDrawer, toggleRightDrawer } from '@/store/app-state';
import { getRelayConnectionState, onRelayStateChange, type RelayConnectionState } from '@/lib/relay';

interface TopBarProps {
  breadcrumb: string[];
  glassesConnected: boolean;
  bridgeConnected: boolean;
  agentStatus: AgentStatus;
}

function connDotClass(connected: boolean, reconnecting: boolean): string {
  if (connected) return 'status-dot--success';
  if (reconnecting) return 'status-dot--warning';
  return 'status-dot--error';
}

const AGENT_STATUS_COLOR: Record<AgentStatus, string> = {
  idle: 'var(--text-subtle)',
  thinking: 'var(--accent)',
  executing: 'var(--warning)',
  waiting: 'var(--info)',
  error: 'var(--destructive)',
};

export function TopBar({ breadcrumb, glassesConnected, agentStatus }: TopBarProps) {
  const [relayState, setRelayState] = useState<RelayConnectionState>(getRelayConnectionState());
  const [gatewayHealthy, setGatewayHealthy] = useState(false);

  useEffect(() => onRelayStateChange((s) => setRelayState(s)), []);

  // Poll gateway health via REST (no WS pairing needed)
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch('https://moltworker.aebots.org/health', { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (active) setGatewayHealthy(data.ok === true);
      } catch { if (active) setGatewayHealthy(false); }
    };
    check();
    const id = setInterval(check, 15000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const breadcrumbText = breadcrumb.length > 0
    ? breadcrumb.join(' > ')
    : 'Clawdflare';

  // Glasses: green if connected, red if not
  const glassesDotClass = glassesConnected ? 'status-dot--success' : 'status-dot--error';

  // Bridge relay: green=connected, amber=connecting, red=disconnected/error
  const bridgeDotClass = connDotClass(
    relayState === 'connected',
    relayState === 'connecting',
  );

  // Agent/gateway status: use agent status color if gateway healthy, else red
  const agentDotColor = gatewayHealthy
    ? AGENT_STATUS_COLOR[agentStatus]
    : 'var(--destructive)';

  const agentGlow = agentStatus === 'thinking' && gatewayHealthy;

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
          className={`status-dot ${glassesDotClass}`}
          title={glassesConnected ? 'Glasses connected' : 'Glasses disconnected'}
        />

        {/* Bridge connection */}
        <span
          className={`status-dot ${bridgeDotClass}`}
          title={`Bridge: ${relayState}`}
        />

        {/* Agent status */}
        <span
          className={`status-dot ${agentGlow ? 'status-dot--glow' : ''}`}
          style={{ background: agentDotColor }}
          title={`Agent: ${agentStatus} | Gateway: ${gatewayHealthy ? 'healthy' : 'down'}`}
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
