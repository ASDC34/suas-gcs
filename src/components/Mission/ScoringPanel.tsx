import React, { useState } from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { calculateScore, VTECH_DEFAULT_SCORING } from '../../utils/scoring';

export const ScoringPanel: React.FC = () => {
  const currentLap = useTelemetryStore((s) => s.currentLap);
  const bay1Status = useTelemetryStore((s) => s.bay1Status);
  const bay2Status = useTelemetryStore((s) => s.bay2Status);

  const [riskScore, setRiskScore] = useState(130);

  const scoring = calculateScore({
    ...VTECH_DEFAULT_SCORING,
    completedLaps: currentLap,
    hasSuccessfulTakeoffLanding: currentLap > 0,
    isFullyAutonomous: currentLap > 0,
    riskMappingScore: riskScore,
    bay1Survived: bay1Status === 'RELEASED',
    bay1WithinTarget: bay1Status === 'RELEASED',
    bay1CorrectTarget: bay1Status === 'RELEASED',
    bay2Survived: bay2Status === 'RELEASED',
    bay2WithinTarget: bay2Status === 'RELEASED',
    bay2CorrectTarget: bay2Status === 'RELEASED',
  });

  const categories = [
    { label: 'Dayanıklılık', score: scoring.enduranceScore, max: 250, color: '#3b82f6' },
    { label: 'Operatörler', score: scoring.operatorScore, max: 200, color: '#10b981' },
    { label: 'Hızlı Yanıt', score: scoring.rapidResponseScore, max: 200, color: '#f59e0b' },
    { label: 'Risk Harita', score: scoring.riskMappingScore, max: 150, color: '#a78bfa' },
    { label: 'Teslimat', score: scoring.deliveryScore, max: 200, color: '#f97316' },
  ];

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
        PUAN TAHMİNİ
      </div>

      <div className="text-center">
        <div
          style={{
            fontFamily: "'Rajdhani', monospace",
            fontSize: 36,
            fontWeight: 700,
            color: '#f0f4f8',
            lineHeight: 1,
          }}
        >
          ~{scoring.missionTotal}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#4a6080' }}>
          / 1000 görev puanı
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {categories.map(({ label, score, max, color }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#8ba3be' }}>
                {label}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color }}>
                {score}/{max}
              </span>
            </div>
            <div style={{ height: 4, backgroundColor: '#1e2d40', borderRadius: 2 }}>
              <div
                style={{
                  height: '100%',
                  width: `${(score / max) * 100}%`,
                  backgroundColor: color,
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            color: '#4a6080',
            marginBottom: 3,
          }}
        >
          <span>Risk harita tahmini</span>
          <span style={{ color: '#a78bfa' }}>{riskScore}/150</span>
        </div>
        <input
          type="range"
          min={0}
          max={150}
          value={riskScore}
          onChange={(e) => setRiskScore(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#a78bfa' }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 6px',
          backgroundColor: '#1e3a5f',
          border: '1px solid #1e40af',
          borderRadius: 3,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12,
        }}
      >
        <span style={{ color: '#8ba3be' }}>Toplam (dok. dahil)</span>
        <span style={{ color: '#3b82f6', fontWeight: 700 }}>~{scoring.grandTotal} / 1250</span>
      </div>
    </div>
  );
};

