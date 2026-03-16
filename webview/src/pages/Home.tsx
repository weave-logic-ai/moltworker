/**
 * Home screen — displayed when no workflow is active.
 *
 * Content varies by active tab:
 *   Tab 0 (Chat):     Greeting, recent workflows, quick actions, notifications
 *   Tab 1 (Comms):    Communication officer placeholder
 *   Tab 2 (Admin):    Server management placeholder
 *   Tab 3 (Settings): Global settings placeholder
 */

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
        <div>
          <div className="text-body" style={{ fontWeight: 500 }}>OpenClaw Agent</div>
          <div className="text-secondary">Idle</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Quick Actions</div>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '4px',
        }}>
          <button className="pill">+ New Workflow</button>
          <button className="pill">Resume Last</button>
          <button className="pill">View Notifications</button>
        </div>
      </div>

      {/* Recent workflows */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Recent Workflows</div>
        <WorkflowListItem name="Deploy Fix #37" status="active" time="2m ago" messages={42} />
        <WorkflowListItem name="Auth Refactor" status="paused" time="1h ago" messages={128} />
        <WorkflowListItem name="CI/CD Setup" status="completed" time="3h ago" messages={67} />
      </div>

      {/* Notifications */}
      <div className="section-gap-lg" style={{ paddingBottom: '32px' }}>
        <div className="text-section-label" style={{ marginBottom: '10px' }}>Notifications</div>
        <NotificationItem priority="warning" title="Build failed on staging" time="5m ago" />
        <NotificationItem priority="info" title="PR #45 merged" time="12m ago" />
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

function WorkflowListItem({ name, status, time, messages }: {
  name: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  time: string;
  messages: number;
}) {
  const statusColor: Record<string, string> = {
    active: 'var(--success)',
    paused: 'var(--warning)',
    completed: 'var(--text-subtle)',
    error: 'var(--destructive)',
  };

  return (
    <div className="ghost-border" style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 0',
      cursor: 'pointer',
    }}>
      <span className="status-dot" style={{ background: statusColor[status], marginRight: '10px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-body" style={{ fontWeight: 500 }}>{name}</div>
        <div className="text-meta">{messages} messages</div>
      </div>
      <span className="text-meta">{time}</span>
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
