/**
 * RightDrawer -- Mentra Live sensor debug drawer.
 *
 * 8 collapsible sections for each sensor type:
 * Microphone, Camera, Button, Speaker, Battery, WiFi, Location, IMU.
 *
 * Each section displays label:value monospace pairs with placeholder data.
 * Slide-in animation from right.
 */

import { useState } from 'react';
import { closeAllOverlays } from '@/store/app-state';
import { renderSensorContent } from './SensorPanels';
import type { SensorContent } from './SensorPanels';

// ---------------------------------------------------------------------------
// Sensor Section Definition & Sample Data
// ---------------------------------------------------------------------------

interface SensorSection {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'idle';
  content: SensorContent;
}

const SENSOR_SECTIONS: SensorSection[] = [
  {
    id: 'mic',
    name: 'Microphone',
    status: 'connected',
    content: {
      type: 'microphone',
      transcription: 'Show me the deploy status for the auth service...',
      audioLevel: 65,
      vadStatus: 'Active',
      language: 'en-US',
    },
  },
  {
    id: 'camera',
    name: 'Camera',
    status: 'idle',
    content: {
      type: 'camera',
      lastPhoto: null,
      resolution: '1280x720',
      streamStatus: 'Off',
    },
  },
  {
    id: 'button',
    name: 'Button',
    status: 'connected',
    content: {
      type: 'button',
      events: [
        { time: '21:20:14', action: 'single press' },
        { time: '21:18:45', action: 'long press' },
        { time: '21:15:32', action: 'single press' },
        { time: '21:12:01', action: 'double press' },
        { time: '21:08:22', action: 'single press' },
      ],
    },
  },
  {
    id: 'speaker',
    name: 'Speaker',
    status: 'connected',
    content: {
      type: 'speaker',
      ttsQueue: 2,
      playbackStatus: 'Playing',
      volume: 72,
    },
  },
  {
    id: 'battery',
    name: 'Battery',
    status: 'connected',
    content: {
      type: 'battery',
      glassesPercent: 78,
      casePercent: 94,
      charging: false,
    },
  },
  {
    id: 'wifi',
    name: 'WiFi',
    status: 'connected',
    content: {
      type: 'wifi',
      ssid: 'WeaveLogic-5G',
      signalBars: 3,
      connectionStatus: 'Connected',
    },
  },
  {
    id: 'location',
    name: 'Location',
    status: 'idle',
    content: {
      type: 'location',
      lat: '37.7749',
      lng: '-122.4194',
      accuracy: '12m',
      lastUpdate: '30s ago',
    },
  },
  {
    id: 'imu',
    name: 'IMU',
    status: 'connected',
    content: {
      type: 'imu',
      accelX: '0.02',
      accelY: '-0.98',
      accelZ: '0.11',
    },
  },
];

// ---------------------------------------------------------------------------
// Status dot color mapping
// ---------------------------------------------------------------------------

const STATUS_DOT_COLOR: Record<string, string> = {
  connected: 'var(--success)',
  disconnected: 'var(--destructive)',
  idle: 'var(--text-subtle)',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RightDrawer() {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['mic', 'battery', 'wifi']),
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(calc(-50% + 20%))',
      width: '80%',
      maxWidth: '342px',
      height: '100dvh',
      background: 'var(--bg-elevated)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'slideInRight 200ms ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 12px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px' }}>Debug</span>
        <button
          onClick={closeAllOverlays}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-subtle)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Close drawer"
        >
          {'\u00D7'}
        </button>
      </div>

      {/* Sensor sections */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 0 20px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {SENSOR_SECTIONS.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <div key={section.id} style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Section header */}
              <div
                onClick={() => toggleSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: STATUS_DOT_COLOR[section.status],
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.8px',
                    color: 'var(--text-muted)',
                  }}>
                    {section.name}
                  </span>
                </div>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-subtle)',
                  transition: 'transform 200ms ease',
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                }}>
                  {'\u203A'}
                </span>
              </div>

              {/* Section body */}
              {isOpen && renderSensorContent(section.content)}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
