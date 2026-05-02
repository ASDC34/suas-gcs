import React, { useMemo } from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';

const STRIP_WIDTH = 72;
const STRIP_HEIGHT = 480;
const MIN_ALT = 0;
const MAX_ALT = 500;
const FLOOR_FT = 150;
const CEILING_FT = 400;

function altToY(alt: number): number {
  const clamped = Math.max(MIN_ALT, Math.min(MAX_ALT, alt));
  return STRIP_HEIGHT - (clamped / MAX_ALT) * STRIP_HEIGHT;
}

export const AltitudeStrip: React.FC = React.memo(() => {
  const altitudeAGL = useTelemetryStore((s) => s.altitudeAGL);
  const inFlight = useTelemetryStore((s) => s.inFlight);

  const coords = useMemo(() => {
    const currentY = altToY(altitudeAGL);
    const floorY = altToY(FLOOR_FT);
    const ceilY = altToY(CEILING_FT);
    return { currentY, floorY, ceilY };
  }, [altitudeAGL]);

  const isBelow = altitudeAGL < FLOOR_FT && inFlight;
  const isAbove = altitudeAGL > CEILING_FT && inFlight;
  const isDanger = isBelow || isAbove;
  const displayAlt = Math.round(altitudeAGL);

  return (
    <div
      className={`relative flex flex-col items-center ${isDanger ? 'animate-blink-danger' : ''}`}
      style={{ width: STRIP_WIDTH, height: STRIP_HEIGHT }}
      role="meter"
      aria-label={`İrtifa: ${displayAlt} feet AGL`}
      aria-valuenow={displayAlt}
      aria-valuemin={0}
      aria-valuemax={500}
    >
      <svg
        width={STRIP_WIDTH}
        height={STRIP_HEIGHT}
        viewBox={`0 0 ${STRIP_WIDTH} ${STRIP_HEIGHT}`}
        style={{ display: 'block' }}
      >
        <rect x={0} y={0} width={STRIP_WIDTH} height={coords.ceilY} fill="#450a0a" />
        <rect
          x={0}
          y={coords.ceilY}
          width={STRIP_WIDTH}
          height={coords.floorY - coords.ceilY}
          fill="#052e16"
        />
        <rect
          x={0}
          y={coords.floorY}
          width={STRIP_WIDTH}
          height={STRIP_HEIGHT - coords.floorY}
          fill="#450a0a"
        />

        <defs>
          <pattern
            id="hatch-danger"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#7f1d1d" strokeWidth="2" />
          </pattern>
        </defs>

        <rect
          x={0}
          y={0}
          width={STRIP_WIDTH}
          height={coords.ceilY}
          fill="url(#hatch-danger)"
          opacity={0.4}
        />
        <rect
          x={0}
          y={coords.floorY}
          width={STRIP_WIDTH}
          height={STRIP_HEIGHT - coords.floorY}
          fill="url(#hatch-danger)"
          opacity={0.4}
        />

        <line
          x1={0}
          y1={coords.ceilY}
          x2={STRIP_WIDTH}
          y2={coords.ceilY}
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <text
          x={STRIP_WIDTH / 2}
          y={coords.ceilY - 5}
          textAnchor="middle"
          fontSize={9}
          fill="#ef4444"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="600"
        >
          400'
        </text>

        <line
          x1={0}
          y1={coords.floorY}
          x2={STRIP_WIDTH}
          y2={coords.floorY}
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <text
          x={STRIP_WIDTH / 2}
          y={coords.floorY + 12}
          textAnchor="middle"
          fontSize={9}
          fill="#ef4444"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="600"
        >
          150'
        </text>

        {[50, 100, 200, 250, 300, 350, 450].map((alt) => (
          <g key={alt}>
            <line
              x1={STRIP_WIDTH - 12}
              y1={altToY(alt)}
              x2={STRIP_WIDTH}
              y2={altToY(alt)}
              stroke="#2a4060"
              strokeWidth={1}
            />
            <text
              x={STRIP_WIDTH - 14}
              y={altToY(alt) + 4}
              textAnchor="end"
              fontSize={8}
              fill="#4a6080"
              fontFamily="'JetBrains Mono', monospace"
            >
              {alt}
            </text>
          </g>
        ))}

        <line
          x1={0}
          y1={coords.currentY}
          x2={STRIP_WIDTH}
          y2={coords.currentY}
          stroke={isDanger ? '#ef4444' : '#10b981'}
          strokeWidth={2}
        />

        <polygon
          points={`
            ${STRIP_WIDTH},${coords.currentY}
            ${STRIP_WIDTH - 14},${coords.currentY - 7}
            ${STRIP_WIDTH - 14},${coords.currentY + 7}
          `}
          fill={isDanger ? '#ef4444' : '#10b981'}
        />

        <rect
          x={2}
          y={coords.currentY - 12}
          width={38}
          height={24}
          rx={2}
          fill={isDanger ? '#7f1d1d' : '#064e3b'}
          stroke={isDanger ? '#ef4444' : '#10b981'}
          strokeWidth={1}
        />
        <text
          x={21}
          y={coords.currentY + 4}
          textAnchor="middle"
          fontSize={12}
          fill={isDanger ? '#ef4444' : '#10b981'}
          fontFamily="'Rajdhani', monospace"
          fontWeight="700"
        >
          {displayAlt}
        </text>

        {coords.ceilY > 30 && (
          <text
            x={STRIP_WIDTH / 2}
            y={coords.ceilY / 2}
            textAnchor="middle"
            fontSize={9}
            fill="#7f1d1d"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="600"
            transform={`rotate(-90, ${STRIP_WIDTH / 2}, ${coords.ceilY / 2})`}
          >
            CEILING
          </text>
        )}

        <text
          x={STRIP_WIDTH / 2}
          y={(coords.ceilY + coords.floorY) / 2}
          textAnchor="middle"
          fontSize={8}
          fill="#10b981"
          fontFamily="'Barlow Condensed', sans-serif"
          fontWeight="600"
          opacity={0.7}
          transform={`rotate(-90, ${STRIP_WIDTH / 2}, ${(coords.ceilY + coords.floorY) / 2})`}
        >
          FLIGHT WINDOW
        </text>

        {STRIP_HEIGHT - coords.floorY > 30 && (
          <text
            x={STRIP_WIDTH / 2}
            y={(coords.floorY + STRIP_HEIGHT) / 2}
            textAnchor="middle"
            fontSize={9}
            fill="#7f1d1d"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="600"
            transform={`rotate(-90, ${STRIP_WIDTH / 2}, ${(coords.floorY + STRIP_HEIGHT) / 2})`}
          >
            FLOOR
          </text>
        )}

        <line
          x1={0}
          y1={coords.ceilY}
          x2={0}
          y2={coords.floorY}
          stroke="#10b981"
          strokeWidth={3}
          opacity={0.6}
        />
      </svg>

      {isDanger && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
          <div
            className="text-red-500 text-xs font-bold text-center px-1 animate-pulse"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.05em',
              whiteSpace: 'pre-line',
            }}
          >
            {isBelow ? '⚠ BELOW\nFLOOR' : '⚠ ABOVE\nCEIL'}
          </div>
        </div>
      )}
    </div>
  );
});

AltitudeStrip.displayName = 'AltitudeStrip';

