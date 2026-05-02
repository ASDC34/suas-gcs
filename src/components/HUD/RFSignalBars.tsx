import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';

interface SignalBarsProps {
  quality: number;
  label: string;
  snrDb?: number;
}

const SignalBars: React.FC<SignalBarsProps> = React.memo(({ quality, label, snrDb }) => {
  const thresholds = [20, 40, 60, 80, 100];
  const barHeights = [8, 12, 18, 24, 32];

  const barColor =
    quality >= 60 ? '#10b981' : quality >= 40 ? '#f59e0b' : quality >= 20 ? '#f97316' : '#ef4444';

  const isLowSnr = snrDb !== undefined && snrDb < 10;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-0.5" style={{ height: 36 }}>
        {thresholds.map((threshold, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: barHeights[i],
              borderRadius: 2,
              backgroundColor: quality >= threshold ? barColor : '#1e2d40',
              transition: 'background-color 0.3s',
              border: isLowSnr && quality >= threshold ? `1px solid #ef4444` : 'none',
            }}
          />
        ))}
      </div>

      <span className="text-xs text-hud-dim tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {label}
      </span>

      <span className="text-xs hud-mono" style={{ color: barColor }}>
        {Math.round(quality)}%
      </span>

      {isLowSnr && (
        <div
          className="text-xs text-red-500 text-center animate-pulse"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10 }}
        >
          LOW SNR
          <br />
          {snrDb?.toFixed(0)}dB
          <br />⚠ REALIGN
        </div>
      )}
    </div>
  );
});

export const RFSignalBars: React.FC = React.memo(() => {
  const rfLinkQuality = useTelemetryStore((s) => s.rfLinkQuality);
  const rfSnrDb = useTelemetryStore((s) => s.rfSnrDb);

  return (
    <div className="hud-panel p-3">
      <div
        className="text-xs font-semibold tracking-widest uppercase text-hud-secondary mb-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        RF Link
      </div>
      <div className="flex justify-around">
        <SignalBars quality={rfLinkQuality} label="TEL" snrDb={rfSnrDb} />
        <SignalBars quality={Math.min(100, rfLinkQuality + 5)} label="RC" />
      </div>
    </div>
  );
});

RFSignalBars.displayName = 'RFSignalBars';

