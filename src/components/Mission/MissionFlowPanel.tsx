import React from 'react';
import { useMissionStore } from '../../store/missionStore';
import { useTelemetryStore } from '../../store/telemetryStore';

const FLOW_STEPS = [
  { step: 1, label: 'Kurulum & GCS', detail: '~3-4 dk', rule: '3.0.6' },
  { step: 2, label: 'Otonom Kalkış', detail: '~1 dk', rule: '3.2.1' },
  { step: 3, label: '9-10 Tur', detail: '~27-31 dk', rule: '3.2.2' },
  { step: 4, label: 'Risk Harita', detail: '~6-8 dk', rule: '3.5' },
  { step: 5, label: 'Bay 1 (Beacon)', detail: '~2 dk', rule: '3.6' },
  { step: 6, label: 'Bay 2 (Şişe)', detail: '~2 dk', rule: '3.6' },
  { step: 7, label: 'RTL & İniş', detail: '~2 dk', rule: '3.2.1' },
  { step: 8, label: 'USB Harita Teslim', detail: '<1 dk', rule: '3.5.1' },
] as const;

export const MissionFlowPanel: React.FC = () => {
  const missionPhase = useMissionStore((s) => s.missionPhase);
  const currentLap = useTelemetryStore((s) => s.currentLap);
  const bay1Status = useTelemetryStore((s) => s.bay1Status);
  const bay2Status = useTelemetryStore((s) => s.bay2Status);

  const getStepStatus = (step: number): 'completed' | 'active' | 'pending' => {
    if (missionPhase === 'COMPLETE') return 'completed';

    if (step === 1) {
      if (missionPhase === 'SETUP' || missionPhase === 'PREFLIGHT') return 'active';
      return 'completed';
    }

    const afterTakeoff =
      missionPhase === 'LAPS' ||
      missionPhase === 'SURVEY' ||
      missionPhase === 'DELIVERY' ||
      missionPhase === 'RTL';

    if (step === 2) {
      if (missionPhase === 'TAKEOFF') return 'active';
      return afterTakeoff ? 'completed' : 'pending';
    }

    if (step === 3) {
      if (missionPhase === 'LAPS') return 'active';
      return missionPhase === 'SURVEY' ||
        missionPhase === 'DELIVERY' ||
        missionPhase === 'RTL'
        ? 'completed'
        : 'pending';
    }

    if (step === 4) {
      if (missionPhase === 'SURVEY') return 'active';
      return missionPhase === 'DELIVERY' || missionPhase === 'RTL'
        ? 'completed'
        : 'pending';
    }

    if (step === 5) {
      if (missionPhase === 'DELIVERY' && bay1Status !== 'RELEASED') return 'active';
      if (bay1Status === 'RELEASED' || missionPhase === 'RTL')
        return 'completed';
      return 'pending';
    }

    if (step === 6) {
      if (
        missionPhase === 'DELIVERY' &&
        bay1Status === 'RELEASED' &&
        bay2Status !== 'RELEASED'
      )
        return 'active';
      if (bay2Status === 'RELEASED' || missionPhase === 'RTL')
        return 'completed';
      return 'pending';
    }

    if (step === 7) {
      if (missionPhase === 'RTL') return 'active';
      return 'pending';
    }

    if (step === 8) {
      return 'pending';
    }

    return 'pending';
  };

  return (
    <div className="hud-panel flex min-w-0 flex-col gap-1 p-3">
      <div
        className="mb-1 min-w-0"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          letterSpacing: '0.12em',
          color: '#4a6080',
          whiteSpace: 'normal',
          lineHeight: 1.35,
          overflowWrap: 'anywhere',
        }}
      >
        GÖREV AKIŞI — Rule 3.0.9
      </div>

      {FLOW_STEPS.map(({ step, label, detail }) => {
        const status = getStepStatus(step);
        const color =
          status === 'completed'
            ? '#10b981'
            : status === 'active'
              ? '#f59e0b'
              : '#2a4060';

        const subtitle =
          step === 3 && currentLap > 0 ? (
            <div
              className="mt-0.5 hud-mono text-[9px]"
              style={{ color: '#4a6080' }}
            >
              Şu tur: {currentLap}
            </div>
          ) : null;

        return (
          <div
            key={step}
            className="min-w-0"
            title={`Rule ${FLOW_STEPS[step - 1]?.rule ?? ''}`}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 8,
              padding: '4px 6px',
              borderRadius: 3,
              backgroundColor:
                status === 'active' ? '#451a03' : status === 'completed' ? '#052e16' : 'transparent',
              border:
                status === 'active'
                  ? '1px solid #78350f'
                  : status === 'completed'
                    ? '1px solid #064e3b'
                    : '1px solid transparent',
            }}
          >
            <div
              style={{
                width: 22,
                minWidth: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: color + '33',
                border: `1px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Rajdhani', monospace",
                fontSize: 11,
                fontWeight: 700,
                color,
                flexShrink: 0,
                alignSelf: 'center',
              }}
            >
              {status === 'completed' ? '✓' : step}
            </div>

            <div className="min-w-0 flex-1 overflow-hidden py-px">
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  color: status === 'pending' ? '#4a6080' : color,
                  fontWeight: status === 'active' ? 700 : 400,
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
              {subtitle}
            </div>

            <div
              className="hud-mono shrink-0 self-start pt-px text-[9px] text-hud-dim"
              style={{
                color: '#4a6080',
                maxWidth: '38%',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {detail}
            </div>
          </div>
        );
      })}
    </div>
  );
};
