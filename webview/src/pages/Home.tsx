/**
 * Home screen -- displayed when no workflow is active.
 *
 * Tab 0 (Chat):     Agent status, quick actions, recent workflows, notifications
 * Tab 1 (Comms):    Communication officer placeholder
 * Tab 2 (Admin):    Server management with live service health
 * Tab 3 (Settings): Global settings placeholder
 */

import { useState, useEffect } from 'react';
import { navigate, workflowPath } from '@/lib/router';
import { enterWorkflow, closeAllOverlays } from '@/store/app-state';
import { getRelayConnectionState, onRelayStateChange, type RelayConnectionState } from '@/lib/relay';
import { getConfig } from '@/lib/config';
import type { Workflow } from '@/types';

const CLAWFT_ICON = 'https://i.ibb.co/50MnyLf/clawft.jpg';

const SAMPLE_WORKFLOWS: Workflow[] = [
  { id: 'wf-1', projectId: 'proj-1', name: 'Auth Service Refactor', status: 'active', messageCount: 42, lastActivity: '2m ago' },
  { id: 'wf-2', projectId: 'proj-1', name: 'Container Deploy Pipeline', status: 'active', messageCount: 28, lastActivity: '8m ago' },
  { id: 'wf-3', projectId: 'proj-1', name: 'API Gateway Rate Limiting', status: 'paused', messageCount: 15, lastActivity: '22m ago' },
];

interface HomeProps { activeTab: number; }

export function Home({ activeTab }: HomeProps) {
  switch (activeTab) {
    case 0: return <HomeChat />;
    case 1: return <HomeComms />;
    case 2: return <HomeAdmin />;
    case 3: return <HomeSettings />;
    default: return <HomeChat />;
  }
}

// ---------------------------------------------------------------------------
// Shared hook: poll gateway health via REST
// ---------------------------------------------------------------------------

function useGatewayHealthy(): boolean {
  const [healthy, setHealthy] = useState(false);
  useEffect(() => {
    let active = true;
    const { healthUrl } = getConfig();
    const check = async () => {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 5000);
        const res = await fetch(healthUrl, { signal: c.signal });
        clearTimeout(t);
        if (res.ok) { const d = await res.json(); if (active) setHealthy(d.ok === true); }
        else { if (active) setHealthy(false); }
      } catch { if (active) setHealthy(false); }
    };
    check();
    const id = setInterval(check, 10000);
    return () => { active = false; clearInterval(id); };
  }, []);
  return healthy;
}

function useRelayState(): RelayConnectionState {
  const [s, setS] = useState<RelayConnectionState>(getRelayConnectionState());
  useEffect(() => onRelayStateChange((next) => setS(next)), []);
  return s;
}

// ---------------------------------------------------------------------------
// Tab 0: Chat / Home
// ---------------------------------------------------------------------------

