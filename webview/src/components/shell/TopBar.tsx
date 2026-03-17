/**
 * TopBar -- Status bar with breadcrumb, connection indicators.
 *
 * Status dots:
 *   Dot 1: Glasses (green=connected, red=disconnected)
 *   Dot 2: Bridge relay (green=connected, amber=connecting, red=off)
 *   Dot 3: Gateway (green=healthy, red=down)
 */

import { useState, useEffect } from 'react';
import type { AgentStatus } from '@/types';
import { toggleLeftDrawer, toggleRightDrawer } from '@/store/app-state';
import { getRelayConnectionState, onRelayStateChange, type RelayConnectionState } from '@/lib/relay';
import { getConfig } from '@/lib/config';

interface TopBarProps {
  breadcrumb: string[];
  glassesConnected: boolean;
  bridgeConnected: boolean;
  agentStatus: AgentStatus;
}

export function TopBar({ breadcrumb, glassesConnected }: TopBarProps) {
  const [relayState, setRelayState] = useState<RelayConnectionState>(getRelayConnectionState());
  const [gatewayHealthy, setGatewayHealthy] = useState(false);

  useEffect(() => onRelayStateChange((s) => setRelayState(s)), []);

  // Poll gateway health
  useEffect(() => {
    let active = true;
    const { healthUrl } = getConfig();
    const check = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(healthUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (active) setGatewayHealthy(data.ok === true);
        } else {
          if (active) setGatewayHealthy(false);
        }
      } catch {
        if (active) setGatewayHealthy(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const breadcrumbText = breadcrumb.length > 0 ? breadcrumb.join(' > ') : 'Clawdflare';

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
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
          aria-label="Open context selector"
        >
          =
        </button>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {breadcrumbText}
        </span>
      </div>

      {/* Status dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Glasses */}
        <span
          className={`status-dot ${glassesConnected ? 'status-dot--success' : 'status-dot--error'}`}
          title={glassesConnected ? 'Glasses connected' : 'Glasses disconnected'}
        />
        {/* Bridge relay */}
        <span
          className={`status-dot ${relayState === 'connected' ? 'status-dot--success' : relayState === 'connecting' ? 'status-dot--warning' : 'status-dot--error'}`}
          title={`Bridge: ${relayState}`}
        />
        {/* Gateway */}
        <span
          className={`status-dot ${gatewayHealthy ? 'status-dot--success' : 'status-dot--error'}`}
          title={`Gateway: ${gatewayHealthy ? 'healthy' : 'down'}`}
        />
        {/* Time */}
        <span className="text-meta" style={{ marginLeft: '4px' }}>
          {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Right: Tool drawer */}
      <button
        onClick={toggleRightDrawer}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', padding: '4px', marginLeft: '10px', flexShrink: 0 }}
        aria-label="Open debug tools"
      >
        =
      </button>
    </header>
  );
}
