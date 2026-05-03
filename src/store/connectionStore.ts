import { create } from 'zustand';
import type { ConnectionConfig } from '../connect/connectionTypes';
import { DEFAULT_CONNECTION_CONFIG } from '../connect/connectionTypes';

interface ConnectionStoreState {
  config: ConnectionConfig;
  /** MAVLink/MAVROS WebSocket açıkken true — simülatör bu süre boyunca durur */
  liveLinkActive: boolean;
  setConfig: (config: ConnectionConfig) => void;
  patchConfig: (partial: Partial<ConnectionConfig>) => void;
  setLiveLinkActive: (active: boolean) => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  config: DEFAULT_CONNECTION_CONFIG,
  liveLinkActive: false,
  setConfig: (config) => set({ config }),
  patchConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),
  setLiveLinkActive: (active) => set({ liveLinkActive: active }),
}));
