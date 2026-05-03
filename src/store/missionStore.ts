import { create } from 'zustand';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Waypoint {
  id: string;
  index: number;
  lat: number;
  lon: number;
  altitudeFt: number;
  type: 'NORMAL' | 'LOITER' | 'SURVEY_ENTRY' | 'DELIVERY';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  acceptanceRadiusM: number;
}

export interface RunwaySet {
  id: 'RWY1' | 'RWY2';
  name: string;
  description: string;
  thresholdLat: number;
  thresholdLon: number;
  waypoints: Waypoint[];
}

export interface FlightBoundary {
  points: LatLon[];
}

export interface SearchBoundary {
  points: LatLon[];
  scanLines?: Array<{ start: LatLon; end: LatLon }>;
}

export type MissionPhase =
  | 'SETUP'
  | 'PREFLIGHT'
  | 'TAKEOFF'
  | 'LAPS'
  | 'SURVEY'
  | 'DELIVERY'
  | 'RTL'
  | 'COMPLETE';

/** Uçuş sınırı içinde oval rota — merkez pist eşiği, ~660m × ~830m elips (güvenli pay) */
const LAP_CENTER_LAT = 36.0544;
const LAP_CENTER_LON = -95.9204;
const LAP_R_LAT = 0.006;
const LAP_R_LON = 0.0075;

const RWY1_WAYPOINTS: Waypoint[] = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  const lat = LAP_CENTER_LAT + LAP_R_LAT * Math.sin(angle);
  const lon = LAP_CENTER_LON + LAP_R_LON * Math.cos(angle);
  return {
    id: `wp-${i + 1}`,
    index: i + 1,
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5,
    altitudeFt: 200,
    type: 'NORMAL' as const,
    status: 'PENDING' as const,
    acceptanceRadiusM: 30,
  };
});

const RWY2_WAYPOINTS: Waypoint[] = RWY1_WAYPOINTS.map((wp) => ({
  ...wp,
  lat: wp.lat - 0.003,
  lon: wp.lon - 0.005,
}));

const FLIGHT_BOUNDARY: FlightBoundary = {
  points: [
    { lat: 36.0650, lon: -95.9280 },
    { lat: 36.0670, lon: -95.8950 },
    { lat: 36.0450, lon: -95.8920 },
    { lat: 36.0430, lon: -95.9260 },
  ],
};

const SEARCH_BOUNDARY: SearchBoundary = {
  points: [
    { lat: 36.0560, lon: -95.9180 },
    { lat: 36.0590, lon: -95.9080 },
    { lat: 36.0530, lon: -95.9050 },
    { lat: 36.0510, lon: -95.9150 },
  ],
};

function computeScanLines(boundary: LatLon[], altitudeFt: number): Array<{ start: LatLon; end: LatLon }> {
  const sensorWidthMm = 6.287;
  const focalLengthMm = 4.5;
  const sidelap = 0.8;

  const altitudeM = altitudeFt * 0.3048;
  const swathWidthM = (sensorWidthMm / focalLengthMm) * altitudeM;
  const stripSpacingM = swathWidthM * (1 - sidelap);

  const lats = boundary.map((p) => p.lat);
  const lons = boundary.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const stripSpacingDeg = stripSpacingM / 111320;

  const lines: Array<{ start: LatLon; end: LatLon }> = [];
  let lon = minLon;
  let goingNorth = true;

  while (lon <= maxLon) {
    lines.push(
      goingNorth
        ? { start: { lat: minLat, lon }, end: { lat: maxLat, lon } }
        : { start: { lat: maxLat, lon }, end: { lat: minLat, lon } }
    );
    lon += stripSpacingDeg;
    goingNorth = !goingNorth;
  }

  return lines;
}

interface MissionStoreState {
  activeRunway: 'RWY1' | 'RWY2';

  rwy1: RunwaySet;
  rwy2: RunwaySet;

  flightBoundary: FlightBoundary;
  searchBoundary: SearchBoundary;

  missionPhase: MissionPhase;

  selectedWaypointId: string | null;

  detectedTentLocation: LatLon | null;
  detectedMannequinLocation: LatLon | null;

  setActiveRunway: (rwy: 'RWY1' | 'RWY2') => void;
  updateWaypoint: (id: string, changes: Partial<Waypoint>) => void;
  setWaypointStatus: (id: string, status: Waypoint['status']) => void;
  selectWaypoint: (id: string | null) => void;
  setMissionPhase: (phase: MissionPhase) => void;
  /** `undefined` = değiştirme; `null` = temizle */
  setDetectedTargets: (tent?: LatLon | null, mannequin?: LatLon | null) => void;
  updateSearchBoundaryFromInterop: (points: LatLon[]) => void;
}

export const useMissionStore = create<MissionStoreState>((set) => ({
  activeRunway: 'RWY1',

  rwy1: {
    id: 'RWY1',
    name: 'Runway 1',
    description: '40ft × 500ft paved — VTOL & HTOL',
    thresholdLat: 36.0544,
    thresholdLon: -95.9204,
    waypoints: RWY1_WAYPOINTS,
  },

  rwy2: {
    id: 'RWY2',
    name: 'Runway 2',
    description: '40ft × 40ft paved — VTOL ONLY',
    thresholdLat: 36.0541,
    thresholdLon: -95.9209,
    waypoints: RWY2_WAYPOINTS,
  },

  flightBoundary: FLIGHT_BOUNDARY,

  searchBoundary: {
    ...SEARCH_BOUNDARY,
    scanLines: computeScanLines(SEARCH_BOUNDARY.points, 150),
  },

  missionPhase: 'SETUP',
  selectedWaypointId: null,
  detectedTentLocation: null,
  detectedMannequinLocation: null,

  setActiveRunway: (rwy) => set({ activeRunway: rwy }),

  updateWaypoint: (id, changes) =>
    set((state) => {
      const updateInSet = (waypoints: Waypoint[]) =>
        waypoints.map((wp) => (wp.id === id ? { ...wp, ...changes } : wp));
      return {
        rwy1: { ...state.rwy1, waypoints: updateInSet(state.rwy1.waypoints) },
        rwy2: { ...state.rwy2, waypoints: updateInSet(state.rwy2.waypoints) },
      };
    }),

  setWaypointStatus: (id, status) =>
    set((state) => {
      const updateInSet = (waypoints: Waypoint[]) =>
        waypoints.map((wp) => (wp.id === id ? { ...wp, status } : wp));
      return {
        rwy1: { ...state.rwy1, waypoints: updateInSet(state.rwy1.waypoints) },
        rwy2: { ...state.rwy2, waypoints: updateInSet(state.rwy2.waypoints) },
      };
    }),

  selectWaypoint: (id) => set({ selectedWaypointId: id }),

  setMissionPhase: (phase) => set({ missionPhase: phase }),

  setDetectedTargets: (tent, mannequin) =>
    set((state) => ({
      detectedTentLocation: tent === undefined ? state.detectedTentLocation : tent,
      detectedMannequinLocation:
        mannequin === undefined ? state.detectedMannequinLocation : mannequin,
    })),

  updateSearchBoundaryFromInterop: (points) =>
    set(() => ({
      searchBoundary: {
        points,
        scanLines: computeScanLines(points, 150),
      },
    })),
}));

