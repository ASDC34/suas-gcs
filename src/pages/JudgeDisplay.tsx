import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMissionStore } from '../store/missionStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useConnectionModeStore } from '../store/connectionModeStore';
import { useTelemetrySimulator } from '../hooks/useTelemetrySimulator';
import { useMAVLinkConnection } from '../hooks/useMAVLinkConnection';
import { createDroneIcon } from '../components/Map/mapIcons';
import { ConnectionSelector } from '../components/Controls/ConnectionSelector';

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
  const mode = useConnectionModeStore((s) => s.mode);

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
          background: '#0d1321f0',
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
            kaynak: {mode === 'SIMULATOR' ? 'simülasyon' : 'MAVLink WebSocket'}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Hakim görünümü — harita + büyük knot / ft AGL okuyucuları (Rule 3.0.6). */
export default function JudgeDisplay() {
  const mode = useConnectionModeStore((s) => s.mode);
  const { resetSimulation } = useTelemetrySimulator(mode === 'SIMULATOR');
  useMAVLinkConnection(mode);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070b14]">
      <header
        className="pointer-events-none absolute left-4 top-4 z-[1002] flex items-center gap-3"
      >
        <div
          className="pointer-events-auto hud-panel px-4 py-2"
          style={{ fontFamily: "'Orbitron', monospace", color: '#3b82f6' }}
        >
          V-TECH Hakim Ekranı
        </div>
        <div
          className="pointer-events-auto text-[10px] hud-mono uppercase text-hud-dim px-3 py-1 rounded border border-[#1e2d40] bg-[#0d1321e8]"
          style={{
            opacity: mode === 'MAVLINK' ? 0.95 : 0.85,
          }}
        >
          {mode === 'MAVLINK' ? 'CANLI MAVLink' : 'SİMÜLATÖR'}
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
      <JudgeHud />
      <div className="absolute bottom-3 left-3 z-[1002] w-[216px] max-w-[calc(100vw-1.5rem)]">
        <ConnectionSelector resetSimulation={resetSimulation} />
      </div>
      <footer
        className="absolute bottom-3 right-3 z-[1002] max-w-[min(50%,260px)] text-right text-[10px] leading-snug text-hud-dim"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Rule 3.0.6 · Skyway Range · Knot / ft AGL
      </footer>
    </div>
  );
}
