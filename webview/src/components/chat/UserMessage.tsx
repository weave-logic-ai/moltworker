/**
 * UserMessage -- right-aligned user message bubble.
 *
 * Design:
 * - Right-aligned with subtle background tint
 * - Timestamp underneath
 * - Text content, no avatar
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserMessageProps {
  content: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserMessage({ content, timestamp }: UserMessageProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '4px 20px 12px',
      }}
    >
      <div style={{ maxWidth: '85%' }}>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '12px 12px 4px 12px',
            background: 'rgba(255, 255, 255, 0.06)',
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'var(--text)',
          }}
        >
          {content}
        </div>
        <div
          className="text-meta"
          style={{
            textAlign: 'right',
            marginTop: '4px',
            fontSize: '11px',
            color: 'var(--text-subtle)',
          }}
        >
          {timestamp}
        </div>
      </div>
    </div>
  );
}
