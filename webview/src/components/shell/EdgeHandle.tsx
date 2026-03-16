/**
 * EdgeHandle -- 2px vertical line with a 4x32px notch for drawer triggers.
 *
 * Positioned on the left or right edge of the viewport.
 * Touch/click toggles the corresponding drawer.
 * Visual feedback on hover/press via opacity and width transitions.
 */

import { useState } from 'react';
import { toggleLeftDrawer, toggleRightDrawer } from '@/store/app-state';

interface EdgeHandleProps {
  side: 'left' | 'right';
}

export function EdgeHandle({ side }: EdgeHandleProps) {
  const isLeft = side === 'left';
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    if (isLeft) {
      toggleLeftDrawer();
    } else {
      toggleRightDrawer();
    }
  };

  const handlePointerDown = () => setIsPressed(true);
  const handlePointerUp = () => setIsPressed(false);
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };

  // Visual feedback: notch gets slightly wider and brighter on hover/press
  const notchOpacity = isPressed ? 0.35 : isHovered ? 0.25 : 0.12;
  const notchWidth = isPressed ? 6 : isHovered ? 5 : 4;

  return (
    <div
      onClick={handleToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'fixed',
        top: 0,
        [side]: '50%',
        transform: isLeft
          ? 'translateX(calc(-214px))'
          : 'translateX(calc(214px - 2px))',
        width: '12px',
        height: '100dvh',
        background: 'transparent',
        zIndex: 10,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Thin line */}
      <div style={{
        position: 'absolute',
        [isLeft ? 'left' : 'right']: '5px',
        top: 0,
        width: '2px',
        height: '100%',
        background: `rgba(255, 255, 255, ${isHovered ? '0.08' : '0.04'})`,
        transition: 'background 200ms ease',
      }} />

      {/* Notch */}
      <div style={{
        width: `${notchWidth}px`,
        height: '32px',
        borderRadius: '2px',
        background: `rgba(255, 255, 255, ${notchOpacity})`,
        transition: 'width 200ms ease, background 200ms ease',
        position: 'relative',
        [isLeft ? 'marginLeft' : 'marginRight']: '-1px',
      }} />
    </div>
  );
}
