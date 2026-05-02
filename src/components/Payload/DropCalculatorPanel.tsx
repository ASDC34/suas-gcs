import React, { useMemo, useState } from 'react';
import { useMissionStore } from '../../store/missionStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import { calculateDropPoint } from '../../utils/ballisticDrop';

export const DropCalculatorPanel: React.FC = () => {
  const altitudeAGL = useTelemetryStore((s) => s.altitudeAGL);
  const airspeedMs = useTelemetryStore((s) => s.airspeedMs);
  const headingDeg = useTelemetryStore((s) => s.heading);

  const tentLocation = useMissionStore((s) => s.detectedTentLocation);
  const mannequinLocation = useMissionStore((s) => s.detectedMannequinLocation);

  const [windSpeedMs, setWindSpeedMs] = useState(6.3);
  const [windDirectionDeg, setWindDirectionDeg] = useState(270);

  const bay1Result = useMemo(() => {
    if (!tentLocation) return null;
    return calculateDropPoint({
      targetLat: tentLocation.lat,
      targetLon: tentLocation.lon,
      releaseAltitudeFt: Math.max(150, altitudeAGL),
      windSpeedMs,
      windDirectionDeg,
      airspeedMs,
      headingDeg,
    });
  }, [tentLocation, altitudeAGL, windSpeedMs, windDirectionDeg, airspeedMs, headingDeg]);

  const bay2Result = useMemo(() => {
    if (!mannequinLocation) return null;
    return calculateDropPoint({
      targetLat: mannequinLocation.lat,
      targetLon: mannequinLocation.lon,
      releaseAltitudeFt: Math.max(150, altitudeAGL),
      windSpeedMs,
      windDirectionDeg,
      airspeedMs,
      headingDeg,
    });
  }, [mannequinLocation, altitudeAGL, windSpeedMs, windDirectionDeg, airspeedMs, headingDeg]);

  const dirLabel =
    windDirectionDeg === 270
      ? 'Batı'
      : windDirectionDeg === 0
        ? 'Kuzey'
        : windDirectionDeg === 90
          ? 'Doğu'
          : windDirectionDeg === 180
            ? 'Güney'
            : '?';

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
        BALİSTİK HESAPLAYICI
      </div>

      <div className="flex flex-col gap-1">
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#4a6080' }}>
          Rüzgar Hızı: {windSpeedMs.toFixed(1)} m/s ({(windSpeedMs * 2.237).toFixed(1)} mph)
        </div>
        <input
          type="range"
          min={0}
          max={15}
          step={0.1}
          value={windSpeedMs}
          onChange={(e) => setWindSpeedMs(Number(e.target.value))}
          style={{ accentColor: '#3b82f6' }}
        />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#4a6080' }}>
          Rüzgar Yönü: {windDirectionDeg}° ({dirLabel})
        </div>
        <input
          type="range"
          min={0}
          max={359}
          value={windDirectionDeg}
          onChange={(e) => setWindDirectionDeg(Number(e.target.value))}
          style={{ accentColor: '#f59e0b' }}
        />
      </div>

      <div
        style={{
          padding: '8px',
          backgroundColor: bay1Result ? '#1e3a5f' : '#0d1321',
          border: `1px solid ${bay1Result ? '#3b82f6' : '#1e2d40'}`,
          borderRadius: 3,
        }}
      >
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#3b82f6', marginBottom: 4 }}>
          BAY 1 — Beacon → Çadır
        </div>
        {bay1Result ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8ba3be', lineHeight: 1.6 }}>
            <div>Düşüş: {bay1Result.fallTimeSec.toFixed(1)}s</div>
            <div>Drift: {bay1Result.totalDriftM.toFixed(1)}m</div>
            <div>±{bay1Result.confidenceRadiusM.toFixed(1)}m güven</div>
            <div style={{ color: '#10b981', marginTop: 2 }}>
              Release: {bay1Result.releaseLat.toFixed(5)}°N
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#4a6080' }}>
            Çadır hedefi tespit bekleniyor...
          </div>
        )}
      </div>

      <div
        style={{
          padding: '8px',
          backgroundColor: bay2Result ? '#2d1b69' : '#0d1321',
          border: `1px solid ${bay2Result ? '#a78bfa' : '#1e2d40'}`,
          borderRadius: 3,
        }}
      >
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#a78bfa', marginBottom: 4 }}>
          BAY 2 — Şişe → Manken
        </div>
        {bay2Result ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8ba3be', lineHeight: 1.6 }}>
            <div>Düşüş: {bay2Result.fallTimeSec.toFixed(1)}s</div>
            <div>Drift: {bay2Result.totalDriftM.toFixed(1)}m</div>
            <div>±{bay2Result.confidenceRadiusM.toFixed(1)}m güven</div>
            <div style={{ color: '#a78bfa', marginTop: 2 }}>
              Release: {bay2Result.releaseLat.toFixed(5)}°N
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#4a6080' }}>
            Manken hedefi tespit bekleniyor...
          </div>
        )}
      </div>

      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#4a6080', textAlign: 'center' }}>
        Mevcut irtifa: {Math.round(altitudeAGL)}ft AGL (min 150ft — Rule 3.0.4)
      </div>
    </div>
  );
};

