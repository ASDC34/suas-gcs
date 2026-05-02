import { useEffect, useRef } from 'react';
import { useMissionStore } from '../store/missionStore';
import type { MissionPhase as GcsMissionPhase } from '../store/missionStore';
import { useTelemetryStore } from '../store/telemetryStore';

type MissionPhase =
  | 'PREFLIGHT'
  | 'TAKEOFF'
  | 'LAP_FLYING'
  | 'SURVEY'
  | 'DELIVERY'
  | 'RTL'
  | 'LANDING'
  | 'COMPLETE';

/** Sim dahili faz → Görev akışında kullanılan `missionStore` fazı */
const SIM_TO_GCS_MISSION: Partial<Record<MissionPhase, GcsMissionPhase>> = {
  TAKEOFF: 'TAKEOFF',
  LAP_FLYING: 'LAPS',
  SURVEY: 'SURVEY',
  DELIVERY: 'DELIVERY',
  RTL: 'RTL',
  LANDING: 'RTL',
  COMPLETE: 'COMPLETE',
};

export function useTelemetrySimulator(enabled: boolean = true) {
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);
  const updateBayStatus = useTelemetryStore((s) => s.updateBayStatus);
  const lastSyncedSimPhase = useRef<MissionPhase | null>(null);

  const simState = useRef({
    phase: 'PREFLIGHT' as MissionPhase,
    phaseStartTime: Date.now(),
    missionStartTime: Date.now(),

    altitudeAGL: 0,
    groundSpeedMs: 0,
    heading: 45,
    batteryPercent: 100,
    batteryVoltage: 50.4,
    rfLinkQuality: 95,
    rfSnrDb: 28,

    lat: 36.0544,
    lon: -95.9204,

    currentLap: 0,
    lapCount: 9,

    orbitAngle: 0,
    orbitRadius: 0.008,
  });

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      const sim = simState.current;
      const now = Date.now();
      const phaseElapsed = (now - sim.phaseStartTime) / 1000;

      switch (sim.phase) {
        case 'PREFLIGHT':
          if (phaseElapsed > 5) {
            sim.phase = 'TAKEOFF';
            sim.phaseStartTime = now;
          }
          updateTelemetry({
            armed: false,
            weightOnWheels: true,
            inFlight: false,
            flightMode: 'STABILIZE',
            gpsSatellites: Math.min(Math.floor(phaseElapsed * 2), 14),
            gpsFixType:
              phaseElapsed > 3
                ? 'RTK_FIXED'
                : phaseElapsed > 1.5
                  ? 'FIX_3D'
                  : 'NO_FIX',
            gpsHdop: Math.max(0.6, 99.9 - phaseElapsed * 30),
            telemetryConnected: true,
            rcConnected: true,
            rfLinkQuality: 92 + Math.random() * 8,
            rfSnrDb: 25 + Math.random() * 8,
            batteryPercent: 100,
            batteryVoltage: 50.4,
            lat: sim.lat,
            lon: sim.lon,
            altitudeAGL: 0,
            altitudeMSL: 690,
          });
          break;

        case 'TAKEOFF':
          if (phaseElapsed > 30) {
            sim.phase = 'LAP_FLYING';
            sim.phaseStartTime = now;
            sim.currentLap = 1;
          }
          sim.altitudeAGL = Math.min(200, (phaseElapsed / 30) * 200);
          sim.groundSpeedMs = Math.min(8, (phaseElapsed / 30) * 8);
          updateTelemetry({
            armed: true,
            weightOnWheels: sim.altitudeAGL < 5,
            inFlight: sim.altitudeAGL > 10,
            flightMode: 'AUTO',
            altitudeAGL: sim.altitudeAGL,
            altitudeMSL: 690 + sim.altitudeAGL,
            groundSpeedMs: sim.groundSpeedMs,
            groundSpeedKnots: sim.groundSpeedMs * 1.94384,
            climbRate: sim.altitudeAGL < 199 ? 6.5 : 0,
            heading: sim.heading,
            lat: sim.lat,
            lon: sim.lon,
            gpsFixType: 'RTK_FIXED',
            gpsSatellites: 14,
            gpsHdop: 0.6,
          });
          break;

        case 'LAP_FLYING': {
          const lapDuration = 180;
          const totalLapTime = sim.lapCount * lapDuration;

          if (phaseElapsed > totalLapTime) {
            sim.phase = 'SURVEY';
            sim.phaseStartTime = now;
            break;
          }

          sim.currentLap = Math.floor(phaseElapsed / lapDuration) + 1;
          const lapProgress = (phaseElapsed % lapDuration) / lapDuration;
          const angle = lapProgress * Math.PI * 2;
          sim.orbitAngle = angle;

          const centerLat = 36.0544;
          const centerLon = -95.9204;
          sim.lat = centerLat + Math.sin(angle) * 0.009;
          sim.lon = centerLon + Math.cos(angle) * 0.018;

          sim.heading =
            ((Math.atan2(Math.cos(angle) * 0.009, -Math.sin(angle) * 0.018) *
              180) /
              Math.PI +
              360) %
            360;

          const missionElapsed = (now - sim.missionStartTime) / 1000 / 60;
          sim.batteryPercent = Math.max(15, 100 - missionElapsed * 1.78);
          sim.batteryVoltage = 36 + (sim.batteryPercent / 100) * 14.4;

          sim.groundSpeedMs = 15 + Math.sin(phaseElapsed * 0.1) * 2;

          sim.rfLinkQuality =
            85 + Math.sin(phaseElapsed * 0.5 * Math.PI * 2) * 10;
          sim.rfSnrDb = 20 + Math.sin(phaseElapsed * 0.3 * Math.PI * 2) * 6;

          updateTelemetry({
            lat: sim.lat,
            lon: sim.lon,
            altitudeAGL: 200 + Math.sin(phaseElapsed * 0.1) * 5,
            altitudeMSL: 890 + Math.sin(phaseElapsed * 0.1) * 5,
            groundSpeedMs: sim.groundSpeedMs,
            groundSpeedKnots: sim.groundSpeedMs * 1.94384,
            airspeedMs: sim.groundSpeedMs + 1.5,
            heading: sim.heading,
            climbRate: Math.sin(phaseElapsed * 0.2) * 0.5,
            batteryPercent: sim.batteryPercent,
            batteryVoltage: sim.batteryVoltage,
            batteryCurrent: 85 + Math.random() * 10,
            currentLap: sim.currentLap,
            flightMode: 'AUTO',
            rfLinkQuality: Math.max(0, Math.min(100, sim.rfLinkQuality)),
            rfSnrDb: Math.max(0, sim.rfSnrDb),
          });
          break;
        }

        case 'SURVEY':
          if (phaseElapsed > 420) {
            sim.phase = 'DELIVERY';
            sim.phaseStartTime = now;
          }
          sim.altitudeAGL = Math.max(150, 200 - (phaseElapsed / 420) * 50);
          sim.groundSpeedMs = 10;
          updateTelemetry({
            altitudeAGL: sim.altitudeAGL,
            altitudeMSL: 690 + sim.altitudeAGL,
            groundSpeedMs: sim.groundSpeedMs,
            groundSpeedKnots: sim.groundSpeedMs * 1.94384,
            flightMode: 'AUTO',
          });
          break;

        case 'DELIVERY':
          if (phaseElapsed > 5) updateBayStatus(1, 'RELEASED');
          if (phaseElapsed > 15) updateBayStatus(2, 'RELEASED');
          if (phaseElapsed > 120) {
            sim.phase = 'RTL';
            sim.phaseStartTime = now;
          }
          break;

        case 'RTL':
          if (phaseElapsed > 30) {
            sim.phase = 'LANDING';
            sim.phaseStartTime = now;
          }
          updateTelemetry({
            flightMode: 'RTL',
            groundSpeedMs: 12,
            groundSpeedKnots: 12 * 1.94384,
          });
          break;

        case 'LANDING':
          if (phaseElapsed > 25) {
            sim.phase = 'COMPLETE';
            sim.phaseStartTime = now;
          }
          sim.altitudeAGL = Math.max(0, 150 - (phaseElapsed / 25) * 150);
          updateTelemetry({
            flightMode: 'LAND',
            altitudeAGL: sim.altitudeAGL,
            altitudeMSL: 690 + sim.altitudeAGL,
            groundSpeedMs: sim.altitudeAGL > 5 ? 2 : 0,
            groundSpeedKnots: sim.altitudeAGL > 5 ? 2 * 1.94384 : 0,
            climbRate: -2.5,
            weightOnWheels: sim.altitudeAGL < 3,
          });
          break;

        case 'COMPLETE':
          updateTelemetry({
            armed: false,
            inFlight: false,
            weightOnWheels: true,
            flightMode: 'STABILIZE',
            altitudeAGL: 0,
            groundSpeedMs: 0,
            groundSpeedKnots: 0,
            climbRate: 0,
          });
          break;
      }

      const simPhaseNow = simState.current.phase;
      if (lastSyncedSimPhase.current !== simPhaseNow) {
        lastSyncedSimPhase.current = simPhaseNow;
        const gcsPhase = SIM_TO_GCS_MISSION[simPhaseNow];
        if (gcsPhase) useMissionStore.getState().setMissionPhase(gcsPhase);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [enabled, updateTelemetry, updateBayStatus]);

  return {
    resetSimulation: () => {
      const sim = simState.current;
      sim.phase = 'PREFLIGHT';
      sim.phaseStartTime = Date.now();
      sim.missionStartTime = Date.now();
      sim.altitudeAGL = 0;
      sim.batteryPercent = 100;
      sim.currentLap = 0;
      lastSyncedSimPhase.current = null;
      useMissionStore.getState().setMissionPhase('SETUP');
    },
    getCurrentPhase: () => simState.current.phase,
  };
}

