import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useMissionStore, Waypoint } from '../../store/missionStore';

export const WaypointEditorPanel: React.FC = () => {
  const selectedId = useMissionStore((s) => s.selectedWaypointId);
  const activeRunway = useMissionStore((s) => s.activeRunway);
  const rwy1 = useMissionStore((s) => s.rwy1);
  const rwy2 = useMissionStore((s) => s.rwy2);
  const selectWaypoint = useMissionStore((s) => s.selectWaypoint);
  const updateWaypoint = useMissionStore((s) => s.updateWaypoint);

  const activeSet = activeRunway === 'RWY1' ? rwy1 : rwy2;
  const waypoint = activeSet.waypoints.find((wp) => wp.id === selectedId);

  const [localAlt, setLocalAlt] = useState(waypoint?.altitudeFt ?? 200);
  const [localType, setLocalType] = useState<Waypoint['type']>(waypoint?.type ?? 'NORMAL');
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (waypoint) {
      setLocalAlt(waypoint.altitudeFt);
      setLocalType(waypoint.type);
      setSaved(false);
    }
  }, [waypoint]);

  const handleApply = useCallback(() => {
    if (!selectedId) return;
    updateWaypoint(selectedId, {
      altitudeFt: localAlt,
      type: localType,
    });
    // eslint-disable-next-line no-console
    console.log(`MAVLink: SET_MISSION_ITEM wp=${selectedId} alt=${localAlt}ft type=${localType}`);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [selectedId, localAlt, localType, updateWaypoint]);

  return (
    <AnimatePresence>
      {selectedId && waypoint && (
        <motion.div
          key="waypoint-editor"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 z-50 hud-panel"
          style={{
            borderTop: '1px solid #1e2d40',
            borderRadius: '4px 4px 0 0',
            padding: '12px 16px',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="text-sm font-bold"
                style={{
                  color: '#f59e0b',
                  fontFamily: "'Rajdhani', monospace",
                  letterSpacing: '0.05em',
                }}
              >
                WP{waypoint.index} EDITOR
              </div>
              <div
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: '#1e3a5f',
                  color: '#3b82f6',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                }}
              >
                {waypoint.lat.toFixed(5)}°N · {Math.abs(waypoint.lon).toFixed(5)}°W
              </div>
            </div>
            <button
              onClick={() => selectWaypoint(null)}
              style={{ color: '#4a6080', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
              <label
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#8ba3be', fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Altitude AGL (ft)
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={150}
                  max={400}
                  step={10}
                  value={localAlt}
                  onChange={(e) => setLocalAlt(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#3b82f6' }}
                />
                <input
                  type="number"
                  min={150}
                  max={400}
                  value={localAlt}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 150 && v <= 400) setLocalAlt(v);
                  }}
                  className="hud-number text-center rounded"
                  style={{
                    width: 60,
                    fontSize: 18,
                    backgroundColor: '#0d1321',
                    color: '#f0f4f8',
                    border: '1px solid #1e2d40',
                    padding: '2px 4px',
                  }}
                />
              </div>

              <div className="flex justify-between text-xs" style={{ color: '#4a6080' }}>
                <span>150' min</span>
                <span>400' max</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#8ba3be', fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Waypoint Type
              </label>
              <div className="flex flex-col gap-1">
                {(['NORMAL', 'LOITER', 'SURVEY_ENTRY', 'DELIVERY'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLocalType(type)}
                    className="px-3 py-1 text-xs rounded text-left transition-all"
                    style={{
                      backgroundColor: localType === type ? '#1e3a5f' : '#0d1321',
                      color: localType === type ? '#3b82f6' : '#4a6080',
                      border: `1px solid ${localType === type ? '#3b82f6' : '#1e2d40'}`,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-auto">
              <button
                onClick={handleApply}
                className="px-6 py-2 rounded font-bold text-sm transition-all"
                style={{
                  backgroundColor: saved ? '#052e16' : '#1e3a5f',
                  color: saved ? '#10b981' : '#3b82f6',
                  border: `1px solid ${saved ? '#10b981' : '#3b82f6'}`,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                {saved ? '✓ APPLIED' : 'APPLY'}
              </button>
              <button
                onClick={() => selectWaypoint(null)}
                className="px-4 py-2 rounded text-xs"
                style={{
                  backgroundColor: '#0d1321',
                  color: '#4a6080',
                  border: '1px solid #1e2d40',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>

              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => {
                    const prev = activeSet.waypoints.find((wp) => wp.index === waypoint.index - 1);
                    if (prev) selectWaypoint(prev.id);
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#0d1321',
                    border: '1px solid #1e2d40',
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  <ChevronUp size={12} color="#4a6080" />
                </button>
                <button
                  onClick={() => {
                    const next = activeSet.waypoints.find((wp) => wp.index === waypoint.index + 1);
                    if (next) selectWaypoint(next.id);
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#0d1321',
                    border: '1px solid #1e2d40',
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  <ChevronDown size={12} color="#4a6080" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

