import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Protocol } from '../../connect/connectionTypes';
import type { ConnectionManagerApi } from '../../hooks/useConnectionManager';
import { useConnectionStore } from '../../store/connectionStore';

const PROTOCOLS: { id: Protocol; label: string; color: string }[] = [
  { id: 'MAVLINK', label: 'MAVLink', color: '#10b981' },
  { id: 'MAVROS', label: 'MAVROS', color: '#a78bfa' },
  { id: 'SIMULATOR', label: 'Simülatör', color: '#3b82f6' },
];

interface ConnectionHeaderDropdownProps {
  connection: ConnectionManagerApi;
}

/** QGroundControl tarzı: durum göstergesi + tıklanınca bağlantı dropdown */
export const ConnectionHeaderDropdown: React.FC<ConnectionHeaderDropdownProps> = ({
  connection,
}) => {
  const { status, connect, disconnect } = connection;
  const config = useConnectionStore((s) => s.config);
  const patchConfig = useConnectionStore((s) => s.patchConfig);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const label = status.connected ? `CONNECTED ${status.latencyMs}ms` : 'DISCONNECTED';

  const dotColor = status.connected ? '#22c55e' : '#ef4444';
  const textColor = status.connected ? '#86efac' : '#fca5a5';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setProtocol = useCallback(
    (protocol: Protocol) => {
      patchConfig({ protocol });
    },
    [patchConfig]
  );

  const urlValue =
    config.protocol === 'MAVLINK'
      ? config.mavlinkUrl
      : config.protocol === 'MAVROS'
        ? config.mavrosUrl
        : '';

  const onUrlChange = (v: string) => {
    if (config.protocol === 'MAVLINK') patchConfig({ mavlinkUrl: v });
    else if (config.protocol === 'MAVROS') patchConfig({ mavrosUrl: v });
  };

  return (
    <div ref={rootRef} className="relative z-[70] flex-shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border px-2 py-1 transition-opacity hover:opacity-95"
        style={{
          borderColor: '#1e2d40',
          backgroundColor: '#0a0f18',
          cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.04em',
        }}
        title="Bağlantı"
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
            border: '1px solid rgba(0,0,0,0.35)',
          }}
        />
        <span
          className="hud-mono font-bold leading-none"
          style={{
            fontSize: 10,
            color: textColor,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        <span style={{ color: '#4a6080', fontSize: 9, marginLeft: 2 }}>▼</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[80] mt-1 flex flex-col gap-2 rounded border p-2 shadow-xl"
          style={{
            width: 300,
            borderColor: '#1e2d40',
            backgroundColor: '#0d1321',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
          }}
          role="dialog"
          aria-label="Bağlantı"
        >
          <div className="flex gap-1">
            {PROTOCOLS.map(({ id, label: pl, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setProtocol(id)}
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  borderRadius: 3,
                  border: `1px solid ${config.protocol === id ? color : '#1e2d40'}`,
                  backgroundColor: config.protocol === id ? `${color}22` : '#070b14',
                  color: config.protocol === id ? color : '#5a7090',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                {pl}
              </button>
            ))}
          </div>

          {config.protocol !== 'SIMULATOR' && (
            <>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  color: '#5a7090',
                  letterSpacing: '0.08em',
                }}
              >
                {config.protocol === 'MAVLINK' ? 'WebSocket URL (MAVLink)' : 'rosbridge WebSocket URL'}
              </div>
              <input
                type="text"
                value={urlValue}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder={
                  config.protocol === 'MAVLINK' ? 'ws://localhost:14551' : 'ws://127.0.0.1:9090'
                }
                className="w-full rounded border px-2 py-1.5"
                style={{
                  borderColor: '#1e2d40',
                  backgroundColor: '#070b14',
                  color: '#c8d4e8',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  boxSizing: 'border-box',
                }}
              />
            </>
          )}

          {config.protocol === 'SIMULATOR' && (
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                color: '#5a7090',
                padding: '4px 0',
              }}
            >
              Dahili telemetri simülatörü. Canlı bağlantı için MAVLink veya MAVROS seçin.
            </div>
          )}

          {status.error && (
            <div
              className="rounded border px-2 py-1.5"
              style={{
                borderColor: '#7f1d1d',
                backgroundColor: '#450a0a',
                color: '#fecaca',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
              }}
            >
              {status.error}
            </div>
          )}

          {status.connecting && (
            <div
              className="rounded border px-2 py-1.5"
              style={{
                borderColor: '#78350f',
                backgroundColor: '#451a03',
                color: '#fcd34d',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
              }}
            >
              Bağlanıyor…
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                patchConfig({ autoReconnect: true, reconnectInterval: 3000 });
                connect();
              }}
              disabled={
                config.protocol === 'SIMULATOR' || status.connected || status.connecting
              }
              className="flex-1 rounded border py-1.5 font-bold"
              style={{
                borderColor: '#15803d',
                backgroundColor: status.connected ? '#052e16' : '#052e1622',
                color: status.connected ? '#4ade80' : '#86efac',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                letterSpacing: '0.06em',
                cursor:
                  config.protocol === 'SIMULATOR' || status.connected || status.connecting
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  config.protocol === 'SIMULATOR' || status.connected || status.connecting
                    ? 0.45
                    : 1,
              }}
            >
              BAĞLAN
            </button>
            <button
              type="button"
              onClick={() => disconnect()}
              disabled={!status.connected && !status.connecting}
              className="rounded border px-3 py-1.5 font-bold"
              style={{
                borderColor: '#1e2d40',
                backgroundColor: '#070b14',
                color: '#94a3b8',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                letterSpacing: '0.06em',
                cursor: status.connected || status.connecting ? 'pointer' : 'not-allowed',
                opacity: !status.connected && !status.connecting ? 0.45 : 1,
              }}
            >
              KES
            </button>
          </div>

          <div
            className="hud-mono border-t pt-1.5 text-center"
            style={{
              borderColor: '#1e2d40',
              fontSize: 9,
              color: '#4a6080',
            }}
          >
            {status.connected
              ? `${status.messagesReceived} msg · kesilince 3s yeniden bağlan`
              : 'Kapalı · MAVLink JSON veya ham çerçeve'}
          </div>
        </div>
      )}
    </div>
  );
};
