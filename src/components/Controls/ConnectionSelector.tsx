import React from 'react';
import { useConnectionModeStore, type ConnectionMode } from '../../store/connectionModeStore';
import { useTelemetryStore } from '../../store/telemetryStore';

interface ConnectionSelectorProps {
  resetSimulation: () => void;
}

export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  resetSimulation,
}) => {
  const mode = useConnectionModeStore((s) => s.mode);
  const setMode = useConnectionModeStore((s) => s.setMode);
  const telemetryConnected = useTelemetryStore((s) => s.telemetryConnected);
  const lastTelemetryMs = useTelemetryStore((s) => s.lastTelemetryMs);

  const setChip = (m: ConnectionMode) => ({
    cursor: 'pointer' as const,
    border: mode === m ? '1px solid #3b82f6' : '1px solid #1e2d40',
    backgroundColor: mode === m ? '#1e3a5f80' : '#0d1321',
    color: mode === m ? '#f0f4f8' : '#8ba3be',
  });

  const statusLabel =
    mode === 'SIMULATOR'
      ? 'Örnek görev döngüsü'
      : telemetryConnected
        ? 'WS bağlı'
        : 'WS bağlantısı yok';

  const ageSeconds =
    lastTelemetryMs > 0 ? Math.max(0, (Date.now() - lastTelemetryMs) / 1000) : null;

  return (
    <div className="hud-panel p-2 flex flex-col gap-2" style={{ minWidth: 0 }}>
      <div
        className="text-[10px] text-hud-dim font-semibold tracking-wider uppercase"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.3 }}
      >
        Bağlantı
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setMode('SIMULATOR')}
          className="text-[10px] px-2 py-1 rounded font-semibold uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", ...setChip('SIMULATOR') }}
        >
          Simülatör
        </button>
        <button
          type="button"
          onClick={() => setMode('MAVLINK')}
          className="text-[10px] px-2 py-1 rounded font-semibold uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", ...setChip('MAVLINK') }}
        >
          MAVLink
        </button>
      </div>
      <div
        className="text-[10px] hud-mono shrink-0 text-hud-secondary"
        style={{
          opacity: mode === 'MAVLINK' && !telemetryConnected ? 0.7 : 1,
          wordBreak: 'break-word',
        }}
      >
        {statusLabel}
        {mode === 'MAVLINK' && telemetryConnected && ageSeconds !== null && (
          <span style={{ marginLeft: 6, color: '#4a6080' }}>
            · son {ageSeconds.toFixed(1)} s
          </span>
        )}
      </div>
      <div style={{ fontSize: 9, color: '#4a6080', lineHeight: 1.35 }}>
        MAVLink adresi: {process.env.REACT_APP_MAVLINK_URL ?? 'ws://localhost:14551'}
      </div>
      {mode === 'SIMULATOR' && (
        <button
          type="button"
          onClick={resetSimulation}
          className="text-[10px] px-2 py-1 rounded text-hud-secondary"
          style={{
            border: '1px solid #1e2d40',
            backgroundColor: '#070b14',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          Simülasyonu sıfırla
        </button>
      )}
    </div>
  );
};
