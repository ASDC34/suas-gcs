import React, { useEffect, useRef, useState } from 'react';
import { Satellite, Wifi, WifiOff } from 'lucide-react';
import { BatteryAlert, useTelemetryStore } from '../../store/telemetryStore';

function useFlash(value: number): boolean {
  const [flashing, setFlashing] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 150);
      prevValue.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return flashing;
}

/** 12S Li-ion ~50.4V nominal; paket başına ~3.5V kritik → ~42V */
const BATTERY_CRITICAL_VOLTAGE_V = 42;

const GroundSpeedReadout: React.FC = React.memo(() => {
  const speed = useTelemetryStore((s) => s.groundSpeedKnots);
  const groundSpeedMs = useTelemetryStore((s) => s.groundSpeedMs);
  const inFlight = useTelemetryStore((s) => s.inFlight);
  const batteryVoltage = useTelemetryStore((s) => s.batteryVoltage);
  const displaySpeed = speed.toFixed(1);
  const isFlashing = useFlash(Math.round(speed * 10));
  const isAnormal = inFlight && (speed < 2 || speed > 30);
  const lowBatteryVoltage = batteryVoltage < BATTERY_CRITICAL_VOLTAGE_V;

  return (
    <div
      className={`
        hud-panel p-3 flex flex-col gap-1
        ${lowBatteryVoltage ? 'animate-blink-danger' : isAnormal ? 'animate-blink-warn' : ''}
        ${isFlashing ? 'value-flash' : ''}
      `}
    >
      <div
        className="text-hud-secondary text-xs font-semibold tracking-widest uppercase"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Ground Speed
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="hud-number text-hud-primary"
          style={{
            fontSize: 56,
            color: isAnormal ? '#f59e0b' : '#f0f4f8',
            transition: 'color 0.2s',
          }}
        >
          {displaySpeed}
        </span>
        <span
          className="text-hud-secondary font-semibold"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18 }}
        >
          KTS
        </span>
      </div>

      <div className="text-hud-dim text-xs hud-mono">{groundSpeedMs.toFixed(1)} m/s</div>

      {lowBatteryVoltage && (
        <div
          className="text-red-400 text-xs font-bold animate-pulse"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {`⚠ BUS < ${BATTERY_CRITICAL_VOLTAGE_V}V — 12S CRITICAL`}
        </div>
      )}

      {isAnormal && !lowBatteryVoltage && (
        <div
          className="text-yellow-400 text-xs font-bold animate-pulse"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {speed > 30 ? '⚠ OVERSPEED' : '⚠ STALL RISK'}
        </div>
      )}
    </div>
  );
});

function getBatteryColors(alert: BatteryAlert) {
  switch (alert) {
    case 'EMERGENCY':
      return { text: '#ef4444', bar: '#ef4444', bg: '#450a0a', border: '#7f1d1d' };
    case 'CRITICAL':
      return { text: '#f97316', bar: '#f97316', bg: '#431407', border: '#9a3412' };
    case 'WARN':
      return { text: '#f59e0b', bar: '#f59e0b', bg: '#451a03', border: '#92400e' };
    default:
      return { text: '#10b981', bar: '#10b981', bg: '#052e16', border: '#064e3b' };
  }
}

function getBatteryMessage(alert: BatteryAlert): string | null {
  switch (alert) {
    case 'EMERGENCY':
      return '🚨 IMMEDIATE RTL — EMERGENCY';
    case 'CRITICAL':
      return '⚠ CRITICAL — ABORT LAPS NOW';
    case 'WARN':
      return '! WARN — PLAN FINAL LAP';
    default:
      return null;
  }
}

