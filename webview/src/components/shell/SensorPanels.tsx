/**
 * SensorPanels -- Renderer components for each Mentra Live sensor section
 * in the RightDrawer debug panel.
 *
 * Extracted to keep RightDrawer.tsx under 500 lines.
 */

// ---------------------------------------------------------------------------
// Sensor Content Types
// ---------------------------------------------------------------------------

export type SensorContent =
  | { type: 'microphone'; transcription: string; audioLevel: number; vadStatus: string; language: string }
  | { type: 'camera'; lastPhoto: string | null; resolution: string; streamStatus: string }
  | { type: 'button'; events: Array<{ time: string; action: string }> }
  | { type: 'speaker'; ttsQueue: number; playbackStatus: string; volume: number }
  | { type: 'battery'; glassesPercent: number; casePercent: number; charging: boolean }
  | { type: 'wifi'; ssid: string; signalBars: number; connectionStatus: string }
  | { type: 'location'; lat: string; lng: string; accuracy: string; lastUpdate: string }
  | { type: 'imu'; accelX: string; accelY: string; accelZ: string };

// ---------------------------------------------------------------------------
// Shared UI Primitives
// ---------------------------------------------------------------------------

function DataPair({ label, value, valueColor }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '5px 0',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{label}</span>
      <span style={{
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        color: valueColor || 'var(--text)',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  );
}

function MiniBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div style={{ marginTop: '4px' }}>
      <div style={{
        width: '100%',
        height: '3px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          borderRadius: '2px',
          background: color,
          transition: 'width 300ms ease',
        }} />
      </div>
    </div>
  );
}

function SignalBars({ bars }: { bars: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: '2px',
      height: '14px',
    }}>
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          style={{
            width: '3px',
            height: `${level * 3 + 2}px`,
            borderRadius: '1px',
            background: level <= bars ? 'var(--success)' : 'rgba(255,255,255,0.12)',
            transition: 'background 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

function StatusBadge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: '999px',
      letterSpacing: '0.5px',
      textTransform: 'uppercase' as const,
      color: color,
      background: `${color}18`,
    }}>
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Individual Sensor Renderers
// ---------------------------------------------------------------------------

function MicrophoneContent({ content }: { content: Extract<SensorContent, { type: 'microphone' }> }) {
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <div style={{
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        color: 'rgba(250,250,250,0.7)',
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '6px',
        marginBottom: '10px',
        lineHeight: 1.5,
      }}>
        {content.transcription}
      </div>
      <DataPair label="Audio Level" value={`${content.audioLevel}%`} />
      <MiniBar percent={content.audioLevel} color="var(--accent)" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>VAD</span>
        <StatusBadge text={content.vadStatus} color="var(--success)" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0 0' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Language</span>
        <StatusBadge text={content.language} color="var(--info)" />
      </div>
    </div>
  );
}

function CameraContent({ content }: { content: Extract<SensorContent, { type: 'camera' }> }) {
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <div style={{
        width: '100%',
        height: '80px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '10px',
        fontSize: '12px',
        color: 'var(--text-subtle)',
      }}>
        {content.lastPhoto ? 'Photo' : 'No capture'}
      </div>
      <DataPair label="Resolution" value={content.resolution} />
      <DataPair label="Stream" value={content.streamStatus} valueColor={content.streamStatus === 'Off' ? 'var(--text-subtle)' : 'var(--success)'} />
    </div>
  );
}

function ButtonContent({ content }: { content: Extract<SensorContent, { type: 'button' }> }) {
  return (
    <div style={{ padding: '0 20px 16px' }}>
      {content.events.map((evt, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 0',
        }}>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-subtle)',
          }}>
            {evt.time}
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(250,250,250,0.6)',
          }}>
            {evt.action}
          </span>
        </div>
      ))}
    </div>
  );
}

function SpeakerContent({ content }: { content: Extract<SensorContent, { type: 'speaker' }> }) {
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <DataPair label="TTS Queue" value={`${content.ttsQueue}`} valueColor={content.ttsQueue > 0 ? 'var(--warning)' : 'var(--text)'} />
      <DataPair label="Playback" value={content.playbackStatus} valueColor={content.playbackStatus === 'Playing' ? 'var(--success)' : 'var(--text)'} />
      <DataPair label="Volume" value={`${content.volume}%`} />
      <MiniBar percent={content.volume} color="var(--info)" />
    </div>
  );
}

function BatteryContent({ content }: { content: Extract<SensorContent, { type: 'battery' }> }) {
  const glassesColor = content.glassesPercent > 20 ? 'var(--success)' : 'var(--destructive)';
  const caseColor = content.casePercent > 20 ? 'var(--success)' : 'var(--destructive)';

  return (
    <div style={{ padding: '0 20px 16px' }}>
      <DataPair label="Glasses" value={`${content.glassesPercent}%`} valueColor={glassesColor} />
      <MiniBar percent={content.glassesPercent} color={glassesColor} />
      <div style={{ height: '8px' }} />
      <DataPair label="Case" value={`${content.casePercent}%`} valueColor={caseColor} />
      <MiniBar percent={content.casePercent} color={caseColor} />
      <div style={{ height: '4px' }} />
      <DataPair
        label="Charging"
        value={content.charging ? 'Yes' : 'No'}
        valueColor={content.charging ? 'var(--warning)' : 'var(--text-subtle)'}
      />
    </div>
  );
}

function WiFiContent({ content }: { content: Extract<SensorContent, { type: 'wifi' }> }) {
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <DataPair label="SSID" value={content.ssid} />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Signal</span>
        <SignalBars bars={content.signalBars} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Status</span>
        <StatusBadge text={content.connectionStatus} color="var(--success)" />
      </div>
    </div>
  );
}

function LocationContent({ content }: { content: Extract<SensorContent, { type: 'location' }> }) {
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <DataPair label="Lat" value={content.lat} />
      <DataPair label="Lng" value={content.lng} />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Accuracy</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: '1px solid var(--info)',
            opacity: 0.6,
          }} />
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
            {content.accuracy}
          </span>
        </div>
      </div>
      <DataPair label="Updated" value={content.lastUpdate} />
    </div>
  );
}

function ImuContent({ content }: { content: Extract<SensorContent, { type: 'imu' }> }) {
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <DataPair label="Accel X" value={content.accelX} />
      <DataPair label="Accel Y" value={content.accelY} />
      <DataPair label="Accel Z" value={content.accelZ} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public Dispatcher
// ---------------------------------------------------------------------------

export function renderSensorContent(content: SensorContent) {
  switch (content.type) {
    case 'microphone': return <MicrophoneContent content={content} />;
    case 'camera': return <CameraContent content={content} />;
    case 'button': return <ButtonContent content={content} />;
    case 'speaker': return <SpeakerContent content={content} />;
    case 'battery': return <BatteryContent content={content} />;
    case 'wifi': return <WiFiContent content={content} />;
    case 'location': return <LocationContent content={content} />;
    case 'imu': return <ImuContent content={content} />;
  }
}
