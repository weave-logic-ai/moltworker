/**
 * Workflow screen — displayed when a workflow is active.
 *
 * Content varies by active tab:
 *   Tab 0 (Chat):     Workflow conversation (timeline view)
 *   Tab 1 (Tasks):    Workflow-specific tasks
 *   Tab 2 (Files):    Workflow files and diffs
 *   Tab 3 (Settings): Workflow-scoped settings
 */

interface WorkflowProps {
  workflowId: string;
  activeTab: number;
}

export function Workflow({ workflowId, activeTab }: WorkflowProps) {
  switch (activeTab) {
    case 0: return <WorkflowChat workflowId={workflowId} />;
    case 1: return <WorkflowTasks workflowId={workflowId} />;
    case 2: return <WorkflowFiles workflowId={workflowId} />;
    case 3: return <WorkflowSettings workflowId={workflowId} />;
    default: return <WorkflowChat workflowId={workflowId} />;
  }
}

// ---------------------------------------------------------------------------
// Tab 0: Chat (Workflow Conversation)
// ---------------------------------------------------------------------------

function WorkflowChat({ workflowId }: { workflowId: string }) {
  return (
    <div className="content-padding" style={{ paddingTop: '12px' }}>
      {/* Workflow header */}
      <div style={{ paddingBottom: '16px' }}>
        <h1 className="text-section-title">Workflow {workflowId}</h1>
        <div className="text-meta" style={{ marginTop: '4px' }}>
          Active conversation
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '20px' }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute',
          left: '4px',
          top: '0',
          bottom: '0',
          width: '1px',
          background: 'var(--border)',
        }} />

        {/* Timeline entries */}
        <TimelineEntry
          type="user"
          author="You"
          time="2:15 PM"
          content="Deploy the authentication fix to staging"
          isActive={false}
        />
        <TimelineEntry
          type="agent"
          author="OpenClaw"
          time="2:15 PM"
          content="I'll deploy the auth fix. Let me check the current staging status first..."
          isActive={false}
        />
        <TimelineEntry
          type="tool"
          author="Tool: deploy-check"
          time="2:16 PM"
          content="staging: healthy (v2.3.1)\nauth-service: running\nlast-deploy: 3h ago"
          isActive={false}
        />
        <TimelineEntry
          type="agent"
          author="OpenClaw"
          time="2:16 PM"
          content="Staging is healthy. Ready to deploy. Shall I proceed?"
          isActive={true}
        />

        {/* Thinking indicator placeholder */}
        <div style={{ padding: '12px 0', display: 'flex', gap: '4px' }}>
          <span className="animate-thinking" style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: 'var(--text-subtle)', animationDelay: '0s',
          }} />
          <span className="animate-thinking" style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: 'var(--text-subtle)', animationDelay: '0.16s',
          }} />
          <span className="animate-thinking" style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: 'var(--text-subtle)', animationDelay: '0.32s',
          }} />
        </div>
      </div>

      {/* Input area placeholder */}
      <div style={{
        position: 'sticky',
        bottom: '68px',
        padding: '12px 0',
        background: 'var(--bg)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          background: 'transparent',
        }}>
          <span style={{ color: 'var(--text-subtle)', fontSize: '14px', flex: 1 }}>
            Type a message...
          </span>
          <span style={{ color: 'var(--text-subtle)', fontSize: '16px', cursor: 'pointer' }}>
            mic
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Tasks
// ---------------------------------------------------------------------------

function WorkflowTasks({ workflowId: _workflowId }: { workflowId: string }) {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-section-title">Tasks</h1>

      {/* In Progress */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '8px' }}>In Progress</div>
        <TaskItem title="Deploy auth fix to staging" status="running" priority="high" />
      </div>

      {/* To Do */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '8px' }}>To Do</div>
        <TaskItem title="Run integration tests" status="todo" priority="normal" />
        <TaskItem title="Update changelog" status="todo" priority="low" />
      </div>

      {/* Done */}
      <div className="section-gap-lg">
        <div className="text-section-label" style={{ marginBottom: '8px' }}>Done</div>
        <TaskItem title="Fix JWT refresh logic" status="done" priority="normal" />
        <TaskItem title="Write unit tests" status="done" priority="normal" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Files
// ---------------------------------------------------------------------------

