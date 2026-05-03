import React, { useEffect, useState } from 'react';
import { CameraSection } from './components/Camera/CameraSection';
import { CompassSection } from './components/Camera/CompassSection';
import { IntentOverlay } from './components/Controls/IntentOverlay';
import { MissionControlPanel } from './components/Controls/MissionControlPanel';
import { RTLButton } from './components/Controls/RTLButton';
import { AltitudeStrip } from './components/HUD/AltitudeStrip';
import { RFSignalBars } from './components/HUD/RFSignalBars';
import { TelemetryReadout } from './components/HUD/TelemetryReadout';
import { MissionMap } from './components/Map/MissionMap';
import { WaypointEditorPanel } from './components/Map/WaypointEditorPanel';
import { LapCounter } from './components/Mission/LapCounter';
import { MissionFlowPanel } from './components/Mission/MissionFlowPanel';
import { MissionTimer } from './components/Mission/MissionTimer';
import { PenaltyTracker } from './components/Mission/PenaltyTracker';
import { PreflightChecklist } from './components/Mission/PreflightChecklist';
import { ScoringPanel } from './components/Mission/ScoringPanel';
import { ConnectionManagerPanel } from './components/Controls/ConnectionManager';
import { DropCalculatorPanel } from './components/Payload/DropCalculatorPanel';
import { ParameterPanel } from './components/Parameters/ParameterPanel';
import { useTelemetrySimulator } from './hooks/useTelemetrySimulator';
import { useConnectionStore } from './store/connectionStore';
import { useControlStore } from './store/controlStore';
import { useTelemetryStore } from './store/telemetryStore';

const FlightModeBadge: React.FC = () => {
  const flightMode = useTelemetryStore((s) => s.flightMode);
  const armed = useTelemetryStore((s) => s.armed);

  const modeColor =
    flightMode === 'AUTO'
      ? '#10b981'
      : flightMode === 'RTL'
        ? '#f59e0b'
        : flightMode === 'STABILIZE'
          ? '#3b82f6'
          : '#8ba3be';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: armed ? '#ef4444' : '#4a6080',
            boxShadow: armed ? '0 0 6px #ef4444' : 'none',
          }}
        />
        <span
          className="text-xs font-bold"
          style={{
            color: armed ? '#ef4444' : '#4a6080',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.05em',
          }}
        >
          {armed ? 'ARMED' : 'DISARMED'}
        </span>
      </div>

      <div
        className="px-3 py-1 rounded text-sm font-bold"
        style={{
          color: modeColor,
          backgroundColor: `${modeColor}18`,
          border: `1px solid ${modeColor}50`,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.08em',
        }}
      >
        {flightMode}
      </div>
    </div>
  );
};

const CoordinateDisplay: React.FC = () => {
  const lat = useTelemetryStore((s) => s.lat);
  const lon = useTelemetryStore((s) => s.lon);

  return (
    <div className="hud-mono text-xs" style={{ color: '#4a6080' }}>
      {lat.toFixed(5)}°N &nbsp; {Math.abs(lon).toFixed(5)}°W
    </div>
  );
};

