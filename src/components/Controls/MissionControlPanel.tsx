import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Map, Package, Play, Radio } from 'lucide-react';
import { useControlStore } from '../../store/controlStore';
import { useMissionStore } from '../../store/missionStore';
import { useTelemetryStore } from '../../store/telemetryStore';

const MISSION_STEPS = [
  { step: 1, label: 'Kurulum & GCS', phase: 'SETUP', icon: '⚙' },
  { step: 2, label: 'Otonom Kalkış', phase: 'TAKEOFF', icon: '↑' },
  { step: 3, label: '9–10 Tur', phase: 'LAPS', icon: '○' },
  { step: 4, label: 'Risk Harita', phase: 'SURVEY', icon: '▦' },
  { step: 5, label: 'Bay 1 (Beacon)', phase: 'DELIVERY', icon: '⛺' },
  { step: 6, label: 'Bay 2 (Şişe)', phase: 'DELIVERY', icon: '🧍' },
  { step: 7, label: 'RTL & İniş', phase: 'RTL', icon: '↓' },
];

export const MissionControlPanel: React.FC = () => {
  const inFlight = useTelemetryStore((s) => s.inFlight);
  const armed = useTelemetryStore((s) => s.armed);
  const bay1Status = useTelemetryStore((s) => s.bay1Status);
  const bay2Status = useTelemetryStore((s) => s.bay2Status);
  const currentLap = useTelemetryStore((s) => s.currentLap);
  const totalLapsTarget = useTelemetryStore((s) => s.totalLapsTarget);

  const missionPhase = useMissionStore((s) => s.missionPhase);
  const setMissionPhase = useMissionStore((s) => s.setMissionPhase);

  const requestCommand = useControlStore((s) => s.requestCommand);
  const bay1Releasing = useControlStore((s) => s.bay1Releasing);
  const bay2Releasing = useControlStore((s) => s.bay2Releasing);
  const lastBayReleaseMs = useControlStore((s) => s.lastBayReleaseMs);
  const MIN_INTERVAL = useControlStore((s) => s.MIN_BAY_INTERVAL_MS);
  const setBayReleasing = useControlStore((s) => s.setBayReleasing);

  const [bay2LockSecsLeft, setBay2LockSecsLeft] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => {
      const remaining = Math.max(0, (lastBayReleaseMs + MIN_INTERVAL - Date.now()) / 1000);
      setBay2LockSecsLeft(Math.round(remaining));
    }, 250);
    return () => clearInterval(t);
  }, [lastBayReleaseMs, MIN_INTERVAL]);

  const handleTakeoff = useCallback(() => {
    requestCommand('AUTONOMOUS_TAKEOFF', () => {
      setMissionPhase('TAKEOFF');
      // eslint-disable-next-line no-console
      console.log('MAVLink: CMD_NAV_TAKEOFF → 200ft AGL');
    });
  }, [requestCommand, setMissionPhase]);

  const handleEnterSearch = useCallback(() => {
    requestCommand('ENTER_SEARCH_AREA', () => {
      setMissionPhase('SURVEY');
      // eslint-disable-next-line no-console
      console.log('MAVLink: Mission item → Search area entry');
    });
  }, [requestCommand, setMissionPhase]);

  const handleRTL = useCallback(() => {
    requestCommand('INITIATE_RTL', () => {
      // eslint-disable-next-line no-console
      console.log('MAVLink: DO_SET_MODE → RTL');
    });
  }, [requestCommand]);

  const handleBay1 = useCallback(() => {
    if (bay1Status === 'RELEASED' || bay1Releasing) return;
    requestCommand('RELEASE_BAY_1', () => {
      // eslint-disable-next-line no-console
      console.log('MAVLink: DO_SET_SERVO → ch9 → 1900 (open)');
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log('MAVLink: DO_SET_SERVO → ch9 → 1100 (close)');
        setBayReleasing(1, false);
      }, 2000);
    });
  }, [bay1Status, bay1Releasing, requestCommand, setBayReleasing]);

  const handleBay2 = useCallback(() => {
    if (bay2Status === 'RELEASED' || bay2Releasing || bay2LockSecsLeft > 0) return;
    requestCommand('RELEASE_BAY_2', () => {
      // eslint-disable-next-line no-console
      console.log('MAVLink: DO_SET_SERVO → ch10 → 1900 (open)');
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log('MAVLink: DO_SET_SERVO → ch10 → 1100 (close)');
        setBayReleasing(2, false);
      }, 2000);
    });
  }, [bay2Status, bay2Releasing, bay2LockSecsLeft, requestCommand, setBayReleasing]);

  function CommandButton({
    label,
    sublabel,
    onClick,
    disabled,
    color = '#3b82f6',
    icon,
    completed,
    locked,
    lockInfo,
  }: {
    label: string;
    sublabel?: string;
    onClick: () => void;
    disabled?: boolean;
    color?: string;
    icon?: React.ReactNode;
    completed?: boolean;
    locked?: boolean;
    lockInfo?: string;
  }) {
    const isDisabled = disabled || locked || completed;
    const bg = completed ? '#052e16' : locked ? '#0d1321' : isDisabled ? '#0d1321' : `${color}15`;

    const borderColor = completed ? '#10b981' : locked ? '#1e2d40' : isDisabled ? '#1e2d40' : color;

    const textColor = completed ? '#10b981' : locked ? '#2a4060' : isDisabled ? '#2a4060' : color;

    return (
      <motion.button
        onClick={isDisabled ? undefined : onClick}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        style={{
          padding: '8px 12px',
          borderRadius: 4,
          border: `1px solid ${borderColor}`,
          backgroundColor: bg,
          color: textColor,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.05em',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          textAlign: 'left',
        }}
      >
        {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{completed ? `✓ ${label}` : label}</div>
          {(sublabel || lockInfo) && (
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{lockInfo || sublabel}</div>
          )}
        </div>
      </motion.button>
    );
  }

  const phaseIndex = (phase: string) => MISSION_STEPS.findIndex((s) => s.phase === phase);

  return (
    <div className="hud-panel p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            letterSpacing: '0.15em',
            color: '#4a6080',
          }}
        >
          MİSYON KONTROLÜ
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#4a6080',
          }}
        >
          Rule 3.0.9
        </div>
      </div>

      <div className="flex gap-1">
        {MISSION_STEPS.map(({ step, phase }) => {
          const isActive = missionPhase === (phase as any);
          const isCompleted = phaseIndex(String(missionPhase)) >= step;
          return (
            <div
              key={step}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 1,
                backgroundColor: isActive ? '#3b82f6' : isCompleted ? '#10b981' : '#1e2d40',
                transition: 'background-color 0.3s',
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <CommandButton
          label="Otonom Kalkış"
          sublabel="Tek komut — Rule 3.2.1"
          onClick={handleTakeoff}
          disabled={inFlight || armed}
          color="#10b981"
          icon={<Play size={14} />}
          completed={missionPhase !== 'SETUP' && missionPhase !== 'PREFLIGHT'}
        />

        <CommandButton
          label="Aramayı Başlat"
          sublabel={`${currentLap}/${totalLapsTarget} tur tamamlandı`}
          onClick={handleEnterSearch}
          disabled={!inFlight || (missionPhase as any) !== 'LAPS'}
          color="#3b82f6"
          icon={<Map size={14} />}
          completed={['SURVEY', 'DELIVERY', 'RTL', 'COMPLETE'].includes(String(missionPhase))}
        />

        <CommandButton
          label="Bay 1 Bırak (Beacon)"
          sublabel="GP908 → Çadır hedefi"
          onClick={handleBay1}
          disabled={!inFlight || bay1Status === 'RELEASED' || !['SURVEY', 'DELIVERY'].includes(String(missionPhase))}
          color="#f59e0b"
          icon={<Package size={14} />}
          completed={bay1Status === 'RELEASED'}
        />

        <CommandButton
          label="Bay 2 Bırak (Şişe)"
          sublabel="Su şişesi → Manken"
          onClick={handleBay2}
          disabled={!inFlight || bay2Status === 'RELEASED' || !['SURVEY', 'DELIVERY'].includes(String(missionPhase))}
          locked={bay2LockSecsLeft > 0}
          lockInfo={bay2LockSecsLeft > 0 ? `Rule 3.6.1 kilidi: ${bay2LockSecsLeft}s kaldı` : undefined}
          color="#a78bfa"
          icon={<Package size={14} />}
          completed={bay2Status === 'RELEASED'}
        />

        <CommandButton
          label="RTL & Otonom İniş"
          sublabel="Tek komut — Rule 3.2.1"
          onClick={handleRTL}
          disabled={!inFlight}
          color="#f97316"
          icon={<Radio size={14} />}
          completed={String(missionPhase) === 'COMPLETE'}
        />
      </div>

      <div className="flex gap-2">
        {[
          { bay: 1, label: 'Bay 1', status: bay1Status, releasing: bay1Releasing },
          { bay: 2, label: 'Bay 2', status: bay2Status, releasing: bay2Releasing },
        ].map(({ bay, label, status, releasing }) => (
          <div
            key={bay}
            className="flex-1 rounded px-2 py-1.5 text-center"
            style={{
              backgroundColor: status === 'RELEASED' ? '#052e16' : status === 'ERROR' ? '#450a0a' : '#0d1321',
              border: `1px solid ${
                status === 'RELEASED' ? '#10b981' : status === 'ERROR' ? '#ef4444' : '#1e2d40'
              }`,
            }}
          >
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                letterSpacing: '0.1em',
                color: '#4a6080',
                marginBottom: 2,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: status === 'RELEASED' ? '#10b981' : status === 'ERROR' ? '#ef4444' : '#3b82f6',
              }}
            >
              {releasing ? 'RELEASING...' : status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