const BatteryReadout: React.FC = React.memo(() => {
  const batteryPercent = useTelemetryStore((s) => s.batteryPercent);
  const batteryVoltage = useTelemetryStore((s) => s.batteryVoltage);
  const batteryCurrent = useTelemetryStore((s) => s.batteryCurrent);
  const batteryAlert = useTelemetryStore((s) => s.batteryAlert);
  const estimatedMins = useTelemetryStore((s) => s.estimatedFlightMinutes);

  const colors = getBatteryColors(batteryAlert);
  const message = getBatteryMessage(batteryAlert);
  const displayPercent = Math.round(batteryPercent);

  const panelClass =
    batteryAlert === 'EMERGENCY'
      ? 'animate-blink-danger'
      : batteryAlert === 'CRITICAL'
        ? 'animate-blink-warn'
        : '';

  return (
    <div
      className={`hud-panel p-3 flex flex-col gap-2 ${panelClass}`}
      style={{
        borderColor: colors.border,
        backgroundColor: batteryAlert !== 'NONE' ? colors.bg : undefined,
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
    >
      <div
        className="text-xs font-semibold tracking-widest uppercase"
        style={{ color: colors.text, fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Battery SOC
      </div>

      <div className="flex items-baseline gap-2">
        <span className="hud-number" style={{ fontSize: 56, color: colors.text, transition: 'color 0.3s' }}>
          {displayPercent}
        </span>
        <span style={{ color: colors.text, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20 }}>%</span>
      </div>

      <div className="w-full rounded-sm overflow-hidden" style={{ height: 6, backgroundColor: '#1e2d40' }}>
        <div
          style={{
            width: `${batteryPercent}%`,
            height: '100%',
            backgroundColor: colors.bar,
            transition: 'width 0.5s ease, background-color 0.3s',
          }}
        />
      </div>

      <div className="flex justify-between text-xs hud-mono" style={{ color: '#4a6080' }}>
        <span>{batteryVoltage.toFixed(1)}V</span>
        <span>{batteryCurrent.toFixed(0)}A</span>
        <span>~{Math.round(estimatedMins)}m left</span>
      </div>

      {message && (
        <div
          className="text-center font-bold py-1 rounded animate-pulse"
          style={{
            color: colors.text,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            letterSpacing: '0.05em',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
});

const ConnectionReadout: React.FC = React.memo(() => {
  const telemetryConnected = useTelemetryStore((s) => s.telemetryConnected);
  const rcConnected = useTelemetryStore((s) => s.rcConnected);
  const gpsFixType = useTelemetryStore((s) => s.gpsFixType);
  const gpsSatellites = useTelemetryStore((s) => s.gpsSatellites);
  const gpsHdop = useTelemetryStore((s) => s.gpsHdop);
  const lastTelemetryMs = useTelemetryStore((s) => s.lastTelemetryMs);
  const flightMode = useTelemetryStore((s) => s.flightMode);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const telemetryAgeMs = now - lastTelemetryMs;
  const telemetryStale = telemetryAgeMs > 2000;
  const linkFault = !telemetryConnected || !rcConnected;

  const gpsColor =
    gpsFixType === 'RTK_FIXED'
      ? '#10b981'
      : gpsFixType === 'RTK_FLOAT'
        ? '#a3e635'
        : gpsFixType === 'FIX_3D'
          ? '#10b981'
          : gpsFixType === 'FIX_2D'
            ? '#f59e0b'
            : '#ef4444';

  const modeColor =
    flightMode === 'AUTO'
      ? '#10b981'
      : flightMode === 'RTL'
        ? '#f59e0b'
        : flightMode === 'STABILIZE'
          ? '#3b82f6'
          : flightMode === 'LAND'
            ? '#f97316'
            : '#8ba3be';

  return (
    <div className={`hud-panel p-3 flex flex-col gap-2 ${linkFault ? 'animate-blink-danger' : ''}`}>
      <div
        className="text-xs font-semibold tracking-widest uppercase text-hud-secondary"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Systems
      </div>

      <div
        className="hud-number text-center py-1 rounded"
        style={{
          fontSize: 28,
          color: modeColor,
          backgroundColor: `${modeColor}18`,
          border: `1px solid ${modeColor}40`,
          letterSpacing: '0.1em',
        }}
      >
        {flightMode}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {telemetryConnected && !telemetryStale ? (
              <Wifi size={14} color="#10b981" />
            ) : (
              <WifiOff size={14} color="#ef4444" className="animate-pulse" />
            )}
            <span className="text-xs" style={{ color: '#8ba3be', fontFamily: "'Barlow Condensed', sans-serif" }}>
              TEL RFD900x
            </span>
          </div>
          <span className="text-xs font-mono" style={{ color: telemetryConnected && !telemetryStale ? '#10b981' : '#ef4444' }}>
            {telemetryConnected && !telemetryStale ? `${Math.round(telemetryAgeMs)}ms` : 'LOST'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rcConnected ? <Wifi size={14} color="#10b981" /> : <WifiOff size={14} color="#ef4444" className="animate-pulse" />}
            <span className="text-xs" style={{ color: '#8ba3be', fontFamily: "'Barlow Condensed', sans-serif" }}>
              RC RFD900x
            </span>
          </div>
          <span className="text-xs" style={{ color: rcConnected ? '#10b981' : '#ef4444' }}>
            {rcConnected ? 'LINK OK' : 'NO LINK'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Satellite size={14} color={gpsColor} />
            <span className="text-xs" style={{ color: '#8ba3be', fontFamily: "'Barlow Condensed', sans-serif" }}>
              GPS Here4
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs hud-mono" style={{ color: '#4a6080' }}>
              {gpsSatellites}sat
            </span>
            <span className="text-xs font-bold" style={{ color: gpsColor, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {gpsFixType.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-hud-dim" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          HDOP
        </span>
        <span
          className="text-xs hud-mono"
          style={{ color: gpsHdop < 1.0 ? '#10b981' : gpsHdop < 2.0 ? '#f59e0b' : '#ef4444' }}
        >
          {gpsHdop.toFixed(2)}
        </span>
      </div>
    </div>
  );
});

export const TelemetryReadout: React.FC = () => {
  return (
    <div className="flex flex-col gap-3">
      <GroundSpeedReadout />
      <BatteryReadout />
      <ConnectionReadout />
    </div>
  );
};

