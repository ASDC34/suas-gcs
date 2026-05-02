import { create } from 'zustand';

export type ConnectionMode = 'SIMULATOR' | 'MAVLINK';

interface ConnectionModeState {
  mode: ConnectionMode;
  setMode: (mode: ConnectionMode) => void;
}

export const useConnectionModeStore = create<ConnectionModeState>((set) => ({
  mode: 'SIMULATOR',
  setMode: (mode) => set({ mode }),
}));
