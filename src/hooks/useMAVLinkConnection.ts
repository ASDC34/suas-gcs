import type { FlightMode, GpsFixType, TelemetryState } from '../store/telemetryStore';

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

type TelemetryUpdate = TelemetryState['updateTelemetry'];

/** JSON MAVLink payloads from a MAVProxy / websocket bridge → telemetry store. */
export function applyMavlinkJsonToTelemetry(
  updateTelemetry: TelemetryUpdate,
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
      const hdgCs = typeof m.hdg !== 'undefined' ? Number(m.hdg) : NaN;
      const headingDeg =
        Number.isFinite(hdgCs) && hdgCs >= 0 && hdgCs <= 36000 ? hdgCs / 100 : undefined;

      updateTelemetry({
        ...(coordsOk ? { lat: latDeg, lon: lonDeg } : {}),
        ...(altFt !== undefined ? { altitudeAGL: altFt } : {}),
        ...(altMslFt !== undefined ? { altitudeMSL: altMslFt } : {}),
        ...(headingDeg !== undefined ? { heading: headingDeg } : {}),
      });
      break;
    }
    case 'VFR_HUD': {
      const gsMs = Number(m.groundspeed ?? m.ground_speed ?? NaN);
      const heading = typeof m.heading !== 'undefined' ? Number(m.heading) : undefined;
      const climb = typeof m.climb !== 'undefined' ? Number(m.climb) : undefined;
      const airMs = typeof m.airspeed !== 'undefined' ? Number(m.airspeed) : NaN;
      const altM =
        typeof m.alt !== 'undefined'
          ? Number(m.alt)
          : typeof (m as { altitude?: unknown }).altitude !== 'undefined'
            ? Number((m as { altitude?: unknown }).altitude)
            : NaN;
      const knots = Number.isFinite(gsMs) ? gsMs * 1.94384 : undefined;
      const climbFtPerS =
        climb !== undefined && Number.isFinite(climb) ? climb * 3.28084 : undefined;
      const altAglGuess =
        Number.isFinite(altM) && altM !== 0 ? altM * 3.28084 : undefined;

      updateTelemetry({
        ...(Number.isFinite(gsMs) ? { groundSpeedMs: gsMs } : {}),
        ...(knots !== undefined ? { groundSpeedKnots: knots } : {}),
        ...(Number.isFinite(airMs) ? { airspeedMs: airMs } : {}),
        ...(heading !== undefined && Number.isFinite(heading) ? { heading } : {}),
        ...(climbFtPerS !== undefined ? { climbRate: climbFtPerS } : {}),
        ...(altAglGuess !== undefined ? { altitudeAGL: altAglGuess } : {}),
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
      const hb = mapHeartbeatToFlightMode(m);
      updateTelemetry({
        ...hb,
        inFlight: hb.armed ?? false,
        weightOnWheels: !hb.armed,
      });
      break;
    }
    case 'BATTERY_STATUS': {
      const voltsArr = (m.voltages as unknown[]) ?? [];
      const vCell = typeof voltsArr[0] === 'number' ? Number(voltsArr[0]) : NaN;
      if (Number.isFinite(vCell) && vCell > 0) {
        updateTelemetry({ batteryVoltage: vCell / 1000 });
      }
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
      const rssi = typeof m.rssi !== 'undefined' ? Number(m.rssi) : undefined;
      const quality =
        rssi !== undefined && Number.isFinite(rssi)
          ? Math.min(100, Math.max(0, Math.round((rssi / 255) * 100)))
          : undefined;
      updateTelemetry({
        rcConnected:
          typeof m.rssi === 'undefined' ? true : Number(m.rssi) > 40,
        ...(quality !== undefined ? { rfLinkQuality: quality } : {}),
      });
      break;
    }
    case 'WIND': {
      const speedRaw = Number(m.speed ?? m.windspeed ?? 0);
      const dirRaw = Number(m.direction ?? m.direction_deg ?? 270);
      const windSpeedMs = speedRaw > 100 ? speedRaw / 100 : speedRaw;
      const windDirectionDeg =
        dirRaw > 360 ? (dirRaw / 100) % 360 : ((dirRaw % 360) + 360) % 360;
      updateTelemetry({
        windSpeedMs,
        windDirectionDeg,
        windSource: 'SENSOR',
      });
      break;
    }
    case 'WIND_COV': {
      const wx = Number(m.wind_x ?? 0);
      const wy = Number(m.wind_y ?? 0);
      const windSpeed = Math.sqrt(wx ** 2 + wy ** 2);
      const windDir = ((Math.atan2(wx, wy) * 180) / Math.PI + 360) % 360;
      updateTelemetry({
        windSpeedMs: windSpeed,
        windDirectionDeg: windDir,
        windSource: 'SENSOR',
      });
      break;
    }
    case 'RADIO_STATUS': {
      const rssi = typeof m.rssi !== 'undefined' ? Number(m.rssi) : undefined;
      const noise = typeof m.noise !== 'undefined' ? Number(m.noise) : undefined;
      const snr =
        rssi !== undefined &&
        noise !== undefined &&
        Number.isFinite(rssi) &&
        Number.isFinite(noise) &&
        noise > 0
          ? Math.round(20 * Math.log10(rssi / noise))
          : undefined;
      updateTelemetry({
        ...(rssi !== undefined && Number.isFinite(rssi)
          ? { rfLinkQuality: Math.min(100, Math.max(0, rssi)) }
          : {}),
        ...(snr !== undefined ? { rfSnrDb: snr } : {}),
      });
      break;
    }
    default:
      break;
  }
}
