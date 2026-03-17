/**
 * RightDrawer -- Mentra Live sensor debug drawer.
 *
 * 8 collapsible sections for each sensor type:
 * Microphone, Camera, Button, Speaker, Battery, WiFi, Location, IMU.
 *
 * Wired to sensor-store for live data from the bridge relay.
 * Falls back to placeholder values when no live data is available.
 */

import { useState, useEffect } from 'react';
import { closeAllOverlays } from '@/store/app-state';
import { getSensorState, subscribeSensorState, type SensorState } from '@/store/sensor-store';
import { getRelayConnectionState, onRelayStateChange, type RelayConnectionState } from '@/lib/relay';
import { renderSensorContent } from './SensorPanels';
import type { SensorContent } from './SensorPanels';

// ---------------------------------------------------------------------------
// Sensor Section Definition
// ---------------------------------------------------------------------------

interface SensorSection {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'idle';
  content: SensorContent;
}

/** Build sensor sections from live state. */
function buildSections(sensor: SensorState, relayState: RelayConnectionState): SensorSection[] {
  const relayUp = relayState === 'connected';

  return [
    {
      id: 'mic',
      name: 'Microphone',
      status: relayUp && sensor.transcription.text ? 'connected' : relayUp ? 'idle' : 'disconnected',
      content: {
        type: 'microphone',
        transcription: sensor.transcription.text || '(waiting for transcription...)',
        audioLevel: sensor.transcription.confidence > 0 ? Math.round(sensor.transcription.confidence * 100) : 0,
        vadStatus: sensor.transcription.isFinal ? 'Final' : sensor.transcription.text ? 'Active' : 'Idle',
        language: sensor.transcription.language || 'en-US',
      },
    },
    {
      id: 'camera',
      name: 'Camera',
      status: sensor.lastPhoto ? 'connected' : 'idle',
      content: {
        type: 'camera',
        lastPhoto: sensor.lastPhoto ? `${sensor.lastPhoto.mimeType} (${sensor.lastPhoto.size}B)` : null,
        resolution: '1280x720',
        streamStatus: sensor.lastPhoto ? 'Captured' : 'Off',
      },
    },
    {
      id: 'button',
      name: 'Button',
      status: relayUp && sensor.buttonHistory.length > 0 ? 'connected' : relayUp ? 'idle' : 'disconnected',
      content: {
        type: 'button',
        events: sensor.buttonHistory.length > 0
          ? sensor.buttonHistory.map((evt) => ({
              time: new Date(evt.timestamp).toLocaleTimeString([], { hour12: false }),
              action: `${evt.pressType} press`,
            }))
          : [{ time: '--:--:--', action: 'no events' }],
      },
    },
    {
      id: 'speaker',
      name: 'Speaker',
      status: relayUp ? 'connected' : 'disconnected',
      content: {
        type: 'speaker',
        ttsQueue: sensor.ttsStatus === 'speaking' ? 1 : 0,
        playbackStatus: sensor.ttsStatus === 'speaking'
          ? 'Playing'
          : sensor.ttsStatus === 'done'
            ? 'Done'
            : sensor.ttsStatus === 'error'
              ? 'Error'
              : 'Idle',
        volume: 72,
      },
    },
    {
      id: 'battery',
      name: 'Battery',
      status: sensor.battery.level > 0 ? 'connected' : relayUp ? 'idle' : 'disconnected',
      content: {
        type: 'battery',
        glassesPercent: sensor.battery.level,
        casePercent: 0,
        charging: sensor.battery.charging,
      },
    },
    {
      id: 'wifi',
      name: 'WiFi',
      status: relayUp ? 'connected' : 'disconnected',
      content: {
        type: 'wifi',
        ssid: relayUp ? 'Bridge Active' : '--',
        signalBars: relayUp ? 3 : 0,
        connectionStatus: relayUp ? 'Connected' : 'Disconnected',
      },
    },
    {
      id: 'location',
      name: 'Location',
      status: 'idle',
      content: {
        type: 'location',
        lat: '--',
        lng: '--',
        accuracy: '--',
        lastUpdate: 'n/a',
      },
    },
    {
      id: 'imu',
      name: 'IMU',
      status: relayUp ? 'idle' : 'disconnected',
      content: {
        type: 'imu',
        accelX: '--',
        accelY: '--',
        accelZ: '--',
      },
    },
  ];
}

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
  const [sensorState, setSensorState] = useState<SensorState>(getSensorState());
  const [relayState, setRelayState] = useState<RelayConnectionState>(getRelayConnectionState());

  useEffect(() => subscribeSensorState((s) => setSensorState(s)), []);
  useEffect(() => onRelayStateChange((s) => setRelayState(s)), []);

  const sections = buildSections(sensorState, relayState);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px' }}>Debug</span>
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: relayState === 'connected' ? 'rgba(78,204,163,0.15)' : 'rgba(239,68,68,0.15)',
            color: relayState === 'connected' ? 'var(--success)' : 'var(--destructive)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {relayState === 'connected' ? 'LIVE' : relayState === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>
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
        {sections.map((section) => {
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
