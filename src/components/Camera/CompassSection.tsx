import React, { useMemo } from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';

export const CompassSection: React.FC = () => {
  const heading = useTelemetryStore((s) => s.heading);
  const climbRate = useTelemetryStore((s) => s.climbRate);
  const airspeedMs = useTelemetryStore((s) => s.airspeedMs);
  const gpsFixType = useTelemetryStore((s) => s.gpsFixType);

  const headingText = useMemo(() => {
    if (heading < 22.5 || heading >= 337.5) return 'K';
    if (heading < 67.5) return 'KD';
    if (heading < 112.5) return 'D';
    if (heading < 157.5) return 'GD';
    if (heading < 202.5) return 'G';
    if (heading < 247.5) return 'GB';
    if (heading < 292.5) return 'B';
    return 'KB';
  }, [heading]);

  const SIZE = 80;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 6;

  const headingRad = (heading - 90) * (Math.PI / 180);
  const arrowX = CENTER + RADIUS * 0.6 * Math.cos(headingRad);
  const arrowY = CENTER + RADIUS * 0.6 * Math.sin(headingRad);

  return (
    <div
      style={{
        backgroundColor: '#0d1321',
        border: '1px solid #1e2d40',
        borderRadius: 4,
        padding: '8px',
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10,
          letterSpacing: '0.12em',
          color: '#4a6080',
          marginBottom: 6,
        }}
      >
        COMPASS + IMU
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#070b14" stroke="#1e2d40" strokeWidth={1} />

          {(['K', 'D', 'G', 'B'] as const).map((dir, i) => {
            const angle = i * 90 * (Math.PI / 180) - Math.PI / 2;
            const tx = CENTER + (RADIUS - 8) * Math.cos(angle);
            const ty = CENTER + (RADIUS - 8) * Math.sin(angle);
            return (
              <text
                key={dir}
                x={tx}
                y={ty + 3}
                textAnchor="middle"
                fontSize={8}
                fill={dir === 'K' ? '#ef4444' : '#4a6080'}
                fontFamily="'Barlow Condensed', sans-serif"
                fontWeight="700"
              >
                {dir}
              </text>
            );
          })}

          {Array.from({ length: 36 }, (_, i) => {
            const angle = (i * 10 - 90) * (Math.PI / 180);
            const inner = i % 9 === 0 ? RADIUS - 12 : RADIUS - 6;
            return (
              <line
                key={i}
                x1={CENTER + inner * Math.cos(angle)}
                y1={CENTER + inner * Math.sin(angle)}
                x2={CENTER + (RADIUS - 2) * Math.cos(angle)}
                y2={CENTER + (RADIUS - 2) * Math.sin(angle)}
                stroke={i % 9 === 0 ? '#2a4060' : '#1e2d40'}
                strokeWidth={i % 9 === 0 ? 1.2 : 0.7}
              />
            );
          })}

          <line
            x1={CENTER}
            y1={CENTER}
            x2={arrowX}
            y2={arrowY}
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={arrowX} cy={arrowY} r={3} fill="#3b82f6" />

          <circle cx={CENTER} cy={CENTER} r={4} fill="#1e2d40" stroke="#3b82f6" strokeWidth={1} />

          <text
            x={CENTER}
            y={CENTER + 14}
            textAnchor="middle"
            fontSize={13}
            fill="#f0f4f8"
            fontFamily="'Rajdhani', monospace"
            fontWeight="700"
          >
            {Math.round(heading)}°
          </text>
          <text
            x={CENTER}
            y={CENTER + 24}
            textAnchor="middle"
            fontSize={8}
            fill="#4a6080"
            fontFamily="'Barlow Condensed', sans-serif"
          >
            {headingText}
          </text>
        </svg>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          {[
            { label: 'HAVA HIZI', value: `${airspeedMs.toFixed(1)} m/s`, color: '#3b82f6' },
            {
              label: 'TIRMANMA',
              value: `${climbRate > 0 ? '+' : ''}${climbRate.toFixed(1)} ft/s`,
              color: climbRate > 0 ? '#10b981' : climbRate < -1 ? '#f59e0b' : '#8ba3be',
            },
            {
              label: 'GPS FIX',
              value: gpsFixType,
              color: gpsFixType === 'RTK_FIXED' ? '#10b981' : '#f59e0b',
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  color: '#4a6080',
                  letterSpacing: '0.08em',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "'Rajdhani', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
