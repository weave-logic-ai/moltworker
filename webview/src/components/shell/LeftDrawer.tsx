/**
 * LeftDrawer -- Client > Project > Workflow tree selector.
 *
 * Full implementation with:
 * - Search/filter bar at top
 * - Client list (collapsible accordion sections)
 * - Project list (expandable) under each client
 * - Workflow list with status indicators under each project
 * - Active path highlighted with accent color
 * - Action buttons: New Client, New Project, New Workflow
 * - navigate() on workflow select; home on client/project select
 */

import { useState, useMemo } from 'react';
import { closeAllOverlays, enterWorkflow, setActiveClient, setActiveProject } from '@/store/app-state';
import { navigate, workflowPath } from '@/lib/router';
import type { Client, Project, Workflow } from '@/types';

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'WeaveLogic',
    plan: 'Enterprise',
    seats: 5,
    projects: [
      {
        id: 'proj-1',
        clientId: 'client-1',
        name: 'MentraOS Core',
        description: 'Core OS services',
        workflows: [
          { id: 'wf-1', projectId: 'proj-1', name: 'Auth Service Refactor', status: 'active', messageCount: 42, lastActivity: '2m ago' },
          { id: 'wf-2', projectId: 'proj-1', name: 'Container Deploy Pipeline', status: 'active', messageCount: 28, lastActivity: '8m ago' },
          { id: 'wf-3', projectId: 'proj-1', name: 'API Gateway Rate Limiting', status: 'paused', messageCount: 15, lastActivity: '22m ago' },
        ],
      },
      {
        id: 'proj-2',
        clientId: 'client-1',
        name: 'Clawdflare Infra',
        description: 'Infrastructure management',
        workflows: [
          { id: 'wf-4', projectId: 'proj-2', name: 'Edge CDN Configuration', status: 'active', messageCount: 67, lastActivity: '1h ago' },
          { id: 'wf-5', projectId: 'proj-2', name: 'DNS Migration', status: 'completed', messageCount: 89, lastActivity: '2d ago' },
        ],
      },
    ],
  },
  {
    id: 'client-2',
    name: 'XR Lab',
    plan: 'Pro',
    seats: 3,
    projects: [
      {
        id: 'proj-3',
        clientId: 'client-2',
        name: 'Home Automation',
        description: 'Smart home integration',
        workflows: [],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const BADGE_STYLES: Record<string, { color: string; background: string }> = {
  Enterprise: { color: '#a78bfa', background: 'rgba(139, 92, 246, 0.12)' },
  Pro: { color: 'var(--accent)', background: 'rgba(233, 69, 96, 0.1)' },
  Starter: { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' },
};

const WORKFLOW_DOT_COLOR: Record<string, string> = {
  active: 'var(--success)',
  paused: 'var(--warning)',
  completed: 'var(--text-subtle)',
  error: 'var(--destructive)',
};

function WorkflowRow({
  workflow,
  isHighlighted,
  onSelect,
}: {
  workflow: Workflow;
  isHighlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 20px 8px 62px',
        cursor: 'pointer',
        transition: 'background 150ms ease',
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: WORKFLOW_DOT_COLOR[workflow.status],
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: '13px',
        color: isHighlighted ? 'var(--accent)' : 'rgba(250,250,250,0.8)',
        flex: 1,
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {workflow.name}
      </span>
      <span style={{
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-subtle)',
        flexShrink: 0,
      }}>
        {workflow.lastActivity}
      </span>
    </div>
  );
}

function ProjectSection({
  project,
  isExpanded,
  onToggle,
  activeWorkflowId,
  onWorkflowSelect,
  onProjectSelect,
}: {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
  activeWorkflowId: string | null;
  onWorkflowSelect: (wf: Workflow) => void;
  onProjectSelect: () => void;
}) {
  const activeCount = project.workflows.filter((w) => w.status === 'active').length;

  return (
    <>
      <div
        onClick={() => {
          onToggle();
          onProjectSelect();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px 10px 44px',
          cursor: 'pointer',
          transition: 'background 150ms ease',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text)' }}>{project.name}</span>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-subtle)',
        }}>
          {activeCount > 0 ? `${activeCount} active` : `${project.workflows.length} wf`}
        </span>
      </div>
      {isExpanded && project.workflows.map((wf) => (
        <WorkflowRow
          key={wf.id}
          workflow={wf}
          isHighlighted={activeWorkflowId === wf.id}
          onSelect={() => onWorkflowSelect(wf)}
        />
      ))}
      {isExpanded && (
        <button style={{
          display: 'block',
          padding: '10px 20px 10px 62px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          width: '100%',
          transition: 'color 150ms ease',
        }}>
          <span style={{ color: 'var(--text-subtle)', marginRight: '4px' }}>+</span> New workflow
        </button>
      )}
    </>
  );
}

function ClientSection({
  client,
  isExpanded,
  onToggle,
  expandedProjects,
  onToggleProject,
  activeWorkflowId,
  onWorkflowSelect,
  onClientSelect,
  onProjectSelect,
}: {
  client: Client;
  isExpanded: boolean;
  onToggle: () => void;
  expandedProjects: Set<string>;
  onToggleProject: (projectId: string) => void;
  activeWorkflowId: string | null;
  onWorkflowSelect: (wf: Workflow) => void;
  onClientSelect: () => void;
  onProjectSelect: (project: Project) => void;
}) {
  const badge = BADGE_STYLES[client.plan] || BADGE_STYLES['Starter'];

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={() => {
          onToggle();
          onClientSelect();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          cursor: 'pointer',
          transition: 'background 150ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{client.name}</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: '999px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
            color: badge.color,
            background: badge.background,
          }}>
            {client.plan}
          </span>
        </div>
        <span style={{
          color: 'var(--text-subtle)',
          fontSize: '14px',
          transition: 'transform 200ms ease',
          transform: isExpanded ? 'rotate(90deg)' : 'none',
        }}>
          {'\u203A'}
        </span>
      </div>

      {isExpanded && client.projects.map((project) => (
        <ProjectSection
          key={project.id}
          project={project}
          isExpanded={expandedProjects.has(project.id)}
          onToggle={() => onToggleProject(project.id)}
          activeWorkflowId={activeWorkflowId}
          onWorkflowSelect={onWorkflowSelect}
          onProjectSelect={() => onProjectSelect(project)}
        />
      ))}

      {isExpanded && (
        <button style={{
          display: 'block',
          padding: '10px 20px 10px 44px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          width: '100%',
          transition: 'color 150ms ease',
        }}>
          <span style={{ color: 'var(--text-subtle)', marginRight: '4px' }}>+</span> New project
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LeftDrawer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set(['client-1']));
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['proj-1']));
  const [activeWorkflowId] = useState<string | null>('wf-1');

  const toggleClient = (id: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleWorkflowSelect = (wf: Workflow) => {
    enterWorkflow(wf);
    navigate(workflowPath(wf.id));
    closeAllOverlays();
  };

  const handleClientSelect = (client: Client) => {
    setActiveClient(client);
  };

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project);
  };

  // Filter clients/projects/workflows by search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return SAMPLE_CLIENTS;
    const q = searchQuery.toLowerCase();
    return SAMPLE_CLIENTS.map((client) => {
      const matchClient = client.name.toLowerCase().includes(q);
      const filteredProjects = client.projects.map((project) => {
        const matchProject = project.name.toLowerCase().includes(q);
        const filteredWorkflows = project.workflows.filter(
          (wf) => wf.name.toLowerCase().includes(q),
        );
        if (matchProject || filteredWorkflows.length > 0) {
          return { ...project, workflows: matchProject ? project.workflows : filteredWorkflows };
        }
        return null;
      }).filter(Boolean) as Project[];

      if (matchClient || filteredProjects.length > 0) {
        return { ...client, projects: matchClient ? client.projects : filteredProjects };
      }
      return null;
    }).filter(Boolean) as Client[];
  }, [searchQuery]);

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80%',
      maxWidth: '342px',
      height: '100dvh',
      background: 'var(--bg-elevated)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'slideInLeft 200ms ease',
    }}>
      {/* Search */}
      <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search clients, projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '14px',
            color: 'var(--text)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            transition: 'border-color 200ms ease',
          }}
        />
      </div>

      {/* Tree content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 0 20px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Section label */}
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          textTransform: 'uppercase' as const,
          letterSpacing: '1.2px',
          color: 'var(--text-subtle)',
          padding: '20px 20px 8px',
        }}>
          Clients
        </div>

        {filteredClients.map((client) => (
          <ClientSection
            key={client.id}
            client={client}
            isExpanded={expandedClients.has(client.id)}
            onToggle={() => toggleClient(client.id)}
            expandedProjects={expandedProjects}
            onToggleProject={toggleProject}
            activeWorkflowId={activeWorkflowId}
            onWorkflowSelect={handleWorkflowSelect}
            onClientSelect={() => handleClientSelect(client)}
            onProjectSelect={(p) => handleProjectSelect(p)}
          />
        ))}

        {/* New Client button */}
        <button style={{
          display: 'block',
          padding: '10px 20px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          width: '100%',
          transition: 'color 150ms ease',
        }}>
          <span style={{ color: 'var(--text-subtle)', marginRight: '4px' }}>+</span> New client
        </button>

        {/* Recent section */}
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          textTransform: 'uppercase' as const,
          letterSpacing: '1.2px',
          color: 'var(--text-subtle)',
          padding: '28px 20px 8px',
        }}>
          Recent
        </div>

        {SAMPLE_CLIENTS.flatMap((c) => c.projects.flatMap((p) => p.workflows))
          .slice(0, 3)
          .map((wf) => (
            <WorkflowRow
              key={`recent-${wf.id}`}
              workflow={wf}
              isHighlighted={false}
              onSelect={() => handleWorkflowSelect(wf)}
            />
          ))}
      </div>
    </aside>
  );
}
