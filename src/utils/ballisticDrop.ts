export interface DropInput {
  targetLat: number;
  targetLon: number;
  releaseAltitudeFt: number;
  windSpeedMs: number;
  windDirectionDeg: number; // meteorolojik (geldiği yön)
  airspeedMs: number;
  headingDeg: number;
}

export interface DropResult {
  releaseLat: number;
  releaseLon: number;
  estimatedLandingLat: number;
  estimatedLandingLon: number;
  fallTimeSec: number;
  windDriftNorthM: number;
  windDriftEastM: number;
  totalDriftM: number;
  confidenceRadiusM: number;
}

const CHUTE_TERMINAL_VELOCITY_MS = 4.0;
const CHUTE_OPEN_TIME_SEC = 0.8;
const G = 9.81;

export function calculateDropPoint(input: DropInput): DropResult {
  const {
    targetLat,
    targetLon,
    releaseAltitudeFt,
    windSpeedMs,
    windDirectionDeg,
  } = input;

  const altitudeM = releaseAltitudeFt * 0.3048;

  const freefallHeight = 5;
  const t1 = Math.sqrt((2 * freefallHeight) / G);
  const remainingHeight = Math.max(0, altitudeM - freefallHeight);
  const t2 = remainingHeight / CHUTE_TERMINAL_VELOCITY_MS;

  const totalFallTime = t1 + CHUTE_OPEN_TIME_SEC + t2;

  const driftDirDeg = (windDirectionDeg + 180) % 360;
  const driftDirRad = (driftDirDeg * Math.PI) / 180;

  const windDriftNorthM = windSpeedMs * totalFallTime * Math.cos(driftDirRad);
  const windDriftEastM = windSpeedMs * totalFallTime * Math.sin(driftDirRad);
  const totalDriftM = Math.sqrt(windDriftNorthM ** 2 + windDriftEastM ** 2);

  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos((targetLat * Math.PI) / 180);

  const driftLatDeg = windDriftNorthM / metersPerDegreeLat;
  const driftLonDeg = windDriftEastM / metersPerDegreeLon;

  const releaseLat = targetLat - driftLatDeg;
  const releaseLon = targetLon - driftLonDeg;

  const estimatedLandingLat = releaseLat + driftLatDeg;
  const estimatedLandingLon = releaseLon + driftLonDeg;

  const windError = totalDriftM * 0.2;
  const gpsError = 2;
  const confidenceRadiusM = Math.sqrt(windError ** 2 + gpsError ** 2);

  return {
    releaseLat,
    releaseLon,
    estimatedLandingLat,
    estimatedLandingLon,
    fallTimeSec: totalFallTime,
    windDriftNorthM,
    windDriftEastM,
    totalDriftM,
    confidenceRadiusM,
  };
}

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

