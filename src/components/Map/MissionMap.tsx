import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useMissionStore } from '../../store/missionStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import { createDroneIcon, createGhostIcon, createWaypointIcon } from './mapIcons';
import { DetectionOverlay } from './DetectionOverlay';

const DroneLayer: React.FC = () => {
  const map = useMap();

  const lat = useTelemetryStore((s) => s.lat);
  const lon = useTelemetryStore((s) => s.lon);
  const heading = useTelemetryStore((s) => s.heading);
  const armed = useTelemetryStore((s) => s.armed);
  const groundSpeedMs = useTelemetryStore((s) => s.groundSpeedMs);

  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const trailPoints = useRef<L.LatLng[]>([]);
  const MAX_TRAIL = 100;

  const ghostRef = useRef<L.Marker | null>(null);
  const ghostLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    markerRef.current = L.marker([lat, lon], { icon: createDroneIcon(heading, armed) }).addTo(map);

    trailRef.current = L.polyline([], {
      color: '#3b82f6',
      weight: 1.5,
      opacity: 0.4,
      dashArray: '4 4',
    }).addTo(map);

    ghostRef.current = L.marker([lat, lon], { icon: createGhostIcon(heading) }).addTo(map);
    ghostLineRef.current = L.polyline([], {
      color: '#9ca3af',
      weight: 1,
      opacity: 0.3,
      dashArray: '3 5',
    }).addTo(map);

    return () => {
      markerRef.current?.remove();
      trailRef.current?.remove();
      ghostRef.current?.remove();
      ghostLineRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!markerRef.current || !trailRef.current) return;

    const pos = new L.LatLng(lat, lon);
    markerRef.current.setLatLng(pos);
    markerRef.current.setIcon(createDroneIcon(heading, armed));

    trailPoints.current.push(pos);
    if (trailPoints.current.length > MAX_TRAIL) trailPoints.current.shift();
    trailRef.current.setLatLngs(trailPoints.current);

    const PREDICT_SECONDS = 5;
    const headingRad = heading * (Math.PI / 180);
    const distanceM = groundSpeedMs * PREDICT_SECONDS;
    const dLat = (distanceM * Math.cos(headingRad)) / 111320;
    const dLon =
      (distanceM * Math.sin(headingRad)) / (111320 * Math.cos((lat * Math.PI) / 180));
    const ghostPos = new L.LatLng(lat + dLat, lon + dLon);

    ghostRef.current?.setLatLng(ghostPos);
    ghostRef.current?.setIcon(createGhostIcon(heading));
    ghostLineRef.current?.setLatLngs([pos, ghostPos]);
  }, [lat, lon, heading, armed, groundSpeedMs]);

  return null;
};

const WaypointLayer: React.FC = () => {
  const map = useMap();
  const activeRunway = useMissionStore((s) => s.activeRunway);
  const rwy1 = useMissionStore((s) => s.rwy1);
  const rwy2 = useMissionStore((s) => s.rwy2);
  const selectWaypoint = useMissionStore((s) => s.selectWaypoint);
  const updateWaypoint = useMissionStore((s) => s.updateWaypoint);

  const activeSet = activeRunway === 'RWY1' ? rwy1 : rwy2;
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const pathRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    circlesRef.current.forEach((c) => c.remove());
    pathRef.current?.remove();

    const waypoints = activeSet.waypoints;
    const pathCoords = waypoints.map((wp) => [wp.lat, wp.lon] as L.LatLngTuple);

    if (pathCoords.length > 1) {
      pathRef.current = L.polyline([...pathCoords, pathCoords[0]], {
        color: '#3b82f6',
        weight: 1,
        opacity: 0.3,
        dashArray: '6 4',
      }).addTo(map);
    }

    circlesRef.current = waypoints.map((wp) =>
      L.circle([wp.lat, wp.lon], {
        radius: wp.acceptanceRadiusM,
        color: '#3b82f6',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.05,
        dashArray: '3 5',
      }).addTo(map)
    );

    markersRef.current = waypoints.map((wp, i) => {
      const marker = L.marker([wp.lat, wp.lon], {
        icon: createWaypointIcon(wp.index, wp.status, wp.type),
        draggable: true,
      })
        .addTo(map)
        .on('click', () => {
          selectWaypoint(wp.id);
          map.panTo([wp.lat, wp.lon], { animate: true, duration: 0.5 } as any);
        })
        .on('drag', () => {
          const ll = marker.getLatLng();
          circlesRef.current[i]?.setLatLng(ll);
        })
        .on('dragend', () => {
          const ll = marker.getLatLng();
          updateWaypoint(wp.id, { lat: ll.lat, lon: ll.lng });
        });

      marker.bindTooltip(`WP${wp.index} · ${wp.altitudeFt}ft AGL`, {
        className: 'waypoint-tooltip',
        permanent: false,
      });

      return marker;
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      circlesRef.current.forEach((c) => c.remove());
      pathRef.current?.remove();
    };
  }, [map, activeSet, selectWaypoint, updateWaypoint]);

  return null;
};

