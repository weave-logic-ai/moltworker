/**
 * Workflow screen -- displayed when a workflow is active.
 *
 * Content varies by active tab:
 *   Tab 0 (Chat):     Workflow conversation (timeline view)
 *   Tab 1 (Tasks):    Workflow-specific tasks
 *   Tab 2 (Files):    Workflow files and diffs
 *   Tab 3 (Settings): Workflow-scoped settings
 */

import {
  ConversationThread,
  TimelineEntry,
  UserMessage,
  AgentMessage,
  ToolOutput,
  ApprovalCard,
} from '../components/chat';
import type { ConversationEntry } from '../components/chat';

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
// Sample data for Chat tab
// ---------------------------------------------------------------------------

const SAMPLE_TIMESTAMP = Date.now() - 300_000; // 5 min ago

function buildSampleEntries(): ConversationEntry[] {
  return [
    {
      id: 'status-1',
      type: 'status',
      timestamp: SAMPLE_TIMESTAMP,
      content: (
        <TimelineEntry timestamp="9:12 PM" dotColor="success">
          <div style={{
            fontSize: '12px',
            color: 'var(--text-subtle)',
            fontStyle: 'italic',
          }}>
            Workflow started by Adrian
          </div>
        </TimelineEntry>
      ),
    },
    {
      id: 'user-1',
      type: 'user',
      timestamp: SAMPLE_TIMESTAMP + 10_000,
      content: (
        <TimelineEntry timestamp="9:12 PM" dotColor="default">
          <UserMessage
            content="Refactor the auth service to use JWT with refresh token rotation. Replace the current session-based auth."
            timestamp="9:12 PM"
          />
        </TimelineEntry>
      ),
    },
    {
      id: 'agent-1',
      type: 'agent',
      timestamp: SAMPLE_TIMESTAMP + 60_000,
      content: (
        <TimelineEntry timestamp="9:13 PM" dotColor="success">
          <AgentMessage
            agentName="coder-alpha"
            content="Understood. I'll structure this as a **3-phase migration**: (1) add JWT layer alongside sessions, (2) migrate endpoints, (3) deprecate sessions. Starting with the token service."
            timestamp="9:13 PM"
            status="idle"
            initials="C"
          />
        </TimelineEntry>
      ),
    },
    {
      id: 'tool-1',
      type: 'tool',
      timestamp: SAMPLE_TIMESTAMP + 120_000,
      content: (
        <TimelineEntry timestamp="9:14 PM" dotColor="default">
          <AgentMessage
            agentName="coder-alpha"
            content="Created token service with rotation logic."
            timestamp="9:14 PM"
            status="idle"
            initials="C"
          />
          <div style={{ paddingLeft: '30px' }}>
            <ToolOutput
              toolName="src/auth/token-service.ts"
              output={`export class TokenService {
  private readonly secret: string;
  private readonly accessTTL = '15m';
  private readonly refreshTTL = '7d';

  async generatePair(userId: string) {
    const access = await this.sign(
      { sub: userId, type: 'access' },
      this.accessTTL
    );
    const refresh = await this.sign(
      { sub: userId, type: 'refresh' },
      this.refreshTTL
    );
    return { access, refresh };
  }
}`}
            />
          </div>
        </TimelineEntry>
      ),
    },
    {
      id: 'agent-2',
      type: 'agent',
      timestamp: SAMPLE_TIMESTAMP + 180_000,
      content: (
        <TimelineEntry timestamp="9:18 PM" dotColor="default">
          <AgentMessage
            agentName="scout-recon"
            content="Found **14 endpoints** using session auth. 3 also pass tokens to external services and will need special handling."
            timestamp="9:18 PM"
            status="idle"
            initials="S"
          />
        </TimelineEntry>
      ),
    },
    {
      id: 'approval-1',
      type: 'approval',
      timestamp: SAMPLE_TIMESTAMP + 240_000,
      content: (
        <TimelineEntry timestamp="9:20 PM" dotColor="accent" isActive>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}>
              R
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
              reviewer-sec
            </span>
          </div>
          <ApprovalCard
            question="Ready to apply changes to 14 endpoints. This will modify auth handling across the entire API surface. Proceed?"
            showEdit
          />
        </TimelineEntry>
      ),
    },
    {
      id: 'thinking-1',
      type: 'agent',
      timestamp: SAMPLE_TIMESTAMP + 300_000,
      content: (
        <TimelineEntry timestamp="now" dotColor="accent" isActive isLast>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}>
              W
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
              worker-3
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
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
        </TimelineEntry>
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Tab 0: Chat (Workflow Conversation)
// ---------------------------------------------------------------------------

function WorkflowChat({ workflowId }: { workflowId: string }) {
  const entries = buildSampleEntries();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Workflow header */}
      <div className="content-padding" style={{ paddingTop: '12px', paddingBottom: '16px', flexShrink: 0 }}>
        <h1 className="text-section-title">Workflow {workflowId}</h1>
        <div className="text-meta" style={{ marginTop: '4px' }}>
          Active conversation
        </div>
      </div>

      {/* Conversation thread */}
      <ConversationThread entries={entries} />

      {/* Input area */}
      <div style={{
        position: 'sticky',
        bottom: '68px',
        padding: '12px 20px',
        background: 'var(--bg)',
        flexShrink: 0,
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
