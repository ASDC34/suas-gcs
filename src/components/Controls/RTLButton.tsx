import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useControlStore } from '../../store/controlStore';
import { useTelemetryStore } from '../../store/telemetryStore';

export const RTLButton: React.FC = () => {
  const inFlight = useTelemetryStore((s) => s.inFlight);
  const flightMode = useTelemetryStore((s) => s.flightMode);
  const batteryAlert = useTelemetryStore((s) => s.batteryAlert);
  const requestCommand = useControlStore((s) => s.requestCommand);

  const [holdProgress, setHoldProgress] = useState(0);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAlreadyRTL = flightMode === 'RTL' || flightMode === 'LAND';
  const isEmergency = batteryAlert === 'EMERGENCY';

  const handleClick = useCallback(() => {
    if (!inFlight || isAlreadyRTL) return;
    requestCommand('INITIATE_RTL', () => {
      // eslint-disable-next-line no-console
      console.log('MAVLink: DO_SET_MODE → RTL');
    });
  }, [inFlight, isAlreadyRTL, requestCommand]);

  const handleHoldStart = useCallback(() => {
    if (!inFlight || isAlreadyRTL) return;
    if (holdInterval.current) clearInterval(holdInterval.current);

    let progress = 0;
    holdInterval.current = setInterval(() => {
      progress += 100 / 30;
      const clamped = Math.min(100, progress);
      setHoldProgress(clamped);
      if (clamped >= 100) {
        if (holdInterval.current) clearInterval(holdInterval.current);
        // eslint-disable-next-line no-console
        console.log('🚨 EMERGENCY RTL — Hold triggered (no overlay)');
        setTimeout(() => setHoldProgress(0), 250);
      }
    }, 100);
  }, [inFlight, isAlreadyRTL]);

  const handleHoldEnd = useCallback(() => {
    if (holdInterval.current) clearInterval(holdInterval.current);
    setHoldProgress(0);
  }, []);

  const buttonColor = isEmergency ? '#dc2626' : isAlreadyRTL ? '#f97316' : '#dc2626';
  const buttonBg = isEmergency ? '#7f1d1d' : isAlreadyRTL ? '#431407' : '#450a0a';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="text-xs font-bold tracking-widest text-center"
        style={{
          color: isAlreadyRTL ? '#f97316' : '#ef4444',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.15em',
          fontSize: 9,
        }}
      >
        {isAlreadyRTL ? 'IN PROGRESS' : 'EMERGENCY'}
      </div>

      <div className="relative">
        <motion.button
          onClick={handleClick}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          disabled={!inFlight || isAlreadyRTL}
          whileHover={inFlight && !isAlreadyRTL ? { scale: 1.05 } : {}}
          whileTap={inFlight && !isAlreadyRTL ? { scale: 0.96 } : {}}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: buttonBg,
            border: `3px solid ${buttonColor}`,
            cursor: inFlight && !isAlreadyRTL ? 'pointer' : 'default',
            opacity: !inFlight ? 0.4 : 1,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            boxShadow: inFlight ? `0 0 0 3px ${buttonColor}30, 0 0 20px ${buttonColor}40` : 'none',
            transition: 'box-shadow 0.3s',
          }}
          animate={
            inFlight && isEmergency
              ? {
                  boxShadow: [
                    `0 0 0 3px ${buttonColor}30, 0 0 12px ${buttonColor}40`,
                    `0 0 0 6px ${buttonColor}50, 0 0 24px ${buttonColor}70`,
                    `0 0 0 3px ${buttonColor}30, 0 0 12px ${buttonColor}40`,
                  ],
                }
              : {}
          }
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          {holdProgress > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${holdProgress}%`,
                backgroundColor: '#ef444450',
                transition: 'height 0.1s linear',
              }}
            />
          )}

          <svg width="28" height="24" viewBox="0 0 28 24" style={{ position: 'relative', zIndex: 1 }}>
            <polygon
              points="14,2 26,12 22,12 22,22 16,22 16,16 12,16 12,22 6,22 6,12 2,12"
              fill={buttonColor}
              opacity="0.9"
            />
          </svg>

          <span
            style={{
              fontFamily: "'Rajdhani', monospace",
              fontSize: 13,
              fontWeight: 700,
              color: buttonColor,
              letterSpacing: '0.1em',
              position: 'relative',
              zIndex: 1,
            }}
          >
            RTL
          </span>
        </motion.button>

        {inFlight && !isAlreadyRTL && (
          <motion.div
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: `2px solid ${buttonColor}`,
              pointerEvents: 'none',
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      <div
        className="text-xs text-center"
        style={{
          color: '#4a6080',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          letterSpacing: '0.05em',
        }}
      >
        {!inFlight ? 'NOT IN FLIGHT' : isAlreadyRTL ? flightMode : 'HOLD 3s = INSTANT'}
      </div>

      <div
        className="text-xs text-center"
        style={{
          color: '#1e2d40',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
        }}
      >
        Ctrl+Shift+R
      </div>
    </div>
  );
};

