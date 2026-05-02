import { useEffect, useRef } from 'react';
import type { FlightMode, GpsFixType, TelemetryState } from '../store/telemetryStore';
import { useTelemetryStore } from '../store/telemetryStore';

/** ArduPilot Copter MAVLink CUSTOM_MODE (subset). */
const COPTER_CUSTOM_MODE_MAP: Record<number, FlightMode> = {
  0: 'STABILIZE',
  2: 'STABILIZE',
  3: 'AUTO',
  4: 'GUIDED',
  5: 'LOITER',
  6: 'RTL',
  9: 'LAND',
};

const MAV_ARMED_BIT = 0x80;

function mergeMessage(raw: Record<string, unknown>): Record<string, unknown> | null {
  const msg =
    typeof raw.message === 'object' && raw.message !== null
      ? (raw.message as Record<string, unknown>)
      : typeof raw.msg === 'object' && raw.msg !== null
        ? (raw.msg as Record<string, unknown>)
        : raw;
  if (!msg || typeof msg !== 'object') return null;
  const typeRaw = msg.type ?? msg.msgid ?? msg.msg_type ?? msg.msgType;
  if (typeof typeRaw === 'number') {
    return { msgid: typeRaw, ...msg };
  }
  if (typeof typeRaw !== 'string') return msg as Record<string, unknown>;
  return { type: String(typeRaw).toUpperCase(), ...msg };
}

function mavlinkTypeName(m: Record<string, unknown>): string | null {
  const t = (m.type as string)?.toUpperCase?.() ?? null;
  if (t) return t;
  return null;
}

function mapGpsFix(fix: unknown): GpsFixType {
  switch (typeof fix === 'number' ? fix : parseInt(String(fix), 10)) {
    case 3:
      return 'FIX_3D';
    case 4:
      return 'FIX_3D';
    case 5:
      return 'RTK_FLOAT';
    case 6:
      return 'RTK_FIXED';
    case 2:
      return 'FIX_2D';
    default:
      return 'NO_FIX';
  }
}

function mapHeartbeatToFlightMode(m: Record<string, unknown>): Partial<TelemetryState> {
  const baseMode = Number(m.base_mode ?? m.baseMode ?? 0);
  const customMode = Number(m.custom_mode ?? m.customMode ?? 0);
  const armed = !!(baseMode & MAV_ARMED_BIT);
  const flightMode = COPTER_CUSTOM_MODE_MAP[customMode] ?? 'STABILIZE';
  return { armed, flightMode };
}

