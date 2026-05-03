import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMissionStore } from '../store/missionStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useConnectionManager } from '../hooks/useConnectionManager';
import { useTelemetrySimulator } from '../hooks/useTelemetrySimulator';
import { createDroneIcon } from '../components/Map/mapIcons';
import { ConnectionManagerPanel } from '../components/Controls/ConnectionManager';
import { useConnectionStore } from '../store/connectionStore';

type JudgeDisplayMode = 'FULL' | 'MAP' | 'TELEMETRY';

const JudgeDroneMarker: React.FC = () => {
  const map = useMap();
  const lat = useTelemetryStore((s) => s.lat);
  const lon = useTelemetryStore((s) => s.lon);
  const heading = useTelemetryStore((s) => s.heading);
  const armed = useTelemetryStore((s) => s.armed);

  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    markerRef.current = L.marker([lat, lon], {
      icon: createDroneIcon(heading, armed),
    }).addTo(map);
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([lat, lon]);
    markerRef.current.setIcon(createDroneIcon(heading, armed));
  }, [lat, lon, heading, armed]);

  return null;
};

const FlightBoundaryJudge: React.FC = () => {
  const flightBoundary = useMissionStore((s) => s.flightBoundary);
  const lat = useTelemetryStore((s) => s.lat);
  const lon = useTelemetryStore((s) => s.lon);

  const boundaryPoints = useMemo(
    () => flightBoundary.points.map((p) => [p.lat, p.lon] as L.LatLngTuple),
    [flightBoundary.points]
  );

  const lats = flightBoundary.points.map((p) => p.lat);
  const lons = flightBoundary.points.map((p) => p.lon);
  const outOfBounds =
    lat < Math.min(...lats) ||
    lat > Math.max(...lats) ||
    lon < Math.min(...lons) ||
    lon > Math.max(...lons);

  return (
    <Polygon
      positions={boundaryPoints}
      pathOptions={{
        color: outOfBounds ? '#ef4444' : '#6366f1',
        weight: outOfBounds ? 4 : 2,
        opacity: 1,
        fillColor: outOfBounds ? '#ef4444' : '#6366f1',
        fillOpacity: 0.08,
      }}
    />
  );
};

