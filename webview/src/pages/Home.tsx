/**
 * Home screen -- displayed when no workflow is active.
 *
 * Content varies by active tab:
 *   Tab 0 (Chat):     Greeting, agent status, quick actions, recent workflows,
 *                      notifications with priority coloring
 *   Tab 1 (Comms):    Communication officer placeholder
 *   Tab 2 (Admin):    Server management placeholder
 *   Tab 3 (Settings): Global settings placeholder
 */

import { navigate, workflowPath } from '@/lib/router';
import { enterWorkflow, closeAllOverlays } from '@/store/app-state';
import type { Workflow } from '@/types';

// ---------------------------------------------------------------------------
// Shared sample data (same as LeftDrawer)
// ---------------------------------------------------------------------------

const SAMPLE_WORKFLOWS: Workflow[] = [
  { id: 'wf-1', projectId: 'proj-1', name: 'Auth Service Refactor', status: 'active', messageCount: 42, lastActivity: '2m ago' },
  { id: 'wf-2', projectId: 'proj-1', name: 'Container Deploy Pipeline', status: 'active', messageCount: 28, lastActivity: '8m ago' },
  { id: 'wf-3', projectId: 'proj-1', name: 'API Gateway Rate Limiting', status: 'paused', messageCount: 15, lastActivity: '22m ago' },
  { id: 'wf-4', projectId: 'proj-2', name: 'Edge CDN Configuration', status: 'active', messageCount: 67, lastActivity: '1h ago' },
  { id: 'wf-5', projectId: 'proj-2', name: 'DNS Migration', status: 'completed', messageCount: 89, lastActivity: '2d ago' },
];

interface HomeProps {
  activeTab: number;
}

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
// Tab 0: Chat / Home
// ---------------------------------------------------------------------------

function HomeChat() {
  const handleWorkflowClick = (wf: Workflow) => {
    enterWorkflow(wf);
    navigate(workflowPath(wf.id));
    closeAllOverlays();
  };

  return (
    <div className="content-padding">
      {/* Greeting */}
      <div style={{ paddingTop: '20px', paddingBottom: '8px' }}>
        <h1 className="text-page-title">Good evening</h1>
        <p className="text-secondary" style={{ marginTop: '4px' }}>
          What would you like to work on?
        </p>
      </div>

      {/* Agent status card */}
      <div className="section-gap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 0',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '2px solid var(--text-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 600,
          flexShrink: 0,
        }}>
          OC
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-body" style={{ fontWeight: 500 }}>OpenClaw Agent</div>
          <div className="text-secondary">Idle</div>
        </div>
        <span className="status-dot status-dot--success" style={{ marginRight: '4px' }} />
      </div>

      {/* Quick actions -- horizontal scrollable pills */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Quick Actions</div>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}>
          <button className="pill">+ New Workflow</button>
          <button className="pill">Resume Last</button>
          <button className="pill">View Notifications</button>
          <button className="pill">Run Diagnostics</button>
        </div>
      </div>

      {/* Recent workflows -- using shared sample data */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Recent Workflows</div>
        {SAMPLE_WORKFLOWS.map((wf) => (
          <WorkflowListItem
            key={wf.id}
            workflow={wf}
            onClick={() => handleWorkflowClick(wf)}
          />
        ))}
      </div>

      {/* Notifications */}
      <div className="section-gap-lg" style={{ paddingBottom: '32px' }}>
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Notifications</div>
        <NotificationItem priority="critical" title="Health check failed on staging" time="2m ago" />
        <NotificationItem priority="warning" title="Memory GC threshold reached (90%)" time="5m ago" />
        <NotificationItem priority="info" title="PR #45 merged successfully" time="12m ago" />
        <NotificationItem priority="success" title="Deploy to production succeeded" time="1h ago" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Comms
// ---------------------------------------------------------------------------

function HomeComms() {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-page-title">Communications</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>
        Email, messaging, and posts. Agent-triaged inbox.
      </p>

      <div className="section-gap-lg">
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <span className="tab-underline tab-underline--active">Email</span>
          <span className="tab-underline">Messages</span>
          <span className="tab-underline">Posts</span>
        </div>

        <div style={{ color: 'var(--text-subtle)', padding: '32px 0', textAlign: 'center' }}>
          No emails yet
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Admin
// ---------------------------------------------------------------------------

function HomeAdmin() {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-page-title">Administration</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>
        Server management, deployments, and system health.
      </p>

      {/* Service status */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Services</div>
        <ServiceItem name="OpenClaw Gateway" version="2026.3.13" status="running" />
        <ServiceItem name="Mentra Bridge" version="1.0.0" status="running" />
        <ServiceItem name="Cloudflare Tunnel" version="--" status="connected" />
      </div>

      {/* Quick actions */}
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
// Tab 3: Settings
// ---------------------------------------------------------------------------

function HomeSettings() {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-page-title">Settings</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>
        Global preferences and account configuration.
      </p>

      <div className="section-gap-lg">
        <SettingsGroup label="Display" items={['Dark mode (always)', 'Font size: Default']} />
        <SettingsGroup label="Connection" items={['Auto-reconnect: On', 'WebSocket timeout: 30s']} />
        <SettingsGroup label="Agent Defaults" items={['Model: Auto', 'Max tokens: 256']} />
        <SettingsGroup label="Notifications" items={['Push: On', 'Sound: On', 'High-priority TTS: On']} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorkflowListItem({ workflow, onClick }: {
  workflow: Workflow;
  onClick: () => void;
}) {
  const statusColor: Record<string, string> = {
    active: 'var(--success)',
    paused: 'var(--warning)',
    completed: 'var(--text-subtle)',
    error: 'var(--destructive)',
  };

  return (
    <div
      className="ghost-border"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
        cursor: 'pointer',
        transition: 'background 150ms ease',
      }}
    >
      <span className="status-dot" style={{ background: statusColor[workflow.status], marginRight: '10px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-body" style={{ fontWeight: 500 }}>{workflow.name}</div>
        <div className="text-meta">{workflow.messageCount} messages</div>
      </div>
      <span className="text-meta">{workflow.lastActivity}</span>
    </div>
  );
}

function NotificationItem({ priority, title, time }: {
  priority: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  time: string;
}) {
  const borderColor: Record<string, string> = {
    critical: 'var(--destructive)',
    warning: 'var(--warning)',
    info: 'var(--info)',
    success: 'var(--success)',
  };

  return (
    <div style={{
      borderLeft: `2px solid ${borderColor[priority]}`,
      paddingLeft: '12px',
      paddingTop: '8px',
      paddingBottom: '8px',
      marginBottom: '4px',
    }}>
      <div className="text-body">{title}</div>
      <div className="text-meta">{time}</div>
    </div>
  );
}

function ServiceItem({ name, version, status }: {
  name: string;
  version: string;
  status: string;
}) {
  return (
    <div className="ghost-border" style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 0',
    }}>
      <span className="status-dot status-dot--success" style={{ marginRight: '10px' }} />
      <div style={{ flex: 1 }}>
        <div className="text-body">{name}</div>
        <div className="text-meta">{version}</div>
      </div>
      <span className="text-meta" style={{ color: 'var(--success)' }}>{status}</span>
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