function applyMavlinkPayload(
  updateTelemetry: ReturnType<typeof useTelemetryStore.getState>['updateTelemetry'],
  obj: Record<string, unknown>
) {
  const m = mergeMessage(obj);
  if (!m) return;

  const type = mavlinkTypeName(m);
  if (!type) return;

  switch (type) {
    case 'GLOBAL_POSITION_INT': {
      const rawLat = Number(m.lat ?? m.latitude ?? m.lat_deg ?? NaN);
      const rawLon = Number(m.lon ?? m.longitude ?? m.lon_deg ?? NaN);
      const relAltMm =
        typeof m.relative_alt !== 'undefined'
          ? Number(m.relative_alt)
          : typeof m.relativeAlt !== 'undefined'
            ? Number(m.relativeAlt)
            : NaN;

      let latDeg = NaN;
      let lonDeg = NaN;
      if (Math.abs(rawLat) > 90 || Math.abs(rawLon) > 180) {
        latDeg = rawLat / 1e7;
        lonDeg = rawLon / 1e7;
      } else {
        latDeg = rawLat;
        lonDeg = rawLon;
      }

      let altFt: number | undefined;
      let altMslFt: number | undefined;
      if (!Number.isNaN(relAltMm)) {
        altFt = (relAltMm / 1000) * 3.28084;
      }
      const altMslMm = typeof m.alt !== 'undefined' ? Number(m.alt) : NaN;
      if (!Number.isNaN(altMslMm)) {
        altMslFt = (altMslMm / 1000) * 3.28084;
      }

      const coordsOk =
        Number.isFinite(latDeg) &&
        Number.isFinite(lonDeg) &&
        Math.abs(latDeg) <= 90 &&
        Math.abs(lonDeg) <= 180;
      updateTelemetry({
        ...(coordsOk ? { lat: latDeg, lon: lonDeg } : {}),
        ...(altFt !== undefined ? { altitudeAGL: altFt } : {}),
        ...(altMslFt !== undefined ? { altitudeMSL: altMslFt } : {}),
      });
      break;
    }
    case 'VFR_HUD': {
      const gsMs = Number(m.groundspeed ?? m.ground_speed ?? NaN);
      const heading = typeof m.heading !== 'undefined' ? Number(m.heading) : undefined;
      const climb = typeof m.climb !== 'undefined' ? Number(m.climb) : undefined;
      const knots = Number.isFinite(gsMs) ? gsMs * 1.94384 : undefined;
      updateTelemetry({
        ...(Number.isFinite(gsMs) ? { groundSpeedMs: gsMs } : {}),
        ...(knots !== undefined ? { groundSpeedKnots: knots } : {}),
        ...(heading !== undefined && Number.isFinite(heading) ? { heading } : {}),
        ...(climb !== undefined && Number.isFinite(climb) ? { climbRate: climb } : {}),
      });
      break;
    }
    case 'GPS_RAW_INT': {
      const sats =
        typeof m.satellites_visible !== 'undefined'
          ? Number(m.satellites_visible)
          : typeof m.satellitesVisible !== 'undefined'
            ? Number(m.satellitesVisible)
            : undefined;
      const hdopApprox =
        typeof m.eph === 'undefined'
          ? undefined
          : Math.min(99.9, Number(m.eph) / 100);
      updateTelemetry({
        gpsFixType: mapGpsFix(m.fix_type ?? m.fixType),
        ...(sats !== undefined && Number.isFinite(sats)
          ? { gpsSatellites: Math.floor(sats) }
          : {}),
        ...(hdopApprox !== undefined && Number.isFinite(hdopApprox)
          ? { gpsHdop: hdopApprox }
          : {}),
      });
      break;
    }
    case 'HEARTBEAT': {
      updateTelemetry(mapHeartbeatToFlightMode(m));
      break;
    }
    case 'BATTERY_STATUS':
    case 'SYS_STATUS': {
      if (typeof m.battery_remaining !== 'undefined') {
        const pct = Number(m.battery_remaining);
        if (Number.isFinite(pct)) updateTelemetry({ batteryPercent: Math.round(pct) });
      }
      if (typeof m.voltage_battery !== 'undefined') {
        const vb = Number(m.voltage_battery) / 1000;
        if (Number.isFinite(vb)) updateTelemetry({ batteryVoltage: vb });
      }
      if (typeof m.current_battery !== 'undefined') {
        const cur = Number(m.current_battery) / 100;
        if (Number.isFinite(cur)) updateTelemetry({ batteryCurrent: cur });
      }
      break;
    }
    case 'RC_CHANNELS': {
      updateTelemetry({
        rcConnected:
          typeof m.rssi === 'undefined' ? true : Number(m.rssi) > 40,
      });
      break;
    }
    default:
      break;
  }
}

/** WebSocket MAVLink adapter: JSON payloads from a bridge listening on MAVLink. */
export function useMAVLinkConnection(mode: 'SIMULATOR' | 'MAVLINK') {
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (mode !== 'MAVLINK') {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    const url = process.env.REACT_APP_MAVLINK_URL ?? 'ws://localhost:14551';

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      updateTelemetry({
        telemetryConnected: true,
        rfLinkQuality: 90,
      });
    };

    ws.onclose = () => {
      socketRef.current = null;
      updateTelemetry({
        telemetryConnected: false,
        rfLinkQuality: 0,
      });
    };

    ws.onerror = () => {
      updateTelemetry({
        telemetryConnected: false,
        rfLinkQuality: 0,
      });
    };

    ws.onmessage = (ev: MessageEvent) => {
      try {
        let data: unknown;
        if (typeof ev.data === 'string') data = JSON.parse(ev.data);
        else return;
        if (data !== null && typeof data === 'object') {
          applyMavlinkPayload(
            updateTelemetry,
            data as Record<string, unknown>
          );
        }
      } catch {
        /* ignore malformed lines */
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [mode, updateTelemetry]);
}
