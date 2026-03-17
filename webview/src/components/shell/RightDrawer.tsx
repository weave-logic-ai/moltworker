/**
 * RightDrawer -- Sensor control panel.
 *
 * Each sensor: toggle switch (on/off) + status dot + expandable detail area.
 * All sensors start toggled OFF. Status reflects live relay data.
 */

import { useState, useEffect } from 'react';
import { closeAllOverlays, getState, subscribe, toggleSensor } from '@/store/app-state';
import { getSensorState, subscribeSensorState, type SensorState } from '@/store/sensor-store';
import { getRelayConnectionState, onRelayStateChange, type RelayConnectionState } from '@/lib/relay';
import { renderSensorContent, type SensorContent } from './SensorPanels';

interface SensorRow {
  id: string;
  name: string;
  status: 'on' | 'off' | 'error';
  statusLabel: string;
  content: SensorContent;
}

function buildRows(sensor: SensorState, relayUp: boolean, toggles: Record<string, boolean>): SensorRow[] {
  const row = (id: string, name: string, content: SensorContent): SensorRow => {
    const enabled = toggles[id] ?? false;
    return {
      id, name, content,
      status: !enabled ? 'off' : relayUp ? 'on' : 'error',
      statusLabel: !enabled ? 'Off' : relayUp ? 'Active' : 'No relay',
    };
  };

  return [
    row('mic', 'Microphone', {
      type: 'microphone',
      transcription: sensor.transcription.text || '(waiting...)',
      audioLevel: Math.round((sensor.transcription.confidence || 0) * 100),
      vadStatus: sensor.transcription.isFinal ? 'Final' : sensor.transcription.text ? 'Active' : 'Idle',
      language: sensor.transcription.language || 'en-US',
    }),
    row('camera', 'Camera', {
      type: 'camera',
      lastPhoto: sensor.lastPhoto ? `${sensor.lastPhoto.mimeType} (${sensor.lastPhoto.size}B)` : null,
      resolution: '1280x720',
      streamStatus: sensor.lastPhoto ? 'Captured' : 'Off',
    }),
    row('button', 'Button', {
      type: 'button',
      events: sensor.buttonHistory.length > 0
        ? sensor.buttonHistory.map(e => ({ time: new Date(e.timestamp).toLocaleTimeString([], { hour12: false }), action: `${e.pressType} press` }))
        : [{ time: '--:--:--', action: 'no events' }],
    }),
    row('speaker', 'Speaker', {
      type: 'speaker',
      ttsQueue: sensor.ttsStatus === 'speaking' ? 1 : 0,
      playbackStatus: sensor.ttsStatus === 'speaking' ? 'Playing' : sensor.ttsStatus === 'error' ? 'Error' : 'Idle',
      volume: 72,
    }),
    row('battery', 'Battery', {
      type: 'battery',
      glassesPercent: sensor.battery.level,
      casePercent: 0,
      charging: sensor.battery.charging,
    }),
    row('wifi', 'WiFi', { type: 'wifi', ssid: relayUp ? 'Bridge Active' : '--', signalBars: relayUp ? 3 : 0, connectionStatus: relayUp ? 'Connected' : 'Off' }),
    row('location', 'Location', { type: 'location', lat: '--', lng: '--', accuracy: '--', lastUpdate: 'n/a' }),
    row('imu', 'IMU', { type: 'imu', accelX: '--', accelY: '--', accelZ: '--' }),
  ];
}

export function RightDrawer() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sensorState, setSensorState] = useState<SensorState>(getSensorState());
  const [relayState, setRelayState] = useState<RelayConnectionState>(getRelayConnectionState());
  const [toggles, setToggles] = useState(getState().sensorToggles);

  useEffect(() => subscribeSensorState(s => setSensorState(s)), []);
  useEffect(() => onRelayStateChange(s => setRelayState(s)), []);
  useEffect(() => subscribe(s => setToggles(s.sensorToggles)), []);

  const rows = buildRows(sensorState, relayState === 'connected', toggles);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <aside style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(calc(-50% + 20%))',
      width: '80%', maxWidth: '342px', height: '100dvh', background: 'var(--bg-elevated)',
      zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'slideInRight 200ms ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Sensors</span>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '999px', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            background: relayState === 'connected' ? 'rgba(78,204,163,0.15)' : 'rgba(239,68,68,0.15)',
            color: relayState === 'connected' ? 'var(--success)' : 'var(--destructive)',
          }}>
            {relayState === 'connected' ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <button onClick={closeAllOverlays} style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>
          {'\u00D7'}
        </button>
      </div>

      {/* Sensor rows */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 20px', WebkitOverflowScrolling: 'touch' }}>
        {rows.map(row => {
          const isOn = toggles[row.id] ?? false;
          const isExpanded = expanded.has(row.id);
          return (
            <div key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Row header: status dot + name + status label + toggle + expand arrow */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: '10px' }}>
                {/* Status dot */}
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: row.status === 'on' ? 'var(--success)' : row.status === 'error' ? 'var(--destructive)' : 'var(--text-subtle)',
                }} />

                {/* Name + status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: isOn ? 'var(--text)' : 'var(--text-muted)' }}>
                    {row.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-subtle)', marginLeft: '8px' }}>
                    {row.statusLabel}
                  </span>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => toggleSensor(row.id)}
                  style={{
                    width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: isOn ? 'var(--success)' : 'rgba(255,255,255,0.12)',
                    position: 'relative', flexShrink: 0, transition: 'background 200ms ease',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
                    background: '#fff', transition: 'left 200ms ease',
                    left: isOn ? '18px' : '2px',
                  }} />
                </button>

                {/* Expand arrow */}
                <button
                  onClick={() => toggleExpand(row.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: 'var(--text-subtle)', fontSize: '14px', flexShrink: 0,
                    transition: 'transform 200ms ease',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                  }}
                >
                  {'\u203A'}
                </button>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && isOn && renderSensorContent(row.content)}
              {isExpanded && !isOn && (
                <div style={{ padding: '8px 20px 14px', fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                  Enable sensor to see data
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
