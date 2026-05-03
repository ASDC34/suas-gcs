import React, { useEffect, useRef, useState } from 'react';
import { useMissionStore } from '../../store/missionStore';

const MISSION_DURATION_SEC = 45 * 60;

export const MissionTimer: React.FC = () => {
  const missionPhase = useMissionStore((s) => s.missionPhase);
  const setMissionPhase = useMissionStore((s) => s.setMissionPhase);
  const setTimerOvertimeSec = useMissionStore((s) => s.setTimerOvertimeSec);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setStartTime(Date.now());
    setIsRunning(true);
    if (missionPhase === 'SETUP') setMissionPhase('PREFLIGHT');
  };

  const stopTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resetTimer = () => {
    stopTimer();
    setElapsedSec(0);
    setStartTime(null);
  };

  useEffect(() => {
    if (!isRunning || !startTime) return;
    intervalRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, startTime]);

  useEffect(() => {
    const overtime =
      startTime != null && elapsedSec > MISSION_DURATION_SEC
        ? elapsedSec - MISSION_DURATION_SEC
        : 0;
    setTimerOvertimeSec(overtime);
  }, [elapsedSec, startTime, setTimerOvertimeSec]);

  const remainingSec = Math.max(0, MISSION_DURATION_SEC - elapsedSec);
  const isOvertime = elapsedSec > MISSION_DURATION_SEC;
  const overtimeSec = isOvertime ? elapsedSec - MISSION_DURATION_SEC : 0;

  const timerColor = isOvertime
    ? '#ef4444'
    : remainingSec < 120
      ? '#ef4444'
      : remainingSec < 300
        ? '#f97316'
        : remainingSec < 600
          ? '#f59e0b'
          : '#10b981';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const overtimePenaltyPct = (overtimeSec * 0.5).toFixed(1);

  return (
    <div className="hud-panel p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            letterSpacing: '0.15em',
            color: '#4a6080',
          }}
        >
          MİSYON SÜRESİ
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#4a6080' }}>
          Rule 3.1.1
        </div>
      </div>

      <div
        className="text-center py-1"
        style={{
          fontFamily: "'Rajdhani', monospace",
          fontSize: 48,
          fontWeight: 700,
          color: timerColor,
          letterSpacing: '0.05em',
          lineHeight: 1,
          animation: isOvertime ? 'blink-danger 0.6s ease-in-out infinite' : 'none',
          transition: 'color 0.3s',
        }}
      >
        {isOvertime ? `+${formatTime(overtimeSec)}` : formatTime(remainingSec)}
      </div>

      <div style={{ height: 4, backgroundColor: '#1e2d40', borderRadius: 2 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (elapsedSec / MISSION_DURATION_SEC) * 100)}%`,
            backgroundColor: timerColor,
            borderRadius: 2,
            transition: 'width 0.5s linear, background-color 0.3s',
          }}
        />
      </div>

      {isOvertime && (
        <div
          className="text-center animate-pulse"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            color: '#ef4444',
            backgroundColor: '#450a0a',
            border: '1px solid #7f1d1d',
            borderRadius: 3,
            padding: '4px 8px',
          }}
        >
          ⚠ SÜRE AŞIMI: −{overtimePenaltyPct}% CEZA (Rule 3.7)
        </div>
      )}

      {!isOvertime && remainingSec < 60 && remainingSec > 0 && (
        <div
          className="text-center animate-pulse"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            color: '#f59e0b',
            backgroundColor: '#451a03',
            border: '1px solid #78350f',
            borderRadius: 3,
            padding: '4px 8px',
          }}
        >
          ⚠ SON 1 DAKİKA — RTL HAZIRLA
        </div>
      )}

      <div className="flex gap-1.5">
        {!isRunning ? (
          <button
            onClick={startTimer}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: 3,
              border: '1px solid #10b981',
              backgroundColor: '#052e16',
              color: '#10b981',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            ▶ BAŞLAT
          </button>
        ) : (
          <button
            onClick={stopTimer}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: 3,
              border: '1px solid #f59e0b',
              backgroundColor: '#451a03',
              color: '#f59e0b',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ⏸ DURDUR
          </button>
        )}
        <button
          onClick={resetTimer}
          style={{
            padding: '6px 10px',
            borderRadius: 3,
            border: '1px solid #1e2d40',
            backgroundColor: '#0d1321',
            color: '#4a6080',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
};

