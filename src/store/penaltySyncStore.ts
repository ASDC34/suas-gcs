import { create } from 'zustand';

/**
 * MissionTimer → PenaltyTracker senkronu (45 dk aşım saniyesi).
 * missionStore’dan ayrı tutulur; ceza paneli buradan okur.
 */
interface PenaltySyncState {
  missionTimerOvertimeSec: number;
  setMissionTimerOvertimeSec: (sec: number) => void;
}

export const usePenaltySyncStore = create<PenaltySyncState>((set) => ({
  missionTimerOvertimeSec: 0,
  setMissionTimerOvertimeSec: (sec) =>
    set({ missionTimerOvertimeSec: Math.max(0, Math.floor(sec)) }),
}));