/** Rule 3.0.6: ground speed knots, AGL ft, position, flight boundary overlay. */
const JudgeHud: React.FC = () => {
  const lat = useTelemetryStore((s) => s.lat);
  const lon = useTelemetryStore((s) => s.lon);
  const knots = useTelemetryStore((s) => s.groundSpeedKnots);
  const aglFt = useTelemetryStore((s) => s.altitudeAGL);
  const protocol = useConnectionStore((s) => s.config.protocol);

  const telemetrySourceLabel =
    protocol === 'SIMULATOR'
      ? 'simülasyon'
      : protocol === 'MAVLINK'
        ? 'MAVLink WebSocket'
        : 'MAVROS / rosbridge';

  return (
    <div
      className="pointer-events-none absolute top-14 right-4 bottom-24 z-[1001] flex w-[280px] max-w-[40vw] flex-col justify-between gap-4"
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
    >
      <div />
      <div
        className="hud-panel p-6 flex flex-col gap-4 shrink-0"
        style={{
          pointerEvents: 'auto',
          backgroundColor: '#0d1321f0',
        }}
      >
        <div
          className="text-center text-[11px] font-bold tracking-[0.2em] text-hud-dim uppercase"
          style={{ lineHeight: 1.3 }}
        >
          Yer hızı
        </div>
        <div className="flex items-baseline justify-center gap-1">
          <span
            className="hud-number text-hud-primary tabular-nums"
            style={{ fontSize: 72 }}
          >
            {knots.toFixed(1)}
          </span>
          <span className="text-2xl text-hud-secondary">kt</span>
        </div>
        <div
          className="text-center text-[11px] font-bold tracking-[0.2em] text-hud-dim uppercase mt-4"
          style={{ lineHeight: 1.3 }}
        >
          AGL (ft)
        </div>
        <div className="flex justify-center">
          <span
            className="hud-number text-hud-primary tabular-nums"
            style={{ fontSize: 64 }}
          >
            {Math.round(aglFt)}
          </span>
        </div>
        <div
          className="mt-4 border-t pt-4 border-[#1e2d40] text-[12px] hud-mono leading-relaxed space-y-1"
          style={{ color: '#8ba3be' }}
        >
          <div>
            Φ {lat.toFixed(5)}°N / λ {Math.abs(lon).toFixed(5)}°W
          </div>
          <div className="text-[10px] text-hud-dim capitalize">
            kaynak: {telemetrySourceLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

const JudgeTelemetryOnly: React.FC = () => {
  const knots = useTelemetryStore((s) => s.groundSpeedKnots);
  const aglFt = useTelemetryStore((s) => s.altitudeAGL);

  return (
    <div
      className="absolute inset-0 z-[1004] flex flex-col items-center justify-center gap-10 bg-[#070b14]"
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
    >
      <div className="flex flex-col items-center gap-2">
        <span
          className="hud-number text-hud-primary tabular-nums leading-none"
          style={{ fontSize: 160 }}
        >
          {knots.toFixed(1)}
        </span>
        <span className="text-2xl font-bold tracking-[0.2em] text-hud-secondary">KTS</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span
          className="hud-number text-hud-primary tabular-nums leading-none"
          style={{ fontSize: 160 }}
        >
          {Math.round(aglFt)}
        </span>
        <span className="text-2xl font-bold tracking-[0.2em] text-hud-secondary">FT AGL</span>
      </div>
    </div>
  );
};

/** Hakim görünümü — TAM / HARİTA / TELEMETRİ modları (Rule 3.0.6). */
export default function JudgeDisplay() {
  const [mode, setMode] = useState<JudgeDisplayMode>('FULL');
  const config = useConnectionStore((s) => s.config);
  const protocol = config.protocol;
  const liveLinkActive = useConnectionStore((s) => s.liveLinkActive);
  const connection = useConnectionManager(config);
  const { resetSimulation } = useTelemetrySimulator(
    protocol === 'SIMULATOR' && !liveLinkActive
  );

  const modeButtons: { id: JudgeDisplayMode; label: string }[] = [
    { id: 'FULL', label: 'TAM' },
    { id: 'MAP', label: 'HARİTA' },
    { id: 'TELEMETRY', label: 'TELEMETRİ' },
  ];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070b14]">
      <header className="pointer-events-none absolute left-4 right-4 top-4 z-[1005] flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="pointer-events-auto hud-panel px-4 py-2"
            style={{ fontFamily: "'Orbitron', monospace", color: '#3b82f6' }}
          >
            V-TECH Hakim Ekranı
          </div>
          <div
            className="pointer-events-auto text-[10px] hud-mono uppercase text-hud-dim px-3 py-1 rounded border border-[#1e2d40] bg-[#0d1321e8]"
            style={{
              opacity: protocol === 'SIMULATOR' ? 0.85 : 0.95,
            }}
          >
            {protocol === 'MAVLINK'
              ? 'CANLI MAVLink'
              : protocol === 'MAVROS'
                ? 'CANLI MAVROS'
                : 'SİMÜLATÖR'}
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {modeButtons.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className="rounded border px-3 py-1.5 text-xs font-bold tracking-widest transition-colors"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                borderColor: mode === id ? '#3b82f6' : '#1e2d40',
                backgroundColor: mode === id ? '#1e3a5f' : '#0d1321e8',
                color: mode === id ? '#e0ecff' : '#8ba3be',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[36.0544, -95.9204]}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OSM · SUAS hakim görünümü"
            maxZoom={18}
          />
          <FlightBoundaryJudge />
          <JudgeDroneMarker />
        </MapContainer>
      </div>

      {mode === 'FULL' && <JudgeHud />}
      {mode === 'TELEMETRY' && <JudgeTelemetryOnly />}

      {mode === 'FULL' && (
        <>
          <div className="pointer-events-auto absolute bottom-3 left-3 z-[1002] w-[278px] max-w-[calc(100vw-1.5rem)]">
            <ConnectionManagerPanel resetSimulation={resetSimulation} connection={connection} />
          </div>
          <footer
            className="pointer-events-none absolute bottom-3 right-3 z-[1002] max-w-[min(50%,260px)] text-right text-[10px] leading-snug text-hud-dim"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Rule 3.0.6 · Skyway Range · Knot / ft AGL
          </footer>
        </>
      )}
    </div>
  );
}
