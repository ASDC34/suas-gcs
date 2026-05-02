import React, { useEffect } from 'react';
import { useInteropStore } from '../../store/interopStore';

export const HeartbeatLight: React.FC = () => {
  const status = useInteropStore((s) => s.status);
  const latencyMs = useInteropStore((s) => s.latencyMs);
  const lastPingMs = useInteropStore((s) => s.lastPingMs);
  const errorMessage = useInteropStore((s) => s.errorMessage);
  const retryCount = useInteropStore((s) => s.retryCount);
  const ping = useInteropStore((s) => s.ping);
  const reconnect = useInteropStore((s) => s.reconnect);
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  useEffect(() => {
    ping();
    const interval = setInterval(ping, 5000);
    return () => clearInterval(interval);
  }, [ping]);

  const [age, setAge] = React.useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setAge(lastPingMs > 0 ? Math.round((Date.now() - lastPingMs) / 1000) : 0);
    }, 500);
    return () => clearInterval(t);
  }, [lastPingMs]);

  const isConnected = status === 'CONNECTED';
  const isError = status === 'ERROR' || status === 'DISCONNECTED';

  const handleReconnect = async () => {
    setIsReconnecting(true);
    await reconnect();
    setIsReconnecting(false);
  };

  return (
    <div className="hud-panel p-2 flex flex-col gap-1.5" style={{ minWidth: 130 }}>
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#8ba3be', fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Interop
        </span>

        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: isConnected ? '#10b981' : isError ? '#ef4444' : '#f59e0b',
            boxShadow: isConnected
              ? '0 0 8px rgba(16, 185, 129, 0.8)'
              : isError
                ? '0 0 8px rgba(239, 68, 68, 0.8)'
                : '0 0 8px rgba(245, 158, 11, 0.8)',
            animation: isError
              ? 'blink-danger 0.6s ease-in-out infinite'
              : isConnected
                ? 'glow-safe 2.5s ease-in-out infinite'
                : 'none',
          }}
        />
      </div>

      {isConnected && (
        <div className="flex justify-between text-xs hud-mono" style={{ color: '#4a6080' }}>
          <span>{age}s ago</span>
          <span>{latencyMs}ms</span>
        </div>
      )}

      {isError && (
        <>
          <div className="text-xs" style={{ color: '#ef4444', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {status}
          </div>
          {errorMessage && (
            <div className="text-xs hud-mono" style={{ color: '#4a6080', fontSize: 10 }}>
              {errorMessage.slice(0, 40)}
            </div>
          )}

          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="text-xs px-2 py-1 rounded font-bold transition-all"
            style={{
              backgroundColor: isReconnecting ? '#1e2d40' : '#450a0a',
              color: isReconnecting ? '#4a6080' : '#ef4444',
              border: '1px solid #7f1d1d',
              cursor: isReconnecting ? 'not-allowed' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.05em',
            }}
          >
            {isReconnecting ? `↻ ${retryCount}/3` : '↻ RECONNECT'}
          </button>
        </>
      )}

      <div
        className="text-xs"
        style={{
          color: '#4a6080',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          lineHeight: '1.3',
        }}
      >
        Safety fns: RF only
        <br />
        No internet dep.
      </div>
    </div>
  );
};

