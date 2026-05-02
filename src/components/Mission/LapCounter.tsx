import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { calculateScore, VTECH_DEFAULT_SCORING } from '../../utils/scoring';

export const LapCounter: React.FC = () => {
  const currentLap = useTelemetryStore((s) => s.currentLap);
  const totalLapsTarget = useTelemetryStore((s) => s.totalLapsTarget);
  const bay1Status = useTelemetryStore((s) => s.bay1Status);
  const bay2Status = useTelemetryStore((s) => s.bay2Status);

  const scoring = calculateScore({
    ...VTECH_DEFAULT_SCORING,
    completedLaps: currentLap,
    hasSuccessfulTakeoffLanding: currentLap > 0,
    isFullyAutonomous: currentLap > 0,
    bay1Survived: bay1Status === 'RELEASED',
    bay1WithinTarget: bay1Status === 'RELEASED',
    bay1CorrectTarget: bay1Status === 'RELEASED',
    bay2Survived: bay2Status === 'RELEASED',
    bay2WithinTarget: bay2Status === 'RELEASED',
    bay2CorrectTarget: bay2Status === 'RELEASED',
  });

  const lapProgress = (currentLap / totalLapsTarget) * 100;

  return (
    <div className="hud-panel p-3 flex flex-col gap-2">
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          letterSpacing: '0.15em',
          color: '#4a6080',
        }}
      >
        TURLAR & PUAN
      </div>

      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontFamily: "'Rajdhani', monospace",
            fontSize: 48,
            fontWeight: 700,
            color: '#3b82f6',
            lineHeight: 1,
          }}
        >
          {currentLap}
        </span>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: '#4a6080' }}>
          / {totalLapsTarget} tur
        </span>
      </div>

      <div style={{ height: 6, backgroundColor: '#1e2d40', borderRadius: 3 }}>
        <div
          style={{
            height: '100%',
            width: `${lapProgress}%`,
            backgroundColor: lapProgress >= 100 ? '#10b981' : '#3b82f6',
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4a6080' }}>
        {[7, 8, 9, 10].map((laps) => {
          const pts = Math.round(200 * (laps / 10) ** 2);
          const isCurrent = laps === currentLap;
          const isTarget = laps === totalLapsTarget;
          return (
            <div
              key={laps}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2px 6px',
                borderRadius: 2,
                backgroundColor: isCurrent ? '#1e3a5f' : isTarget ? '#052e16' : 'transparent',
                color: isCurrent ? '#3b82f6' : isTarget ? '#10b981' : '#4a6080',
                marginBottom: 1,
              }}
            >
              <span>{laps} tur</span>
              <span>{pts + 50} puan</span>
              {isTarget && <span>← hedef</span>}
              {isCurrent && !isTarget && <span>← şimdi</span>}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 6px',
          backgroundColor: '#052e16',
          border: '1px solid #064e3b',
          borderRadius: 3,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12,
        }}
      >
        <span style={{ color: '#8ba3be' }}>Dayanıklılık</span>
        <span style={{ color: '#10b981', fontWeight: 700 }}>{scoring.enduranceScore} / 250</span>
      </div>
    </div>
  );
};