function WorkflowFiles({ workflowId: _workflowId }: { workflowId: string }) {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-section-title">Files</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>
        Files touched by this workflow.
      </p>

      <div className="section-gap-lg">
        <FileItem name="src/auth/jwt.ts" status="modified" additions={12} deletions={3} />
        <FileItem name="src/auth/refresh.ts" status="modified" additions={45} deletions={8} />
        <FileItem name="tests/auth.test.ts" status="added" additions={67} deletions={0} />
        <FileItem name="src/auth/legacy.ts" status="deleted" additions={0} deletions={42} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Settings
// ---------------------------------------------------------------------------

function WorkflowSettings({ workflowId: _workflowId }: { workflowId: string }) {
  return (
    <div className="content-padding" style={{ paddingTop: '20px' }}>
      <h1 className="text-section-title">Workflow Settings</h1>
      <p className="text-secondary" style={{ marginTop: '8px' }}>
        Configuration for this workflow.
      </p>

      <div className="section-gap-lg">
        <div className="ghost-border" style={{ padding: '12px 0' }}>
          <div className="text-body">Agent Model</div>
          <div className="text-meta" style={{ marginTop: '2px' }}>claude-sonnet-4-5 (default)</div>
        </div>
        <div className="ghost-border" style={{ padding: '12px 0' }}>
          <div className="text-body">Tool Permissions</div>
          <div className="text-meta" style={{ marginTop: '2px' }}>All tools enabled</div>
        </div>
        <div className="ghost-border" style={{ padding: '12px 0' }}>
          <div className="text-body">System Prompt</div>
          <div className="text-meta" style={{ marginTop: '2px' }}>Default</div>
        </div>
        <div className="ghost-border" style={{ padding: '12px 0' }}>
          <div className="text-body">Notifications</div>
          <div className="text-meta" style={{ marginTop: '2px' }}>All notifications enabled</div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="section-gap-lg" style={{ paddingBottom: '32px' }}>
        <div className="text-section-label" style={{ marginBottom: '10px', color: 'var(--destructive)' }}>
          Danger Zone
        </div>
        <button className="pill" style={{ borderColor: 'var(--destructive)', color: 'var(--destructive)' }}>
          Archive Workflow
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimelineEntry({ type, author, time, content, isActive }: {
  type: 'user' | 'agent' | 'tool' | 'status';
  author: string;
  time: string;
  content: string;
  isActive: boolean;
}) {
  const dotColor = isActive ? 'var(--accent)' : 'var(--text-subtle)';
  const isToolOutput = type === 'tool';

  return (
    <div style={{ position: 'relative', paddingBottom: '16px' }}>
      {/* Timeline dot */}
      <div style={{
        position: 'absolute',
        left: '-20px',
        top: '6px',
        width: '9px',
        height: '9px',
        borderRadius: '50%',
        background: dotColor,
        boxShadow: isActive ? `0 0 8px ${dotColor}` : 'none',
      }} />

      {/* Entry content */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          {type === 'agent' && (
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1.5px solid var(--text-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              OC
            </span>
          )}
          <span className="text-body" style={{ fontWeight: 500 }}>{author}</span>
          <span className="text-meta">{time}</span>
        </div>
        <div style={{
          padding: isToolOutput ? '8px 10px' : '0',
          background: isToolOutput ? 'rgba(255,255,255,0.02)' : 'transparent',
          borderRadius: isToolOutput ? '6px' : '0',
          fontFamily: isToolOutput ? 'var(--font-mono)' : 'inherit',
          fontSize: isToolOutput ? '12px' : '14px',
          color: isToolOutput ? 'var(--text-muted)' : 'var(--text)',
          whiteSpace: isToolOutput ? 'pre-wrap' : 'normal',
          lineHeight: 1.6,
        }}>
          {content}
        </div>
      </div>
    </div>
  );
}

function TaskItem({ title, status, priority }: {
  title: string;
  status: 'running' | 'todo' | 'done';
  priority: 'high' | 'normal' | 'low';
}) {
  const statusIcon: Record<string, string> = {
    running: '...', todo: '[ ]', done: '[x]',
  };
  const priorityColor: Record<string, string> = {
    high: 'var(--destructive)', normal: 'var(--text-muted)', low: 'var(--text-subtle)',
  };

  return (
    <div className="ghost-border" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 0',
    }}>
      <span className="text-meta" style={{ width: '24px' }}>{statusIcon[status]}</span>
      <span className="text-body" style={{
        flex: 1,
        textDecoration: status === 'done' ? 'line-through' : 'none',
        color: status === 'done' ? 'var(--text-subtle)' : 'var(--text)',
      }}>
        {title}
      </span>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: priorityColor[priority],
        flexShrink: 0,
      }} />
    </div>
  );
}

function FileItem({ name, status, additions, deletions }: {
  name: string;
  status: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
}) {
  const statusColor: Record<string, string> = {
    modified: 'var(--warning)', added: 'var(--success)', deleted: 'var(--destructive)',
  };

  return (
    <div className="ghost-border" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 0',
      cursor: 'pointer',
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: statusColor[status],
        flexShrink: 0,
      }} />
      <span className="text-meta" style={{ flex: 1, color: 'var(--text)' }}>{name}</span>
      {additions > 0 && <span className="text-meta" style={{ color: 'var(--success)' }}>+{additions}</span>}
      {deletions > 0 && <span className="text-meta" style={{ color: 'var(--destructive)' }}>-{deletions}</span>}
    </div>
  );
}
