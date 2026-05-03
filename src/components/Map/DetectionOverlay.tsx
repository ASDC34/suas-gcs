import React, { useCallback, useEffect, useRef } from 'react';
import { Circle, Marker, Popup } from 'react-leaflet';
import { useMissionStore, type LatLon } from '../../store/missionStore';
import { createTargetIcon } from './mapIcons';

const WS_URL = 'ws://localhost:8765';
/** 50 ft ≈ 15.24 m; SUAS hedef yarıçapı */
const DETECTION_RADIUS_M = 15.2;

function pickLatLon(obj: unknown): LatLon | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const lat = (o.lat ?? o.latitude) as unknown;
  const lon = (o.lon ?? o.longitude ?? o.lng) as unknown;
  if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon };
  return null;
}

/**
 * Jetson YOLOv8 / tespit köprüsünden gelen JSON'u { tent, mannequin } çözümlerine çevirir.
 * Örnekler: `{ "TENT": {lat,lon}, "MANNEQUIN": {...} }`, `{ "class":"TENT", "lat", "lon" }`,
 * `{ "detections":[{ "label":"MANNEQUIN", ...}] }`
 */
function parseDetections(raw: unknown): { tent?: LatLon | null; mannequin?: LatLon | null } {
  const out: { tent?: LatLon | null; mannequin?: LatLon | null } = {};

  if (!raw || typeof raw !== 'object') return out;
  const root = raw as Record<string, unknown>;

  const assign = (kind: string, pos: LatLon | null) => {
    const k = kind.toUpperCase();
    if (k.includes('TENT') || k === 'ÇADIR') out.tent = pos;
    else if (k.includes('MANN') || k.includes('MANNEQUIN') || k === 'MANİKEN' || k === 'MANIKEN')
      out.mannequin = pos;
  };

  if (root.TENT !== undefined) out.tent = root.TENT === null ? null : pickLatLon(root.TENT);
  if (root.MANNEQUIN !== undefined)
    out.mannequin = root.MANNEQUIN === null ? null : pickLatLon(root.MANNEQUIN);
  if (root.mannequin !== undefined && out.mannequin === undefined)
    out.mannequin = root.mannequin === null ? null : pickLatLon(root.mannequin);
  if (root.tent !== undefined && out.tent === undefined)
    out.tent = root.tent === null ? null : pickLatLon(root.tent);

  const cls = root.class ?? root.label ?? root.type;
  if (typeof cls === 'string' && (root.lat !== undefined || root.latitude !== undefined)) {
    const pos = pickLatLon(root);
    if (pos) assign(cls, pos);
  }

  const arr = root.detections ?? root.targets ?? root.objects;
  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      const label = String(it.class ?? it.label ?? it.type ?? it.name ?? '');
      const pos = pickLatLon(it);
      if (pos) assign(label, pos);
    }
  }

  return out;
}

export const DetectionOverlay: React.FC = () => {
  const tent = useMissionStore((s) => s.detectedTentLocation);
  const mannequin = useMissionStore((s) => s.detectedMannequinLocation);
  const setDetectedTargets = useMissionStore((s) => s.setDetectedTargets);
  const reconnectRef = useRef(0);

  const applyMessage = useCallback(
    (text: string) => {
      let data: unknown;
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        return;
      }
      const parsed = parseDetections(data);
      if (!('tent' in parsed) && !('mannequin' in parsed)) return;
      setDetectedTargets(
        'tent' in parsed ? parsed.tent! : undefined,
        'mannequin' in parsed ? parsed.mannequin! : undefined
      );
    },
    [setDetectedTargets]
  );

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        timer = setTimeout(connect, 3000);
        return;
      }

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') applyMessage(ev.data);
      };

      ws.onerror = () => {
        /* sessiz; onclose yeniden dener */
      };

      ws.onclose = () => {
        if (closed) return;
        reconnectRef.current += 1;
        timer = setTimeout(connect, Math.min(15000, 2000 + reconnectRef.current * 500));
      };
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [applyMessage]);

  const circleOpts = {
    color: '#f59e0b',
    weight: 2,
    opacity: 0.85,
    fillColor: '#f59e0b',
    fillOpacity: 0.06,
    dashArray: '6 4' as const,
  };

  const circleOptsM = {
    color: '#a78bfa',
    weight: 2,
    opacity: 0.85,
    fillColor: '#a78bfa',
    fillOpacity: 0.06,
    dashArray: '6 4' as const,
  };

  return (
    <>
      {tent && (
        <>
          <Circle center={[tent.lat, tent.lon]} radius={DETECTION_RADIUS_M} pathOptions={circleOpts} />
          <Marker position={[tent.lat, tent.lon]} icon={createTargetIcon('TENT')}>
            <Popup>TENT · YOLOv8 · 50 ft</Popup>
          </Marker>
        </>
      )}
      {mannequin && (
        <>
          <Circle
            center={[mannequin.lat, mannequin.lon]}
            radius={DETECTION_RADIUS_M}
            pathOptions={circleOptsM}
          />
          <Marker position={[mannequin.lat, mannequin.lon]} icon={createTargetIcon('MANNEQUIN')}>
            <Popup>MANNEQUIN · YOLOv8 · 50 ft</Popup>
          </Marker>
        </>
      )}
    </>
  );
};
