import { create } from 'zustand';

export type FlightMode =
  | 'AUTO'
  | 'STABILIZE'
  | 'RTL'
  | 'LAND'
  | 'LOITER'
  | 'GUIDED';

export type BatteryAlert = 'NONE' | 'WARN' | 'CRITICAL' | 'EMERGENCY';

export type GpsFixType = 'NO_FIX' | 'FIX_2D' | 'FIX_3D' | 'RTK_FLOAT' | 'RTK_FIXED';

export type WindSource = 'SENSOR' | 'ESTIMATED' | 'MANUAL';

export interface TelemetryState {
  lat: number;
  lon: number;
  altitudeAGL: number;
  altitudeMSL: number;

  groundSpeedKnots: number;
  groundSpeedMs: number;
  airspeedMs: number;
  heading: number;
  climbRate: number;

  windSpeedMs: number;
  windDirectionDeg: number;
  windSource: WindSource;

  batteryPercent: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryAlert: BatteryAlert;
  estimatedFlightMinutes: number;

  flightMode: FlightMode;
  armed: boolean;
  weightOnWheels: boolean;
  inFlight: boolean;

  gpsFixType: GpsFixType;
  gpsSatellites: number;
  gpsHdop: number;

  telemetryConnected: boolean;
  rcConnected: boolean;
  lastTelemetryMs: number;

  rfLinkQuality: number;
  rfSnrDb: number;

  currentLap: number;
  totalLapsTarget: number;
  lapStartedAt: number | null;
  missionStartedAt: number | null;

  bay1Status: 'ARMED' | 'RELEASED' | 'ERROR';
  bay2Status: 'ARMED' | 'RELEASED' | 'ERROR';
  bay1ReleasedAt: number | null;
  bay2ReleasedAt: number | null;

  updateTelemetry: (
    data: Partial<
      Omit<TelemetryState, 'updateTelemetry' | 'updateBayStatus' | 'reset'>
    >
  ) => void;
  updateBayStatus: (bay: 1 | 2, status: 'ARMED' | 'RELEASED' | 'ERROR') => void;
  reset: () => void;
}

const initialState: Omit<
  TelemetryState,
  'updateTelemetry' | 'updateBayStatus' | 'reset'
> = {
  lat: 36.0544,
  lon: -95.9204,
  altitudeAGL: 0,
  altitudeMSL: 690,

  groundSpeedKnots: 0,
  groundSpeedMs: 0,
  airspeedMs: 0,
  heading: 0,
  climbRate: 0,

  windSpeedMs: 6.3,
  windDirectionDeg: 270,
  windSource: 'MANUAL',

  batteryPercent: 100,
  batteryVoltage: 50.4,
  batteryCurrent: 0,
  batteryAlert: 'NONE',
  estimatedFlightMinutes: 47,

  flightMode: 'STABILIZE',
  armed: false,
  weightOnWheels: true,
  inFlight: false,

  gpsFixType: 'NO_FIX',
  gpsSatellites: 0,
  gpsHdop: 99.9,

  telemetryConnected: false,
  rcConnected: false,
  lastTelemetryMs: 0,

  rfLinkQuality: 0,
  rfSnrDb: 0,

  currentLap: 0,
  totalLapsTarget: 9,
  lapStartedAt: null,
  missionStartedAt: null,

  bay1Status: 'ARMED',
  bay2Status: 'ARMED',
  bay1ReleasedAt: null,
  bay2ReleasedAt: null,
};

function computeBatteryAlert(percent: number): BatteryAlert {
  if (percent <= 15) return 'EMERGENCY';
  if (percent <= 30) return 'CRITICAL';
  if (percent <= 45) return 'WARN';
  return 'NONE';
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  ...initialState,

  updateTelemetry: (data) =>
    set((state) => {
      const newPercent = data.batteryPercent ?? state.batteryPercent;
      const batteryAlert = computeBatteryAlert(newPercent);
      const estimatedFlightMinutes = Math.max(0, (newPercent / 100) * 47);

      return {
        ...state,
        ...data,
        batteryAlert,
        estimatedFlightMinutes,
        lastTelemetryMs: Date.now(),
      };
    }),

  updateBayStatus: (bay, status) =>
    set((state) => {
      if (bay === 1) {
        return {
          bay1Status: status,
          bay1ReleasedAt: status === 'RELEASED' ? Date.now() : state.bay1ReleasedAt,
        };
      }
      return {
        bay2Status: status,
        bay2ReleasedAt: status === 'RELEASED' ? Date.now() : state.bay2ReleasedAt,
      };
    }),

  reset: () => set(initialState),
}));

