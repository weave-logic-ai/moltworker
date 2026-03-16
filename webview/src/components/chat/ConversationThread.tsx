/**
 * ConversationThread -- container for the workflow conversation.
 *
 * Renders a vertical scrollable list of messages with:
 * - Auto-scroll to bottom on new message
 * - "New message" pill indicator when scrolled up
 * - Date separator grouping
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationEntry {
  id: string;
  type: 'user' | 'agent' | 'tool' | 'approval' | 'status';
  timestamp: number;
  content: React.ReactNode;
}

interface ConversationThreadProps {
  entries: ConversationEntry[];
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConversationThread({ entries, children }: ConversationThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevLengthRef = useRef(entries.length);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessage(false);
  }, []);

  // Detect scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 80;
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setIsAtBottom(atBottom);
      if (atBottom) setShowNewMessage(false);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll or show pill on new entries
  useEffect(() => {
    if (entries.length > prevLengthRef.current) {
      if (isAtBottom) {
        scrollToBottom();
      } else {
        setShowNewMessage(true);
      }
    }
    prevLengthRef.current = entries.length;
  }, [entries.length, isAtBottom, scrollToBottom]);

  // Group entries by date
  const groupedEntries: Array<{ separator: string | null; entry: ConversationEntry }> = [];
  let lastTimestamp: number | null = null;

  for (const entry of entries) {
    const needsSeparator =
      lastTimestamp === null || !isSameDay(lastTimestamp, entry.timestamp);

    groupedEntries.push({
      separator: needsSeparator ? formatDateSeparator(entry.timestamp) : null,
      entry,
    });

    lastTimestamp = entry.timestamp;
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ padding: '12px 0 120px' }}>
        {groupedEntries.map(({ separator, entry }) => (
          <div key={entry.id}>
            {separator && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px 0 8px',
                }}
              >
                <span
                  className="text-meta"
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-subtle)',
                    letterSpacing: '0.5px',
                  }}
                >
                  {separator}
                </span>
              </div>
            )}
            {entry.content}
          </div>
        ))}
        {children}
        <div ref={bottomRef} />
      </div>

      {/* New message pill */}
      {showNewMessage && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'sticky',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          New message
        </button>
      )}
    </div>
  );
}
