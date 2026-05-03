import { create } from 'zustand';
import type { ConnectionConfig } from '../connect/connectionTypes';
import { DEFAULT_CONNECTION_CONFIG } from '../connect/connectionTypes';

interface ConnectionStoreState {
  config: ConnectionConfig;
  setConfig: (config: ConnectionConfig) => void;
  patchConfig: (partial: Partial<ConnectionConfig>) => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  config: DEFAULT_CONNECTION_CONFIG,
  setConfig: (config) => set({ config }),
  patchConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),
}));
