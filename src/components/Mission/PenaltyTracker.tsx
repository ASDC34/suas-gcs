import React, { useState } from 'react';

interface PenaltyType {
  id: string;
  label: string;
  rule: string;
  points: number;
  /** Süre bazlı olanlar liste dışında ayrılır */
  perSecond: boolean;
}

const PENALTY_TYPES: PenaltyType[] = [
  { id: 'overtime', label: 'Süre Aşımı', rule: '3.7', points: 0, perSecond: true },
  {
    id: 'parts_off',
    label: 'Parça Düştü',
    rule: '3.7',
    points: 100,
    perSecond: false,
  },
  {
    id: 'crash',
    label: 'Kaza/Çarpışma',
    rule: '3.7',
    points: 500,
    perSecond: false,
  },
  {
    id: 'unsafe',
    label: 'Güvensiz Operasyon',
    rule: '3.7',
    points: 500,
    perSecond: false,
  },
  {
    id: 'out_of_bounds',
    label: 'Sınır İhlali',
    rule: '3.7',
    points: 9999,
    perSecond: false,
  },
];

const ROUND_PENALTIES = PENALTY_TYPES.filter((p) => !p.perSecond);

/** Süre başına yaklaşık ceza çarpanı (özet dokümana uyumlu). */
const OVERTIME_PTS_PER_SEC = 5;

export const PenaltyTracker: React.FC = () => {
  const [penalties, setPenalties] = useState<Record<string, number>>({});
  const [overtimeSec, setOvertimeSec] = useState(0);

  const instantaneousTotal = Object.values(penalties).reduce((a, b) => a + b, 0);

  const overtimePts = Math.round(overtimeSec * OVERTIME_PTS_PER_SEC);

  const totalPenalty = instantaneousTotal + overtimePts;

  const addPenalty = (id: string, points: number) => {
    setPenalties((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + points }));
  };

  const hasAnyInstantPenalty = instantaneousTotal > 0;

  return (
    <div className="hud-panel flex min-w-0 flex-col gap-2 p-3">
      <div
        className="min-w-0"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          letterSpacing: '0.12em',
          color: totalPenalty > 0 ? '#ef4444' : '#4a6080',
          lineHeight: 1.35,
          overflowWrap: 'anywhere',
        }}
      >
        CEZA TAKİBİ
        {totalPenalty > 0 && (
          <>
            {' '}
            <span style={{ letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              — −{totalPenalty} PTS
            </span>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            color: '#8ba3be',
            flex: '1 1 120px',
            minWidth: 0,
            lineHeight: 1.35,
          }}
        >
          Süre aşımı (sn)
        </span>
        <input
          type="number"
          min={0}
          value={overtimeSec}
          aria-label="Süre aşımı saniye"
          onChange={(e) => setOvertimeSec(Math.max(0, Number(e.target.value) || 0))}
          style={{
            width: 72,
            maxWidth: '100%',
            padding: '2px 6px',
            backgroundColor: '#0d1321',
            border: '1px solid #1e2d40',
            borderRadius: 3,
            color: overtimeSec > 0 ? '#ef4444' : '#f0f4f8',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            flexShrink: 0,
          }}
        />
      </div>
      {overtimeSec > 0 && (
        <div className="hud-mono text-[10px]" style={{ color: '#4a6080', marginTop: -4 }}>
          +{overtimePts} pts (oran {OVERTIME_PTS_PER_SEC}/s)
        </div>
      )}

      {ROUND_PENALTIES.map((penalty) => (
        <div
          key={penalty.id}
          className="min-w-0"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 6px',
            backgroundColor: penalties[penalty.id] ? '#450a0a' : '#0d1321',
            border: `1px solid ${penalties[penalty.id] ? '#7f1d1d' : '#1e2d40'}`,
            borderRadius: 3,
          }}
        >
          <span
            title={penalty.label}
            className="min-w-0 flex-1"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              color: penalties[penalty.id] ? '#fca5a5' : '#8ba3be',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {penalty.label}
          </span>
          <span
            className="hud-mono shrink-0"
            style={{
              fontSize: 10,
              color: '#4a6080',
              whiteSpace: 'nowrap',
            }}
          >
            −{penalty.points === 9999 ? 'SONLANDIRMA' : `${penalty.points} pts`}
          </span>
          <button
            type="button"
            onClick={() => addPenalty(penalty.id, penalty.points)}
            style={{
              padding: '2px 8px',
              borderRadius: 3,
              border: '1px solid #7f1d1d',
              backgroundColor: '#450a0a',
              color: '#ef4444',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            +
          </button>
        </div>
      ))}

      {hasAnyInstantPenalty && (
        <button
          type="button"
          onClick={() => setPenalties({})}
          className="text-[10px]"
          style={{
            alignSelf: 'flex-start',
            padding: '2px 6px',
            borderRadius: 3,
            border: '1px solid #1e2d40',
            backgroundColor: '#070b14',
            color: '#4a6080',
            fontFamily: "'Barlow Condensed', sans-serif",
            cursor: 'pointer',
          }}
        >
          Anlık cezaları sıfırla
        </button>
      )}

      {totalPenalty > 0 && (
        <div
          style={{
            padding: '6px',
            backgroundColor: '#450a0a',
            border: '1px solid #7f1d1d',
            borderRadius: 3,
            textAlign: 'center',
            fontFamily: "'Rajdhani', monospace",
            fontSize: 18,
            fontWeight: 700,
            color: '#ef4444',
            lineHeight: 1.2,
          }}
        >
          TOPLAM CEZA: −{totalPenalty} PTS
        </div>
      )}
    </div>
  );
};