function HomeChat() {
  const gatewayHealthy = useGatewayHealthy();
  const relayState = useRelayState();

  const gwColor = gatewayHealthy ? 'var(--success)' : 'var(--destructive)';
  const gwLabel = gatewayHealthy ? 'Connected' : 'Offline';

  const handleWorkflowClick = (wf: Workflow) => {
    enterWorkflow(wf);
    navigate(workflowPath(wf.id));
    closeAllOverlays();
  };

  const handleNewConversation = () => {
    const id = `conv-${Date.now()}`;
    const wf: Workflow = { id, projectId: 'default', name: 'New Conversation', status: 'active', messageCount: 0, lastActivity: 'now' };
    enterWorkflow(wf);
    navigate(workflowPath(id));
  };

  return (
    <div className="content-padding">
      <div style={{ paddingTop: '20px', paddingBottom: '8px' }}>
        <h1 className="text-page-title">Good evening</h1>
        <p className="text-secondary" style={{ marginTop: '4px' }}>What would you like to work on?</p>
      </div>

      {/* Agent status card */}
      <div className="section-gap" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0' }}>
        <img
          src={CLAWFT_ICON}
          alt="ClawFT"
          style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2px solid ${gwColor}`, objectFit: 'cover' }}
        />
        <div style={{ flex: 1 }}>
          <div className="text-body" style={{ fontWeight: 500 }}>ClawFT Agent</div>
          <div className="text-secondary">{gwLabel}</div>
        </div>
        <span className="status-dot" style={{ background: gwColor }} />
      </div>

      {/* Connection summary */}
      <div style={{ display: 'flex', gap: '16px', padding: '8px 0' }}>
        <ConnDot label="Gateway" ok={gatewayHealthy} />
        <ConnDot label="Bridge" ok={relayState === 'connected'} />
        <ConnDot label="Glasses" ok={true} />
      </div>

      {/* Quick actions */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button className="pill" onClick={handleNewConversation}>+ New Conversation</button>
          <button className="pill">Resume Last</button>
          <button className="pill">Run Diagnostics</button>
        </div>
      </div>

      {/* Recent workflows */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Recent Workflows</div>
        {SAMPLE_WORKFLOWS.map((wf) => (
          <WorkflowRow key={wf.id} workflow={wf} onClick={() => handleWorkflowClick(wf)} />
        ))}
      </div>

      {/* Notifications */}
      <div className="section-gap-lg" style={{ paddingBottom: '32px' }}>
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Notifications</div>
        <NotifItem priority="info" title="System running normally" time="now" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Admin
// ---------------------------------------------------------------------------

function HomeAdmin() {
  const gatewayHealthy = useGatewayHealthy();
  const relayState = useRelayState();

  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-page-title">Administration</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>Server management and system health.</p>

      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Services</div>
        <ServiceRow name="OpenClaw Gateway" version="2026.3.14" ok={gatewayHealthy} />
        <ServiceRow name="Mentra Bridge" version="v2" ok={relayState === 'connected'} />
        <ServiceRow name="Mentra Glasses" version="--" ok={true} />
      </div>

      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Actions</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="pill">Restart Gateway</button>
          <button className="pill">Redeploy</button>
          <button className="pill">Clear Cache</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 + 3: Comms + Settings (unchanged)
// ---------------------------------------------------------------------------

function HomeComms() {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-page-title">Communications</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>Email, messaging, and posts.</p>
      <div className="section-gap-lg" style={{ color: 'var(--text-subtle)', padding: '32px 0', textAlign: 'center' }}>
        No emails yet
      </div>
    </div>
  );
}

function HomeSettings() {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-page-title">Settings</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>Global preferences and account configuration.</p>
      <div className="section-gap-lg">
        <SettingsGroup label="Display" items={['Dark mode (always)', 'Font size: Default']} />
        <SettingsGroup label="Connection" items={['Auto-reconnect: On', 'WebSocket timeout: 30s']} />
        <SettingsGroup label="Agent Defaults" items={['Model: Auto', 'Max tokens: 256']} />
        <SettingsGroup label="Notifications" items={['Push: On', 'Sound: On']} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConnDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ok ? 'var(--success)' : 'var(--destructive)', flexShrink: 0 }} />
      <span style={{ color: 'var(--text-subtle)' }}>{label}</span>
    </div>
  );
}

function WorkflowRow({ workflow, onClick }: { workflow: Workflow; onClick: () => void }) {
  const sc: Record<string, string> = { active: 'var(--success)', paused: 'var(--warning)', completed: 'var(--text-subtle)', error: 'var(--destructive)' };
  return (
    <div className="ghost-border" onClick={onClick} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', cursor: 'pointer' }}>
      <span className="status-dot" style={{ background: sc[workflow.status], marginRight: '10px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-body" style={{ fontWeight: 500 }}>{workflow.name}</div>
        <div className="text-meta">{workflow.messageCount} messages</div>
      </div>
      <span className="text-meta">{workflow.lastActivity}</span>
    </div>
  );
}

function NotifItem({ priority, title, time }: { priority: string; title: string; time: string }) {
  const bc: Record<string, string> = { critical: 'var(--destructive)', warning: 'var(--warning)', info: 'var(--info)', success: 'var(--success)' };
  return (
    <div style={{ borderLeft: `2px solid ${bc[priority] || 'var(--border)'}`, paddingLeft: '12px', padding: '8px 0 8px 12px', marginBottom: '4px' }}>
      <div className="text-body">{title}</div>
      <div className="text-meta">{time}</div>
    </div>
  );
}

function ServiceRow({ name, version, ok }: { name: string; version: string; ok: boolean }) {
  return (
    <div className="ghost-border" style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
      <span className={`status-dot ${ok ? 'status-dot--success' : 'status-dot--error'}`} style={{ marginRight: '10px' }} />
      <div style={{ flex: 1 }}>
        <div className="text-body">{name}</div>
        <div className="text-meta">{version}</div>
      </div>
      <span className="text-meta" style={{ color: ok ? 'var(--success)' : 'var(--destructive)' }}>{ok ? 'running' : 'offline'}</span>
    </div>
  );
}

function SettingsGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div className="text-section-label" style={{ marginBottom: '8px' }}>{label}</div>
      {items.map((item) => (
        <div key={item} className="ghost-border" style={{ padding: '10px 0' }}>
          <span className="text-body">{item}</span>
        </div>
      ))}
    </div>
  );
}
