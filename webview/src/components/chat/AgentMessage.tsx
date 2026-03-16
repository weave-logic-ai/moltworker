/**
 * AgentMessage -- left-aligned agent message with avatar.
 *
 * Design:
 * - Left-aligned with 20px circular avatar (initials "OC")
 * - Agent name label above content
 * - Avatar border color indicates status:
 *     accent = thinking, success = idle, warning = executing
 * - Text content with markdown-light rendering (bold, code, links)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStatus = 'thinking' | 'idle' | 'executing';

interface AgentMessageProps {
  agentName: string;
  content: string;
  timestamp: string;
  status?: AgentStatus;
  initials?: string;
}

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<AgentStatus, string> = {
  thinking: 'var(--accent)',
  idle: 'var(--success)',
  executing: 'var(--warning)',
};

// ---------------------------------------------------------------------------
// Markdown-light renderer
// ---------------------------------------------------------------------------

/**
 * Minimal markdown renderer supporting:
 * - **bold** text
 * - `inline code`
 * - [link text](url)
 *
 * Returns an array of React elements.
 */
function renderMarkdownLight(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Combined regex for bold, code, and links
  const regex = /\*\*(.*?)\*\*|`(.*?)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // **bold**
      parts.push(
        <strong key={key++} style={{ fontWeight: 600 }}>
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      // `code`
      parts.push(
        <code
          key={key++}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            padding: '1px 5px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text)',
          }}
        >
          {match[2]}
        </code>,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // [text](url)
      parts.push(
        <a
          key={key++}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--info)',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(91, 141, 239, 0.3)',
            textUnderlineOffset: '2px',
          }}
        >
          {match[3]}
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentMessage({
  agentName,
  content,
  timestamp,
  status = 'idle',
  initials = 'OC',
}: AgentMessageProps) {
  const borderColor = STATUS_COLORS[status];

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '4px 20px 12px',
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: `2px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        {initials}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-muted)',
            }}
          >
            {agentName}
          </span>
          <span
            className="text-meta"
            style={{ fontSize: '11px', color: 'var(--text-subtle)' }}
          >
            {timestamp}
          </span>
        </div>
        <div
          style={{
            fontSize: '14px',
            lineHeight: 1.65,
            color: 'rgba(250, 250, 250, 0.85)',
          }}
        >
          {renderMarkdownLight(content)}
        </div>
      </div>
    </div>
  );
}
