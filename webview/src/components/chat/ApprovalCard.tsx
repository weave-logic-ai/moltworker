/**
 * ApprovalCard -- approval request card for the timeline.
 *
 * Design:
 * - Question/description text
 * - Approve (green) and Reject (red) action buttons
 * - Optional "Edit" button
 * - Status indicator (pending/approved/rejected)
 */

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ApprovalCardProps {
  question: string;
  description?: string;
  status?: ApprovalStatus;
  showEdit?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string }> = {
  pending: {
    label: 'Pending',
    color: 'var(--warning)',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
  approved: {
    label: 'Approved',
    color: 'var(--success)',
    bg: 'rgba(78, 204, 163, 0.1)',
  },
  rejected: {
    label: 'Rejected',
    color: 'var(--destructive)',
    bg: 'rgba(239, 68, 68, 0.1)',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApprovalCard({
  question,
  description,
  status: initialStatus = 'pending',
  showEdit = false,
  onApprove,
  onReject,
  onEdit,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<ApprovalStatus>(initialStatus);
  const isPending = status === 'pending';
  const statusConfig = STATUS_CONFIG[status];

  const handleApprove = () => {
    setStatus('approved');
    onApprove?.();
  };

  const handleReject = () => {
    setStatus('rejected');
    onReject?.();
  };

  return (
    <div style={{ marginTop: '4px' }}>
      {/* Question text */}
      <div
        style={{
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text)',
          marginBottom: description ? '4px' : '10px',
        }}
      >
        {question}
      </div>

      {/* Optional description */}
      {description && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginBottom: '10px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}

      {/* Status badge (when not pending) */}
      {!isPending && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: statusConfig.bg,
            fontSize: '12px',
            fontWeight: 500,
            color: statusConfig.color,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: statusConfig.color,
            }}
          />
          {statusConfig.label}
        </div>
      )}

      {/* Action buttons (only when pending) */}
      {isPending && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleApprove}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'rgba(78, 204, 163, 0.15)',
              color: 'var(--success)',
              border: '1px solid rgba(78, 204, 163, 0.2)',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'rgba(233, 69, 96, 0.1)',
              color: 'var(--accent)',
              border: '1px solid rgba(233, 69, 96, 0.15)',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            Reject
          </button>
          {showEdit && (
            <button
              onClick={onEdit}
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-muted)',
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
