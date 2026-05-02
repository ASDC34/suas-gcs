import axios from 'axios';
import { create } from 'zustand';

const INTEROP_BASE_URL = process.env.REACT_APP_INTEROP_URL ?? 'http://localhost:8000';

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

interface InteropStoreState {
  status: ConnectionStatus;
  lastPingMs: number;
  latencyMs: number;
  errorMessage: string | null;
  retryCount: number;
  submittedOdlcs: string[];

  ping: () => Promise<void>;
  reconnect: () => Promise<void>;
  submitOdlc: (odlcData: object) => Promise<void>;
}

export const useInteropStore = create<InteropStoreState>((set, get) => ({
  status: 'DISCONNECTED',
  lastPingMs: 0,
  latencyMs: 0,
  errorMessage: null,
  retryCount: 0,
  submittedOdlcs: [],

  ping: async () => {
    const startMs = performance.now();
    try {
      await axios.get(`${INTEROP_BASE_URL}/api/teams/id`, {
        timeout: 3000,
      });
      const latency = Math.round(performance.now() - startMs);
      set({
        status: 'CONNECTED',
        lastPingMs: Date.now(),
        latencyMs: latency,
        errorMessage: null,
        retryCount: 0,
      });
    } catch (error: any) {
      set((state) => ({
        status: 'ERROR',
        errorMessage: error?.message ?? 'Interop ping failed',
        retryCount: state.retryCount + 1,
      }));
    }
  },

  reconnect: async () => {
    set({ status: 'CONNECTING', retryCount: 0, errorMessage: null });
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      try {
        await get().ping();
        if (get().status === 'CONNECTED') return;
      } catch {
        // ignore
      }
    }
    set({
      status: 'ERROR',
      errorMessage: 'Bağlantı yeniden kurulamadı — 3 deneme başarısız',
    });
  },

  submitOdlc: async (odlcData) => {
    try {
      const res = await axios.post(`${INTEROP_BASE_URL}/api/odlcs`, odlcData);
      set((state) => ({
        submittedOdlcs: [...state.submittedOdlcs, String((res as any)?.data?.id ?? '')].filter(Boolean),
      }));
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('ODLC gönderme hatası:', error?.message ?? error);
    }
  },
}));

