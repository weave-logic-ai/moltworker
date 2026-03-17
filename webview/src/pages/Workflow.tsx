/**
 * Workflow screen -- displayed when a workflow is active.
 *
 * Content varies by active tab:
 *   Tab 0 (Chat):     Live conversation via chat-store + gateway
 *   Tab 1 (Tasks):    Workflow-specific tasks
 *   Tab 2 (Files):    Workflow files and diffs
 *   Tab 3 (Settings): Workflow-scoped settings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ConversationThread,
  TimelineEntry,
  UserMessage,
  AgentMessage,
  MessageInput,
} from '../components/chat';
import type { ConversationEntry } from '../components/chat';
import {
  getChatState,
  subscribeChatState,
  addMessage,
  setAgentThinking,
  setStreamingContent,
  finalizeStream,
  setChatError,
  getMessagesForApi,
  type ChatState,
} from '@/store/chat-store';
import { sendChatMessage, type ChatCompletionChunk } from '@/lib/gateway';

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
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Tab 0: Chat (Live Conversation)
// ---------------------------------------------------------------------------

function WorkflowChat({ workflowId }: { workflowId: string }) {
  const [chatState, setChatState] = useState<ChatState>(getChatState());
  const abortRef = useRef<AbortController | null>(null);
  const sendStartRef = useRef<number>(0);

  useEffect(() => {
    return subscribeChatState((s) => setChatState(s));
  }, []);

  // Build conversation entries from live data
  const entries: ConversationEntry[] = chatState.messages.map((msg) => {
    const time = formatTime(msg.timestamp);
    if (msg.role === 'user') {
      return {
        id: msg.id,
        type: 'user' as const,
        timestamp: msg.timestamp,
        content: (
          <TimelineEntry timestamp={time} dotColor="default">
            <UserMessage content={msg.content} timestamp={time} />
          </TimelineEntry>
        ),
      };
    }
    // assistant
    const latencyLabel = msg.latencyMs
      ? ` (${(msg.latencyMs / 1000).toFixed(1)}s)`
      : '';
    return {
      id: msg.id,
      type: 'agent' as const,
      timestamp: msg.timestamp,
      content: (
        <TimelineEntry timestamp={time} dotColor="success">
          <AgentMessage
            agentName={msg.model || 'OpenClaw'}
            content={msg.content}
            timestamp={`${time}${latencyLabel}`}
            status="idle"
            initials="OC"
          />
        </TimelineEntry>
      ),
    };
  });

  // If agent is streaming, add a streaming entry
  if (chatState.streamingContent) {
    const streamEntry: ConversationEntry = {
      id: 'streaming',
      type: 'agent',
      timestamp: Date.now(),
      content: (
        <TimelineEntry timestamp="now" dotColor="accent" isActive>
          <AgentMessage
            agentName={chatState.streamingModel || 'OpenClaw'}
            content={chatState.streamingContent}
            timestamp="streaming..."
            status="executing"
            initials="OC"
          />
        </TimelineEntry>
      ),
    };
    entries.push(streamEntry);
  }

  // If agent is thinking (no content yet), show thinking dots
  if (chatState.isAgentThinking && !chatState.streamingContent) {
    const thinkingEntry: ConversationEntry = {
      id: 'thinking',
      type: 'agent',
      timestamp: Date.now(),
      content: (
        <TimelineEntry timestamp="now" dotColor="accent" isActive isLast>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 20px 12px',
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
              OC
            </span>
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
          </div>
        </TimelineEntry>
      ),
    };
    entries.push(thinkingEntry);
  }

  // Handle user sending a message
  const handleSend = useCallback((text: string) => {
    // Add user message to store
    addMessage({
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });

    setAgentThinking(true);
    sendStartRef.current = Date.now();

    // Build messages array for API
    const apiMessages = getMessagesForApi();

    // Send to gateway chat completions
    let accumulated = '';
    abortRef.current = sendChatMessage(
      apiMessages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      {
        onChunk: (chunk: ChatCompletionChunk) => {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            setStreamingContent(accumulated, chunk.model);
          }
        },
        onDone: (_fullContent: string, model: string) => {
          const latencyMs = Date.now() - sendStartRef.current;
          finalizeStream(model, latencyMs);
          abortRef.current = null;
        },
        onError: (err: Error) => {
          setChatError(err.message);
          abortRef.current = null;
        },
      },
    );
  }, []);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Workflow header */}
      <div className="content-padding" style={{ paddingTop: '12px', paddingBottom: '16px', flexShrink: 0 }}>
        <h1 className="text-section-title">Workflow {workflowId}</h1>
        <div className="text-meta" style={{ marginTop: '4px' }}>
          {chatState.messages.length > 0
            ? `${chatState.messages.length} messages`
            : 'Start a conversation'}
        </div>
      </div>

      {/* Conversation thread */}
      {entries.length > 0 ? (
        <ConversationThread entries={entries} />
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          padding: '40px 20px',
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
          }}>
            OC
          </div>
          <p className="text-secondary" style={{ textAlign: 'center' }}>
            Send a message to start the conversation
          </p>
        </div>
      )}

      {/* Error banner */}
      {chatState.lastError && (
        <div style={{
          padding: '8px 20px',
          background: 'rgba(239,68,68,0.1)',
          borderTop: '1px solid var(--destructive)',
          fontSize: '12px',
          color: 'var(--destructive)',
        }}>
          {chatState.lastError}
        </div>
      )}

      {/* Input area */}
      <div style={{
        position: 'sticky',
        bottom: '68px',
        padding: '12px 20px',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <MessageInput
          onSend={handleSend}
          disabled={chatState.isAgentThinking}
        />
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
