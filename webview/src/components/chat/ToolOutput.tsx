/**
 * ToolOutput -- collapsible tool output display.
 *
 * Design:
 * - Header with tool name + expand/collapse chevron
 * - Collapsed by default
 * - Monospace code block when expanded
 * - Subtle background tint (--code-bg or rgba(255,255,255,0.03))
 */

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolOutputProps {
  toolName: string;
  output: string;
  defaultExpanded?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ToolOutput({
  toolName,
  output,
  defaultExpanded = false,
}: ToolOutputProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          padding: '6px 0',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            transition: 'transform 200ms ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}
        >
          &#8250;
        </span>
        {toolName}
      </button>

      {/* Code block (when expanded) */}
      {expanded && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: 1.65,
            color: 'rgba(250, 250, 250, 0.7)',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            padding: '12px 14px',
            overflowX: 'auto',
            marginTop: '4px',
            whiteSpace: 'pre',
          }}
        >
          {output}
        </div>
      )}
    </div>
  );
}
