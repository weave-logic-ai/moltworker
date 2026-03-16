/**
 * EdgeHandle — 2px vertical line with a 4x32px notch for drawer triggers.
 * Positioned on the left or right edge of the viewport.
 * Visually indicates that a drawer can be pulled open.
 */

import { toggleLeftDrawer, toggleRightDrawer } from '@/store/app-state';

interface EdgeHandleProps {
  side: 'left' | 'right';
}

export function EdgeHandle({ side }: EdgeHandleProps) {
  const isLeft = side === 'left';

  return (
    <div
      onClick={isLeft ? toggleLeftDrawer : toggleRightDrawer}
      style={{
        position: 'fixed',
        top: 0,
        [side]: '50%',
        transform: isLeft
          ? 'translateX(calc(-214px))'  /* half of 428px max-width */
          : 'translateX(calc(214px - 2px))',
        width: '2px',
        height: '100dvh',
        background: 'rgba(255, 255, 255, 0.04)',
        zIndex: 10,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Notch */}
      <div style={{
        width: '4px',
        height: '32px',
        borderRadius: '2px',
        background: 'rgba(255, 255, 255, 0.12)',
        [isLeft ? 'marginLeft' : 'marginRight']: '-1px',
      }} />
    </div>
  );
}
