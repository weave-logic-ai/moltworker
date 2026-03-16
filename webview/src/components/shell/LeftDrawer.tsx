/**
 * LeftDrawer — Client > Project > Workflow tree selector.
 *
 * Structure-only scaffold. Slides in from the left edge.
 * Contains a search bar and an expandable client/project/workflow hierarchy.
 */

import { closeAllOverlays } from '@/store/app-state';

export function LeftDrawer() {
  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '428px',
      height: '100dvh',
      background: 'var(--bg-elevated)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="text-section-title">Context</span>
        <button
          onClick={closeAllOverlays}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '18px',
            cursor: 'pointer',
          }}
          aria-label="Close drawer"
        >
          x
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 20px' }}>
        <input
          type="text"
          placeholder="Search clients, projects, workflows..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius)',
            color: 'var(--text)',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Tree content (scaffold) */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
        {/* Client section */}
        <div style={{ marginBottom: '16px' }}>
          <div className="text-section-label" style={{ marginBottom: '8px' }}>Clients</div>

          {/* Example client */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 0',
              cursor: 'pointer',
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                W
              </span>
              <span className="text-body">WeaveLogic</span>
              <span className="text-meta" style={{ marginLeft: 'auto' }}>Pro</span>
            </div>

            {/* Project under client */}
            <div style={{ paddingLeft: '32px' }}>
              <div style={{
                padding: '6px 0',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}>
                <span className="text-body">Moltworker</span>
                <span className="text-secondary" style={{ display: 'block', marginTop: '2px' }}>
                  3 workflows
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
          <button className="pill" style={{ justifyContent: 'center' }}>+ New Client</button>
          <button className="pill" style={{ justifyContent: 'center' }}>+ New Project</button>
          <button className="pill" style={{ justifyContent: 'center' }}>+ New Workflow</button>
        </div>
      </div>
    </aside>
  );
}
