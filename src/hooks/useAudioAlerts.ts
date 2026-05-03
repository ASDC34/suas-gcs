import { useEffect, useRef } from 'react';
import { useMissionStore } from '../store/missionStore';
import type { BatteryAlert } from '../store/telemetryStore';
import { useTelemetryStore } from '../store/telemetryStore';

const FLOOR_FT = 150;
const CEILING_FT = 400;

const ALERT_ORDER: Record<BatteryAlert, number> = {
  NONE: 0,
  WARN: 1,
  CRITICAL: 2,
  EMERGENCY: 3,
};

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function playTone(
  ctx: AudioContext,
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  peakGain = 0.12,
  startOffset = 0
): void {
  const t0 = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durationSec + 0.05);
}

function playBatteryWarn(ctx: AudioContext): void {
  playTone(ctx, 880, 0.12, 'sine', 0.1);
  playTone(ctx, 660, 0.12, 'sine', 0.1, 0.15);
}

function playBatteryCritical(ctx: AudioContext): void {
  for (let i = 0; i < 3; i++) {
    playTone(ctx, 440, 0.08, 'square', 0.06, i * 0.12);
    playTone(ctx, 880, 0.08, 'square', 0.06, i * 0.12 + 0.06);
  }
}

function playBatteryEmergency(ctx: AudioContext): void {
  for (let i = 0; i < 6; i++) {
    playTone(ctx, i % 2 === 0 ? 220 : 880, 0.06, 'sawtooth', 0.08, i * 0.09);
  }
}

function playAltitudeLow(ctx: AudioContext): void {
  playTone(ctx, 520, 0.1, 'triangle', 0.11);
  playTone(ctx, 380, 0.14, 'triangle', 0.12, 0.12);
  playTone(ctx, 280, 0.18, 'triangle', 0.13, 0.28);
}

function playAltitudeHigh(ctx: AudioContext): void {
  playTone(ctx, 400, 0.1, 'triangle', 0.11);
  playTone(ctx, 620, 0.12, 'triangle', 0.12, 0.12);
  playTone(ctx, 880, 0.14, 'triangle', 0.13, 0.26);
}

function playLinkLost(ctx: AudioContext): void {
  const t0 = ctx.currentTime;
  const dur = 0.35;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(90, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function playWaypointPass(ctx: AudioContext): void {
  playTone(ctx, 523.25, 0.1, 'sine', 0.1);
  playTone(ctx, 659.25, 0.12, 'sine', 0.1, 0.1);
  playTone(ctx, 783.99, 0.14, 'sine', 0.09, 0.22);
}

type AltZone = 'safe' | 'low' | 'high';

function altitudeZone(agl: number, inFlight: boolean): AltZone {
  if (!inFlight) return 'safe';
  if (agl < FLOOR_FT) return 'low';
  if (agl > CEILING_FT) return 'high';
  return 'safe';
}

/**
 * Web Audio tabanlı GCS uyarıları: pil (warn/critical/emergency),
 * irtifa (150 ft altı / 400 ft üstü), bağlantı kopması, waypoint geçişi.
 */
export function useAudioAlerts(enabled: boolean): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const prevBatteryRef = useRef<BatteryAlert | null>(null);
  const prevLinkOkRef = useRef<boolean | null>(null);
  const prevAltZoneRef = useRef<AltZone | null>(null);
  const prevCompletedRef = useRef<number | null>(null);

  const batteryAlert = useTelemetryStore((s) => s.batteryAlert);
  const altitudeAGL = useTelemetryStore((s) => s.altitudeAGL);
  const inFlight = useTelemetryStore((s) => s.inFlight);
  const telemetryConnected = useTelemetryStore((s) => s.telemetryConnected);
  const rcConnected = useTelemetryStore((s) => s.rcConnected);
  const activeRunway = useMissionStore((s) => s.activeRunway);
  const rwy1 = useMissionStore((s) => s.rwy1);
  const rwy2 = useMissionStore((s) => s.rwy2);

  const completedCount =
    activeRunway === 'RWY1'
      ? rwy1.waypoints.filter((w) => w.status === 'COMPLETED').length
      : rwy2.waypoints.filter((w) => w.status === 'COMPLETED').length;

  useEffect(() => {
    if (!enabled) return;

    const ensureCtx = (): AudioContext | null => {
      if (!ctxRef.current) ctxRef.current = getAudioContext();
      const c = ctxRef.current;
      if (c && c.state === 'suspended') void c.resume().catch(() => {});
      return c;
    };

    const ctx = ensureCtx();
    if (!ctx) return;

    /* — Pil: yalnızca kötüleşen seviye — */
    if (prevBatteryRef.current !== null) {
      const prev = prevBatteryRef.current;
      if (ALERT_ORDER[batteryAlert] > ALERT_ORDER[prev]) {
        if (batteryAlert === 'WARN') playBatteryWarn(ctx);
        else if (batteryAlert === 'CRITICAL') playBatteryCritical(ctx);
        else if (batteryAlert === 'EMERGENCY') playBatteryEmergency(ctx);
      }
    }
    prevBatteryRef.current = batteryAlert;

    /* — Bağlantı — */
    const linkOk = telemetryConnected && rcConnected;
    if (prevLinkOkRef.current !== null && prevLinkOkRef.current && !linkOk) {
      playLinkLost(ctx);
    }
    prevLinkOkRef.current = linkOk;

    /* — İrtifa penceresi — */
    const z = altitudeZone(altitudeAGL, inFlight);
    if (prevAltZoneRef.current !== null && prevAltZoneRef.current !== z) {
      if (z === 'low') playAltitudeLow(ctx);
      else if (z === 'high') playAltitudeHigh(ctx);
    }
    prevAltZoneRef.current = z;

    /* — Waypoint tamamlanma sayısı arttı — */
    if (prevCompletedRef.current !== null && completedCount > prevCompletedRef.current) {
      playWaypointPass(ctx);
    }
    prevCompletedRef.current = completedCount;
  }, [
    enabled,
    batteryAlert,
    altitudeAGL,
    inFlight,
    telemetryConnected,
    rcConnected,
    completedCount,
  ]);
}
