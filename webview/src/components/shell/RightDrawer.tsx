/**
 * RightDrawer — Debug tools drawer.
 *
 * Structure-only scaffold. Slides in from the right edge.
 * Contains collapsible sections for each Mentra Live sensor:
 * Microphone, Camera, Button, Speaker, Battery, WiFi, Location, IMU.
 */

import { closeAllOverlays } from '@/store/app-state';

interface SensorSection {
  name: string;
  status: 'connected' | 'disconnected' | 'idle';
  items: Array<{ label: string; value: string }>;
}

const SENSOR_SECTIONS: SensorSection[] = [
  {
    name: 'Microphone',
    status: 'idle',
    items: [
      { label: 'Transcription', value: 'Idle' },
      { label: 'Language', value: 'en-US' },
      { label: 'VAD', value: 'Off' },
    ],
  },
  {
    name: 'Camera',
    status: 'idle',
    items: [
      { label: 'Last capture', value: '--' },
      { label: 'Stream', value: 'Off' },
      { label: 'Resolution', value: '--' },
    ],
  },
  {
    name: 'Button',
    status: 'idle',
    items: [
      { label: 'Last press', value: '--' },
      { label: 'Type', value: '--' },
    ],
  },
  {
    name: 'Speaker',
    status: 'idle',
    items: [
      { label: 'TTS queue', value: '0' },
      { label: 'Playing', value: 'No' },
      { label: 'Volume', value: '--' },
    ],
  },
  {
    name: 'Battery',
    status: 'idle',
    items: [
      { label: 'Glasses', value: '--%' },
      { label: 'Case', value: '--%' },
      { label: 'Charging', value: '--' },
    ],
  },
  {
    name: 'WiFi',
    status: 'disconnected',
    items: [
      { label: 'SSID', value: '--' },
      { label: 'Signal', value: '--' },
    ],
  },
  {
    name: 'Location',
    status: 'idle',
    items: [
      { label: 'Lat/Lng', value: '--' },
      { label: 'Accuracy', value: '--' },
      { label: 'Updated', value: '--' },
    ],
  },
  {
    name: 'IMU',
    status: 'idle',
    items: [
      { label: 'Accel', value: '-- / -- / --' },
      { label: 'Gyro', value: '-- / -- / --' },
      { label: 'Head', value: '--' },
    ],
  },
];

const STATUS_DOT_CLASS: Record<string, string> = {
  connected: 'status-dot--success',
  disconnected: 'status-dot--error',
  idle: 'status-dot--idle',
};

export function RightDrawer() {
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
        <span className="text-section-title">Debug Tools</span>
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

      {/* Sensor sections */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {SENSOR_SECTIONS.map((section) => (
          <div key={section.name} style={{ borderBottom: '1px solid var(--border)' }}>
            {/* Section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              cursor: 'pointer',
            }}>
              <span className={`status-dot ${STATUS_DOT_CLASS[section.status]}`} />
              <span className="text-section-label" style={{ flex: 1 }}>{section.name}</span>
              <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>v</span>
            </div>

            {/* Data pairs */}
            <div style={{ padding: '0 20px 12px 36px' }}>
              {section.items.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3px 0',
                  }}
                >
                  <span className="text-meta">{item.label}</span>
                  <span className="text-meta" style={{ color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