const SearchGridLayer: React.FC = () => {
  const searchBoundary = useMissionStore((s) => s.searchBoundary);
  const boundaryPoints = useMemo(
    () => searchBoundary.points.map((p) => [p.lat, p.lon] as L.LatLngTuple),
    [searchBoundary.points]
  );

  return (
    <>
      <Polygon
        positions={boundaryPoints}
        pathOptions={{
          color: '#f97316',
          weight: 2,
          dashArray: '8 6',
          opacity: 0.8,
          fillColor: '#f97316',
          fillOpacity: 0.08,
        }}
      />

      {searchBoundary.scanLines?.map((line, i) => (
        <Polyline
          key={i}
          positions={[
            [line.start.lat, line.start.lon],
            [line.end.lat, line.end.lon],
          ]}
          pathOptions={{
            color: '#f97316',
            weight: 0.8,
            opacity: 0.25,
          }}
        />
      ))}
    </>
  );
};

const FlightBoundaryLayer: React.FC = () => {
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
        fillOpacity: 0.05,
      }}
    />
  );
};

const MapZoomControls: React.FC = () => {
  const map = useMap();

  return (
    <div className="flex flex-col gap-1">
      {[
        { label: '+', action: () => map.zoomIn() },
        { label: '−', action: () => map.zoomOut() },
        { label: '⌖', action: () => map.setView([36.0544, -95.9204], 14) },
      ].map(({ label, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-8 h-8 text-sm font-bold rounded flex items-center justify-center"
          style={{
            backgroundColor: '#0d1321e0',
            color: '#8ba3be',
            border: '1px solid #1e2d40',
            fontFamily: "'Rajdhani', monospace",
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const MapOverlayUI: React.FC = () => {
  const activeRunway = useMissionStore((s) => s.activeRunway);
  const setActiveRunway = useMissionStore((s) => s.setActiveRunway);

  return (
    <>
      <div className="absolute top-3 left-3 z-50 flex gap-1" style={{ zIndex: 1000 }}>
        {(['RWY1', 'RWY2'] as const).map((rwy) => (
          <button
            key={rwy}
            onClick={() => setActiveRunway(rwy)}
            className="px-3 py-1.5 text-xs font-bold rounded transition-all"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.05em',
              backgroundColor: activeRunway === rwy ? '#3b82f6' : '#0d1321e0',
              color: activeRunway === rwy ? '#fff' : '#8ba3be',
              border: `1px solid ${activeRunway === rwy ? '#3b82f6' : '#1e2d40'}`,
            }}
          >
            {rwy}
            {rwy === 'RWY2' && <span className="ml-1 text-xs opacity-70">VTOL</span>}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-50 flex flex-col gap-1" style={{ zIndex: 1000 }}>
        <MapZoomControls />
      </div>
    </>
  );
};

export const MissionMap: React.FC = () => {
  const centerLat = 36.0544;
  const centerLon = -95.9204;

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400 }}>
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          maxZoom={18}
        />

        <FlightBoundaryLayer />
        <SearchGridLayer />
        <WaypointLayer />
        <DetectionOverlay />
        <DroneLayer />

        {/* MapContainer context'inde olmalı (useMap) */}
        <MapOverlayUI />
      </MapContainer>
    </div>
  );
};

