import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Protocol } from '../../connect/connectionTypes';
import type { ConnectionManagerApi } from '../../hooks/useConnectionManager';
import { useConnectionStore } from '../../store/connectionStore';

const PROTOCOLS: { id: Protocol; label: string; color: string }[] = [
  { id: 'MAVLINK', label: 'MAVLink', color: '#10b981' },
  { id: 'MAVROS', label: 'MAVROS', color: '#a78bfa' },
  { id: 'SIMULATOR', label: 'Simülatör', color: '#3b82f6' },
];

const F = "'Barlow Condensed', sans-serif";
const MONO = "'JetBrains Mono', monospace";

interface ConnectionHeaderDropdownProps {
  connection: ConnectionManagerApi;
}

/** QGroundControl tarzı bağlantı göstergesi + dropdown */
export const ConnectionHeaderDropdown: React.FC<ConnectionHeaderDropdownProps> = ({
  connection,
}) => {
  const { status, connect, disconnect, sendCommand } = connection;
  const config = useConnectionStore((s) => s.config);
  const patchConfig = useConnectionStore((s) => s.patchConfig);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Lokal bridge host/port — kullanıcı düzenler, Uygula'ya basınca store'a yazılır
  const [localBridgeHost, setLocalBridgeHost] = useState(config.bridgeHost);
  const [localBridgePort, setLocalBridgePort] = useState(String(config.bridgePort));

  // Config değişince local değerleri güncelle (başka yerden değişme ihtimaline karşı)
  useEffect(() => {
    setLocalBridgeHost(config.bridgeHost);
    setLocalBridgePort(String(config.bridgePort));
  }, [config.bridgeHost, config.bridgePort]);

  const dotColor =
    status.connected ? '#22c55e' : status.connecting ? '#f59e0b' : '#ef4444';
  const textColor = status.connected ? '#86efac' : '#fca5a5';
  const label = status.connected
    ? `CONNECTED ${status.latencyMs}ms`
    : status.connecting
      ? 'CONNECTING…'
      : 'DISCONNECTED';

  // Dışarı tıklayınca / Escape ile kapat
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setProtocol = useCallback(
    (protocol: Protocol) => patchConfig({ protocol }),
    [patchConfig]
  );

  /** Yeni hedefi store'a yaz + bağlıysa bridge'e anında uygula */
  const applyBridgeTarget = useCallback(() => {
    const port = parseInt(localBridgePort, 10);
    if (!localBridgeHost.trim() || !Number.isFinite(port) || port < 1 || port > 65535) return;
    patchConfig({ bridgeHost: localBridgeHost.trim(), bridgePort: port });
    // Bağlıysa bridge'e BRIDGE_CONFIGURE gönder — anında etkili
    if (status.connected) {
      sendCommand({ type: 'BRIDGE_CONFIGURE', host: localBridgeHost.trim(), port });
    }
  }, [localBridgeHost, localBridgePort, patchConfig, sendCommand, status.connected]);

  const wsUrl =
    config.protocol === 'MAVLINK'
      ? config.mavlinkUrl
      : config.protocol === 'MAVROS'
        ? config.mavrosUrl
        : '';

  const onWsUrlChange = (v: string) => {
    if (config.protocol === 'MAVLINK') patchConfig({ mavlinkUrl: v });
    else if (config.protocol === 'MAVROS') patchConfig({ mavrosUrl: v });
  };

  // input stilini tek değişkende tut
  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 3,
    border: '1px solid #1e2d40',
    backgroundColor: '#070b14',
    color: '#c8d4e8',
    fontFamily: MONO,
    fontSize: 11,
    padding: '4px 8px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      {/* ── Gösterge butonu ── */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border px-2 py-1"
        style={{
          borderColor: '#1e2d40',
          backgroundColor: '#0a0f18',
          cursor: 'pointer',
          fontFamily: F,
          letterSpacing: '0.04em',
        }}
        title="Bağlantı ayarları"
      >
        <span
          style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
            border: '1px solid rgba(0,0,0,0.35)',
          }}
        />
        <span className="hud-mono font-bold leading-none"
          style={{ fontSize: 10, color: textColor, whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ color: '#4a6080', fontSize: 9, marginLeft: 2 }}>▼</span>
      </button>

      {/* ── Dropdown paneli ── */}
      {open && (
        <div
          className="flex flex-col gap-2 rounded border p-3 shadow-xl"
          style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 9999,
            width: 320,
            borderColor: '#1e2d40',
            backgroundColor: '#0d1321',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
          role="dialog"
          aria-label="Bağlantı ayarları"
        >
          {/* Protokol seçimi */}
          <div className="flex gap-1">
            {PROTOCOLS.map(({ id, label: pl, color }) => (
              <button key={id} type="button" onClick={() => setProtocol(id)}
                style={{
                  flex: 1, padding: '5px 4px', borderRadius: 3,
                  border: `1px solid ${config.protocol === id ? color : '#1e2d40'}`,
                  backgroundColor: config.protocol === id ? `${color}22` : '#070b14',
                  color: config.protocol === id ? color : '#5a7090',
                  fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}>
                {pl}
              </button>
            ))}
          </div>

          {/* ── MAVLink özel alanlar ── */}
          {config.protocol === 'MAVLINK' && (
            <>
              {/* Bridge WebSocket URL */}
              <div>
                <div style={{ fontFamily: F, fontSize: 9, color: '#5a7090', letterSpacing: '0.08em', marginBottom: 4 }}>
                  BRIDGE WebSocket URL  <span style={{ color: '#334155' }}>(tarayıcı bu adrese bağlanır)</span>
                </div>
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => onWsUrlChange(e.target.value)}
                  placeholder="ws://localhost:14552"
                  style={inputStyle}
                />
              </div>

              {/* Ayırıcı */}
              <div style={{ borderTop: '1px solid #1e2d40', margin: '2px 0' }} />

              {/* MAVProxy hedef adresi */}
              <div>
                <div style={{ fontFamily: F, fontSize: 9, color: '#f59e0b', letterSpacing: '0.08em', marginBottom: 6 }}>
                  MAVProxy IP / PORT  <span style={{ color: '#334155' }}>(bridge buraya bağlanır)</span>
                </div>
                <div className="flex gap-2">
                  <div style={{ flex: 3 }}>
                    <div style={{ fontFamily: F, fontSize: 8, color: '#4a6080', marginBottom: 3 }}>IP ADRESİ</div>
                    <input
                      type="text"
                      value={localBridgeHost}
                      onChange={(e) => setLocalBridgeHost(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyBridgeTarget()}
                      placeholder="192.168.1.100"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: F, fontSize: 8, color: '#4a6080', marginBottom: 3 }}>PORT</div>
                    <input
                      type="text"
                      value={localBridgePort}
                      onChange={(e) => setLocalBridgePort(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyBridgeTarget()}
                      placeholder="14551"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Uygula butonu */}
                <button
                  type="button"
                  onClick={applyBridgeTarget}
                  className="w-full rounded border py-1 font-bold"
                  style={{
                    marginTop: 6,
                    borderColor: '#78350f',
                    backgroundColor: '#1c0a00',
                    color: '#fbbf24',
                    fontFamily: F, fontSize: 10, letterSpacing: '0.06em',
                    cursor: 'pointer',
                  }}
                  title={status.connected ? 'Bridge\'e anında uygula' : 'Kaydet (sonraki bağlantıda kullanılır)'}
                >
                  {status.connected ? '⚡ BRIDGE\'E UYGULA' : '💾 KAYDET'}
                </button>

                {/* Mavproxy komutu ipucu */}
                <div
                  style={{
                    marginTop: 6, padding: '5px 7px',
                    borderRadius: 3, border: '1px solid #1e2d40',
                    backgroundColor: '#070b14',
                    fontFamily: MONO, fontSize: 9, color: '#4a6080',
                    lineHeight: 1.5, wordBreak: 'break-all',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Uzak PC'de:</span>
                  <br />
                  <span style={{ color: '#94a3b8' }}>
                    mavproxy.py --master=COM3{'\n'} --baudrate=921600{'\n'}
                    {' '}--out=tcpin:0.0.0.0:{localBridgePort || '14551'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* MAVROS */}
          {config.protocol === 'MAVROS' && (
            <div>
              <div style={{ fontFamily: F, fontSize: 9, color: '#5a7090', letterSpacing: '0.08em', marginBottom: 4 }}>
                rosbridge WebSocket URL
              </div>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => onWsUrlChange(e.target.value)}
                placeholder="ws://127.0.0.1:9090"
                style={inputStyle}
              />
            </div>
          )}

          {/* Simülatör */}
          {config.protocol === 'SIMULATOR' && (
            <div style={{ fontFamily: F, fontSize: 10, color: '#5a7090', padding: '2px 0' }}>
              Dahili telemetri simülatörü. Canlı bağlantı için MAVLink veya MAVROS seçin.
            </div>
          )}

          {/* Hata */}
          {status.error && (
            <div className="rounded border px-2 py-1.5"
              style={{ borderColor: '#7f1d1d', backgroundColor: '#450a0a', color: '#fecaca', fontFamily: F, fontSize: 11 }}>
              {status.error}
            </div>
          )}

          {/* Bağlanıyor */}
          {status.connecting && !status.error && (
            <div className="rounded border px-2 py-1.5"
              style={{ borderColor: '#78350f', backgroundColor: '#451a03', color: '#fcd34d', fontFamily: F, fontSize: 11 }}>
              Bağlanıyor…
            </div>
          )}

          {/* BAĞLAN / KES butonları */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { patchConfig({ autoReconnect: true, reconnectInterval: 3000 }); connect(); }}
              disabled={config.protocol === 'SIMULATOR' || status.connected || status.connecting}
              className="flex-1 rounded border py-1.5 font-bold"
              style={{
                borderColor: '#15803d',
                backgroundColor: status.connected ? '#052e16' : '#052e1622',
                color: status.connected ? '#4ade80' : '#86efac',
                fontFamily: F, fontSize: 11, letterSpacing: '0.06em',
                cursor: config.protocol === 'SIMULATOR' || status.connected || status.connecting ? 'not-allowed' : 'pointer',
                opacity: config.protocol === 'SIMULATOR' || status.connected || status.connecting ? 0.45 : 1,
              }}>
              BAĞLAN
            </button>
            <button
              type="button"
              onClick={() => disconnect()}
              disabled={!status.connected && !status.connecting}
              className="rounded border px-3 py-1.5 font-bold"
              style={{
                borderColor: '#1e2d40', backgroundColor: '#070b14', color: '#94a3b8',
                fontFamily: F, fontSize: 11, letterSpacing: '0.06em',
                cursor: status.connected || status.connecting ? 'pointer' : 'not-allowed',
                opacity: !status.connected && !status.connecting ? 0.45 : 1,
              }}>
              KES
            </button>
          </div>

          {/* Alt bilgi satırı */}
          <div className="hud-mono border-t pt-1.5 text-center"
            style={{ borderColor: '#1e2d40', fontSize: 9, color: '#4a6080' }}>
            {status.connected
              ? `${status.messagesReceived} msg · Bridge: ${config.bridgeHost}:${config.bridgePort}`
              : 'npm run bridge · ws://localhost:14552'}
          </div>
        </div>
      )}
    </div>
  );
};
