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
import { ConnectionHeaderDropdown } from './components/Controls/ConnectionHeaderDropdown';
import { ConnectionManagerPanel } from './components/Controls/ConnectionManager';
import { DropCalculatorPanel } from './components/Payload/DropCalculatorPanel';
import { ParameterPanel } from './components/Parameters/ParameterPanel';
import { useAudioAlerts } from './hooks/useAudioAlerts';
import { useConnectionManager } from './hooks/useConnectionManager';
import { useTelemetrySimulator } from './hooks/useTelemetrySimulator';
import { useConnectionStore } from './store/connectionStore';
import { useControlStore } from './store/controlStore';
import { useTelemetryStore } from './store/telemetryStore';

/** Sol panel üstü: ARM / mod + koordinat, tek satır */
const SidebarStatusStrip: React.FC = () => {
  const flightMode = useTelemetryStore((s) => s.flightMode);
  const armed = useTelemetryStore((s) => s.armed);
  const lat = useTelemetryStore((s) => s.lat);
  const lon = useTelemetryStore((s) => s.lon);

  const modeColor =
    flightMode === 'AUTO'
      ? '#10b981'
      : flightMode === 'RTL'
        ? '#f59e0b'
        : flightMode === 'STABILIZE'
          ? '#3b82f6'
          : '#8ba3be';

  const coordLabel = `${lat.toFixed(5)}°N · ${Math.abs(lon).toFixed(5)}°W`;

  return (
    <div
      className="flex w-full min-w-0 items-center justify-between gap-2 rounded px-1.5 py-1"
      style={{
        border: '1px solid #1e2d40',
        backgroundColor: '#0a101a',
      }}
    >
      <div className="flex min-w-0 flex-shrink-0 items-center gap-1">
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: armed ? '#ef4444' : '#4a6080',
            boxShadow: armed ? '0 0 4px #ef4444' : 'none',
          }}
        />
        <span
          className="font-bold leading-none"
          style={{
            color: armed ? '#ef4444' : '#4a6080',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.04em',
            fontSize: 10,
          }}
        >
          {armed ? 'ARMED' : 'DISARMED'}
        </span>
        <span
          className="rounded px-1 py-0 font-bold leading-none"
          style={{
            color: modeColor,
            backgroundColor: `${modeColor}18`,
            border: `1px solid ${modeColor}40`,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.06em',
            fontSize: 10,
          }}
        >
          {flightMode}
        </span>
      </div>
      <div
        className="hud-mono min-w-0 flex-1 truncate text-right leading-none"
        style={{ color: '#5a7090', fontSize: 10 }}
        title={coordLabel}
      >
        {coordLabel}
      </div>
    </div>
  );
};

type MainTab = 'MAP' | 'PARAMS';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('MAP');
  const config = useConnectionStore((s) => s.config);
  const protocol = config.protocol;
  const liveLinkActive = useConnectionStore((s) => s.liveLinkActive);
  const connection = useConnectionManager(config);
  const { resetSimulation } = useTelemetrySimulator(
    protocol === 'SIMULATOR' && !liveLinkActive
  );
  useAudioAlerts(true);

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
        className="relative z-[60] flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 overflow-visible px-3 py-2"
        style={{
          borderBottom: '1px solid #1e2d40',
          background: 'linear-gradient(to right, #0d1321, #070b14)',
        }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-shrink-0" style={{ minWidth: 0, maxWidth: 'min(420px, 100%)' }}>
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

        <div className="flex flex-1 items-center justify-center min-w-[200px] basis-[280px]">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {([
              { id: 'MAP' as const, label: '🗺 HARİTA' },
              { id: 'PARAMS' as const, label: '⚙ PARAMETRELER' },
            ] satisfies { id: MainTab; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'MAP') setActiveTab('MAP');
                  else setActiveTab((t) => (t === 'PARAMS' ? 'MAP' : 'PARAMS'));
                }}
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

        <div
          className="ml-auto flex min-w-0 flex-shrink-0 flex-wrap items-center justify-end gap-2"
          style={{ minWidth: 0 }}
        >
          <ConnectionHeaderDropdown connection={connection} />
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
            className="font-bold rounded transition-colors"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.06em',
              backgroundColor: '#1e3a5f',
              color: '#e0ecff',
              border: '1px solid #3b82f6',
              cursor: 'pointer',
              fontSize: 11,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            HAKİM EKRANI AÇ
          </button>
          <div
            className="text-hud-secondary hud-mono"
            style={{ fontSize: 11, whiteSpace: 'nowrap', lineHeight: 1.2 }}
          >
            {new Date().toLocaleTimeString('en-US', { hour12: false })} CDT
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <aside
          className="gcs-sidebar gcs-sidebar-inner flex min-h-0 min-w-0 flex-shrink-0 flex-col gap-2 overflow-x-hidden overflow-y-auto"
          style={{
            width: 'clamp(200px, 24vw, 300px)',
            minWidth: 200,
            WebkitOverflowScrolling: 'touch',
            borderRight: '1px solid #1e2d40',
            padding: 8,
            alignSelf: 'stretch',
          }}
        >
          <div className="flex min-w-0 flex-col gap-2" style={{ minWidth: 0 }}>
            <SidebarStatusStrip />
            <CameraSection />
            <CompassSection />
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
            <ConnectionManagerPanel
              resetSimulation={resetSimulation}
              connection={connection}
            />
          </div>
        </aside>

        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0"
          style={{ flex: '1 1 0%', minWidth: 0 }}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-row" style={{ flex: '1 1 0%' }}>
            {activeTab === 'PARAMS' && (
              <div
                className="flex min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-[#1e2d40] bg-[#070b14]"
                style={{
                  width: 'clamp(280px, 28vw, 400px)',
                  minWidth: 260,
                  flexShrink: 0,
                }}
              >
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
                  <ParameterPanel />
                </div>
              </div>
            )}
            <div
              className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              style={{ flex: '1 1 0%', minWidth: 0 }}
            >
              <MissionMap />
              <WaypointEditorPanel />
            </div>
          </div>
        </div>

        <aside
          className="flex flex-shrink-0 flex-col items-center gap-2 p-2"
          style={{
            width: 'clamp(88px, 8vw, 120px)',
            minWidth: 88,
            flexShrink: 0,
            borderLeft: '1px solid #1e2d40',
          }}
        >
          <AltitudeStrip />
          <div
            className="text-hud-dim text-center"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.04em',
              fontSize: 9,
            }}
          >
            AGL ft
          </div>
          <div style={{ flex: 1 }} />
          <RTLButton />
        </aside>
      </main>

      <footer
        className="flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 flex-shrink-0"
        style={{ borderTop: '1px solid #1e2d40', backgroundColor: '#0d1321' }}
      >
        <div
          className="text-hud-dim text-xs min-w-0 text-center"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Rule 3.0.6 Compliant · V-Tech SUAS 2026 GCS Rev.5
        </div>
      </footer>
    </div>
  );
}

