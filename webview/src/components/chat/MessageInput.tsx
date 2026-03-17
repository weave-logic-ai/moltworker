/**
 * MessageInput -- text input with send button for the chat interface.
 *
 * Features:
 * - Enter to send, Shift+Enter for newline
 * - Disabled while agent is thinking
 * - Dark theme, ghost border input, accent send button
 * - Auto-resizing textarea
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Message Assistant (Enter to send)',
}: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      padding: '10px 14px',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius)',
      background: 'transparent',
      opacity: disabled ? 0.6 : 1,
      transition: 'opacity 150ms ease, border-color 150ms ease',
    }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text)',
          fontSize: '14px',
          lineHeight: 1.5,
          fontFamily: 'var(--font-sans)',
          resize: 'none',
          minHeight: '21px',
          maxHeight: '120px',
          padding: 0,
        }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: canSend ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
          color: canSend ? '#fff' : 'var(--text-subtle)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: canSend ? 'pointer' : 'default',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 150ms ease, color 150ms ease',
        }}
      >
        {'\u2191'}
      </button>
    </div>
  );
}
