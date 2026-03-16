/**
 * TimelineEntry -- wrapper for a single timeline entry.
 *
 * Design (from design-system.md):
 * - Timestamp on left margin (11px mono, --text-subtle)
 * - 9px dot on the timeline (color-coded by type)
 * - Thin 1px connecting line between entries
 * - Active entry has accent dot with glow
 * - Content area to the right
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimelineDotColor = 'default' | 'accent' | 'success' | 'warning' | 'destructive' | 'info';

interface TimelineEntryProps {
  timestamp: string;
  dotColor?: TimelineDotColor;
  isActive?: boolean;
  isLast?: boolean;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Dot color mapping
// ---------------------------------------------------------------------------

const DOT_COLORS: Record<TimelineDotColor, string> = {
  default: 'var(--text-subtle)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  info: 'var(--info)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimelineEntry({
  timestamp,
  dotColor = 'default',
  isActive = false,
  isLast = false,
  children,
}: TimelineEntryProps) {
  const resolvedDotColor = isActive ? 'var(--accent)' : DOT_COLORS[dotColor];
  const glowShadow = isActive
    ? `0 0 10px rgba(233, 69, 96, 0.5)`
    : 'none';

  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: '40px',
        paddingBottom: isLast ? '8px' : '28px',
        marginLeft: '20px',
      }}
    >
      {/* Vertical connecting line */}
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            left: '7px',
            top: '0',
            bottom: '0',
            width: '1px',
            background: 'var(--border)',
          }}
        />
      )}
      {/* If last entry, show line only to the dot */}
      {isLast && (
        <div
          style={{
            position: 'absolute',
            left: '7px',
            top: '0',
            height: '10px',
            width: '1px',
            background: 'var(--border)',
          }}
        />
      )}

      {/* Timeline dot */}
      <div
        style={{
          position: 'absolute',
          left: '3px',
          top: '6px',
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          background: resolvedDotColor,
          boxShadow: glowShadow,
          zIndex: 1,
        }}
      />

      {/* Timestamp */}
      <div
        style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-subtle)',
          letterSpacing: '0.3px',
          marginBottom: '4px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {timestamp}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