type MainTab = 'MAP' | 'PARAMS';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('MAP');
  const protocol = useConnectionStore((s) => s.config.protocol);
  const { resetSimulation } = useTelemetrySimulator(protocol === 'SIMULATOR');

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        useControlStore.getState().requestCommand('INITIATE_RTL', () => {
          // eslint-disable-next-line no-console
          console.log('MAVLink: Keyboard RTL trigger');
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#070b14',
        overflow: 'hidden',
      }}
    >
      <IntentOverlay />

      <header
        className="flex items-center gap-4 px-4 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid #1e2d40',
          background: 'linear-gradient(to right, #0d1321, #070b14)',
        }}
      >
        <div className="flex flex-col gap-1 flex-shrink-0" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-3">
            <div
              style={{
                fontFamily: "'Orbitron', monospace",
                color: '#3b82f6',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
            >
              V-TECH
            </div>
            <div
              className="text-hud-dim text-xs"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}
            >
              GCS · SUAS 2026 · Skyway Range, Tulsa OK
            </div>
          </div>
          <FlightModeBadge />
        </div>

        <div className="flex flex-1 items-center justify-center min-w-0">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {([
              { id: 'MAP' as const, label: '🗺 HARİTA' },
              { id: 'PARAMS' as const, label: '⚙ PARAMETRELER' },
            ] satisfies { id: MainTab; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                style={{
                  padding: '4px 14px',
                  borderRadius: 3,
                  border: `1px solid ${activeTab === id ? '#3b82f6' : '#1e2d40'}`,
                  backgroundColor: activeTab === id ? '#1e3a5f' : '#0d1321',
                  color: activeTab === id ? '#3b82f6' : '#4a6080',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              const base =
                `${window.location.origin}${process.env.PUBLIC_URL ?? ''}`.replace(/\/?$/, '');
              window.open(
                `${base}/judge`,
                '_blank',
                'noopener,noreferrer,width=1280,height=800'
              );
            }}
            className="text-xs font-bold px-3 py-1.5 rounded transition-colors"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.08em',
              backgroundColor: '#1e3a5f',
              color: '#e0ecff',
              border: '1px solid #3b82f6',
              cursor: 'pointer',
            }}
          >
            HAKİM EKRANI AÇ
          </button>
          <div className="text-hud-secondary text-sm hud-mono">
            {new Date().toLocaleTimeString('en-US', { hour12: false })} CDT
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <aside
          className="gcs-sidebar"
          style={{
            width: 260,
            minWidth: 260,
            maxWidth: 260,
            overflow: 'hidden',
            borderRight: '1px solid #1e2d40',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 8,
            flexShrink: 0,
            minHeight: 0,
            alignSelf: 'stretch',
          }}
        >
          {/* EN ÜST: Battery SOC (TelemetryReadout) öncesi — her zaman görünür */}
          <div className="flex flex-col gap-2 shrink-0" style={{ minWidth: 0 }}>
            <CameraSection />
            <CompassSection />
          </div>
          <div
            className="gcs-sidebar-inner flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto"
            style={{ minWidth: 0 }}
          >
            <TelemetryReadout />
            <RFSignalBars />
            <MissionTimer />
            <LapCounter />
            <ScoringPanel />
            <DropCalculatorPanel />
            <PreflightChecklist />
            <MissionFlowPanel />
            <MissionControlPanel />
            <PenaltyTracker />
            <ConnectionManagerPanel resetSimulation={resetSimulation} />
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-h-0 p-0 relative overflow-hidden">
          {activeTab === 'MAP' && (
            <>
              <MissionMap />
              <WaypointEditorPanel />
            </>
          )}
          {activeTab === 'PARAMS' && (
            <div className="flex flex-1 min-h-0 p-3" style={{ minHeight: 0 }}>
              <ParameterPanel />
            </div>
          )}
        </div>

        <aside
          className="flex flex-col items-center gap-3 p-3 flex-shrink-0"
          style={{ width: 100, borderLeft: '1px solid #1e2d40' }}
        >
          <AltitudeStrip />
          <div
            className="text-xs text-hud-dim text-center"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}
          >
            AGL ft
          </div>
          <div style={{ flex: 1 }} />
          <RTLButton />
        </aside>
      </main>

      <footer
        className="flex items-center justify-between px-4 py-1.5 flex-shrink-0"
        style={{ borderTop: '1px solid #1e2d40', backgroundColor: '#0d1321' }}
      >
        <div className="flex items-center gap-4">
          <CoordinateDisplay />
        </div>

        <div
          className="text-hud-dim text-xs"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Rule 3.0.6 Compliant · V-Tech SUAS 2026 GCS Rev.5
        </div>
      </footer>
    </div>
  );
}

