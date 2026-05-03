import React, { useState } from 'react';
import type { Protocol } from '../../connect/connectionTypes';
import { useConnectionManager } from '../../hooks/useConnectionManager';
import { HeartbeatLight } from '../Interop/HeartbeatLight';
import { useConnectionStore } from '../../store/connectionStore';

interface ConnectionManagerPanelProps {
  resetSimulation?: () => void;
}

export const ConnectionManagerPanel: React.FC<ConnectionManagerPanelProps> = ({
  resetSimulation,
}) => {
  const config = useConnectionStore((s) => s.config);
  const patchConfig = useConnectionStore((s) => s.patchConfig);
  const { status, messageLog, connect, disconnect, sendCommand } = useConnectionManager(config);

  const [showLog, setShowLog] = useState(false);
  const [manualCmd, setManualCmd] = useState('');

  const setProtocol = (protocol: Protocol) => {
    patchConfig({ protocol });
  };

  const sendManualCommand = () => {
    const trimmed = manualCmd.trim();
    if (!trimmed) return;

    try {
      const cmd = JSON.parse(trimmed) as object;
      sendCommand(cmd);
    } catch {
      sendCommand({ type: 'COMMAND_LONG', command: trimmed });
    }
    setManualCmd('');
  };

  const protocols: { id: Protocol; label: string; color: string }[] = [
    { id: 'SIMULATOR', label: '🔵 SİMÜL', color: '#3b82f6' },
    { id: 'MAVLINK', label: '🟢 MAVLink', color: '#10b981' },
    { id: 'MAVROS', label: '🟣 MAVROS', color: '#a78bfa' },
  ];

  const statusColor = status.connected
    ? '#10b981'
    : status.connecting
      ? '#f59e0b'
      : status.error
        ? '#ef4444'
        : '#4a6080';

  return (
    <div
      style={{
        backgroundColor: '#0d1321',
        border: '1px solid #1e2d40',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid #1e2d40',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              letterSpacing: '0.15em',
              color: '#4a6080',
            }}
          >
            BAĞLANTI
          </span>
        </div>
        {status.connected && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#10b981',
            }}
          >
            {status.latencyMs}ms · {status.messagesReceived} msg
          </span>
        )}
      </div>

      <div style={{ padding: '8px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {protocols.map(({ id, label, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setProtocol(id)}
              style={{
                flex: 1,
                padding: '4px 2px',
                borderRadius: 3,
                border: `1px solid ${config.protocol === id ? color : '#1e2d40'}`,
                backgroundColor: config.protocol === id ? `${color}20` : '#070b14',
                color: config.protocol === id ? color : '#4a6080',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {config.protocol === 'MAVLINK' && (
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                color: '#4a6080',
                marginBottom: 3,
                letterSpacing: '0.1em',
              }}
            >
              MAVLink WebSocket URL
            </div>
            <input
              type="text"
              value={config.mavlinkUrl}
              onChange={(e) => patchConfig({ mavlinkUrl: e.target.value })}
              placeholder="ws://192.168.1.100:14551"
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: '#070b14',
                border: '1px solid #1e2d40',
                borderRadius: 3,
                color: '#10b981',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                color: '#4a6080',
                marginTop: 3,
              }}
            >
              MAVProxy: mavproxy.py --master=COM3 --baudrate=921600 --out=tcpin:0.0.0.0:14551
            </div>
          </div>
        )}

        {config.protocol === 'MAVROS' && (
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                color: '#4a6080',
                marginBottom: 3,
                letterSpacing: '0.1em',
              }}
            >
              MAVROS rosbridge URL (Jetson)
            </div>
            <input
              type="text"
              value={config.mavrosUrl}
              onChange={(e) => patchConfig({ mavrosUrl: e.target.value })}
              placeholder="ws://192.168.1.101:9090"
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: '#070b14',
                border: '1px solid #1e2d40',
                borderRadius: 3,
                color: '#a78bfa',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                color: '#4a6080',
                marginTop: 3,
              }}
            >
              Jetson: ros2 launch rosbridge_server rosbridge_websocket_launch.xml
            </div>
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            color: '#4a6080',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={config.autoReconnect}
            onChange={(e) => patchConfig({ autoReconnect: e.target.checked })}
          />
          Otomatik yeniden bağlan
        </label>

        {status.error && (
          <div
            style={{
              padding: '4px 8px',
              backgroundColor: '#450a0a',
              border: '1px solid #7f1d1d',
              borderRadius: 3,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              color: '#fca5a5',
              marginBottom: 6,
            }}
          >
            {status.error}
          </div>
        )}

        {status.connecting && (
          <div
            style={{
              padding: '4px 8px',
              backgroundColor: '#451a03',
              border: '1px solid #78350f',
              borderRadius: 3,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              color: '#f59e0b',
              marginBottom: 6,
            }}
          >
            Bağlanıyor...
          </div>
        )}

        {config.protocol !== 'SIMULATOR' && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => connect()}
              disabled={status.connected || status.connecting}
              style={{
                flex: 1,
                padding: '4px',
                borderRadius: 3,
                border: '1px solid #10b981',
                backgroundColor: status.connected ? '#052e16' : '#070b14',
                color: status.connected ? '#10b981' : '#8ba3be',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                cursor: status.connected ? 'not-allowed' : 'pointer',
              }}
            >
              {status.connected ? '✓ BAĞLI' : 'BAĞLAN'}
            </button>
            <button
              type="button"
              onClick={() => disconnect()}
              disabled={!status.connected && !status.connecting}
              style={{
                padding: '4px 10px',
                borderRadius: 3,
                border: '1px solid #1e2d40',
                backgroundColor: '#070b14',
                color: '#4a6080',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                cursor:
                  status.connected || status.connecting ? 'pointer' : 'not-allowed',
              }}
            >
              KES
            </button>
          </div>
        )}

        {config.protocol === 'SIMULATOR' && resetSimulation && (
          <button
            type="button"
            onClick={resetSimulation}
            style={{
              width: '100%',
              padding: '4px',
              marginBottom: 8,
              borderRadius: 3,
              border: '1px solid #3b82f6',
              backgroundColor: '#070b14',
              color: '#8ba3be',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Simülasyonu sıfırla
          </button>
        )}

        <div style={{ marginBottom: 8, minWidth: 0, overflow: 'hidden' }}>
          <HeartbeatLight />
        </div>

        <button
          type="button"
          onClick={() => setShowLog(!showLog)}
          style={{
            width: '100%',
            padding: '3px',
            borderRadius: 3,
            border: '1px solid #1e2d40',
            backgroundColor: showLog ? '#1e2d40' : '#070b14',
            color: '#4a6080',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            cursor: 'pointer',
            marginBottom: showLog ? 6 : 0,
          }}
        >
          {showLog ? '▲ Konsolu Kapat' : '▼ MAVLink / MAVROS konsol'}
        </button>

        {showLog && (
          <>
            <div
              style={{
                height: 150,
                overflowY: 'auto',
                backgroundColor: '#070b14',
                border: '1px solid #1e2d40',
                borderRadius: 3,
                padding: 4,
                marginBottom: 6,
              }}
            >
              {messageLog.length === 0 ? (
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: '#4a6080',
                    padding: 4,
                  }}
                >
                  Mesaj bekleniyor...
                </div>
              ) : (
                messageLog.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: msg.direction === 'OUT' ? '#f59e0b' : '#10b981',
                      padding: '1px 2px',
                      borderBottom: '1px solid #0d1321',
                    }}
                  >
                    <span style={{ color: '#4a6080' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('tr-TR')}
                    </span>{' '}
                    <span style={{ color: msg.direction === 'OUT' ? '#f59e0b' : '#3b82f6' }}>
                      {msg.direction}
                    </span>{' '}
                    {msg.type}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                value={manualCmd}
                onChange={(e) => setManualCmd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendManualCommand()}
                placeholder={'{"type":"COMMAND_LONG"...}'}
                style={{
                  flex: 1,
                  padding: '3px 6px',
                  backgroundColor: '#070b14',
                  border: '1px solid #1e2d40',
                  borderRadius: 3,
                  color: '#f0f4f8',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                }}
              />
              <button
                type="button"
                onClick={sendManualCommand}
                style={{
                  padding: '3px 8px',
                  borderRadius: 3,
                  border: '1px solid #3b82f6',
                  backgroundColor: '#1e3a5f',
                  color: '#3b82f6',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                GÖNDER
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
