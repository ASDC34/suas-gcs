import { create } from 'zustand';

export type CriticalCommandType =
  | 'AUTONOMOUS_TAKEOFF'
  | 'ENTER_SEARCH_AREA'
  | 'INITIATE_RTL'
  | 'RELEASE_BAY_1'
  | 'RELEASE_BAY_2'
  | 'SWITCH_RUNWAY'
  | 'MANUAL_TAKEOVER';

export interface CriticalCommand {
  type: CriticalCommandType;
  label: string;
  description: string;
  warning?: string;
  consequence?: string;
  confirmLabel: string;
  onConfirm?: () => void;
}

const MANUAL_TAKEOVER_WARNING =
  'KURAL 3.8.6: Manuel devralma mevcut turu iptal eder. ' +
  'UAS, bu turun BAŞINA dönerek tüm turu baştan uçacak. ' +
  'Yalnızca gerçek güvenlik gereksinimi varsa devralın.';

export const COMMAND_TEMPLATES: Record<
  CriticalCommandType,
  Omit<CriticalCommand, 'onConfirm'>
> = {
  AUTONOMOUS_TAKEOFF: {
    type: 'AUTONOMOUS_TAKEOFF',
    label: 'Otonom Kalkış',
    description:
      "Tek MAVLink komutu ile otonom kalkış başlatılacak. UAS 200ft AGL'ye çıkacak ve AUTO moduna geçecek.",
    consequence: '+20 puan (kalkış/iniş) + 30 puan (tam otonom) kazanılır.',
    confirmLabel: 'KALKIŞI BAŞLAT',
  },
  ENTER_SEARCH_AREA: {
    type: 'ENTER_SEARCH_AREA',
    label: 'Aramayı Başlat',
    description:
      'UAS arama bölgesine girecek ve lawnmower tarama deseni uçuşuna başlayacak. Turlar bu noktadan sonra sayılmaz — turları bitirdiğinizden emin olun.',
    consequence: 'Risk haritalaması ve teslimat için hedef koordinatları toplanır.',
    confirmLabel: 'ARAMAYA GEÇ',
  },
  INITIATE_RTL: {
    type: 'INITIATE_RTL',
    label: 'RTL / İniş',
    description:
      'Tek MAVLink komutu ile otonom RTL ve iniş başlatılacak. UAS kalkış noktasına dönecek ve inecek.',
    consequence:
      'Görev bu noktadan sonra tamamlanmış sayılır. USB harita derhâl hakeme teslim edilmeli.',
    confirmLabel: 'RTL BAŞLAT',
  },
  RELEASE_BAY_1: {
    type: 'RELEASE_BAY_1',
    label: 'Bay 1 Bırak (Beacon → Çadır)',
    description:
      'GP908 işaret cihazı çadır hedefine bırakılacak. Bırakma noktasında stabilitenizi kontrol edin.',
    warning: 'BAY 1 yalnızca bir kez bırakılabilir — yeniden yükleme yasak (Kural 3.6).',
    consequence:
      'Başarılı bırakma: +100 puan (hedef içi: +50, hayatta kalma: +20, doğru hedef: +30).',
    confirmLabel: 'BAY 1 BIRAK',
  },
  RELEASE_BAY_2: {
    type: 'RELEASE_BAY_2',
    label: 'Bay 2 Bırak (Şişe → Manken)',
    description:
      'Su şişesi manken hedefine bırakılacak. Bırakma noktasında stabilitenizi kontrol edin.',
    warning: 'BAY 2 yalnızca bir kez bırakılabilir — yeniden yükleme yasak (Kural 3.6).',
    consequence:
      'Başarılı bırakma: +100 puan (hedef içi: +50, hayatta kalma: +20, doğru hedef: +30).',
    confirmLabel: 'BAY 2 BIRAK',
  },
  SWITCH_RUNWAY: {
    type: 'SWITCH_RUNWAY',
    label: 'Pist Değiştir',
    description:
      'Aktif waypoint seti ve pist konfigürasyonu değiştirilecek. Her iki pist seti önceden yüklenmiş olmalı.',
    warning:
      'Pist 2 (RWY2): 40×40ft — yalnızca VTOL. Yatay iniş kesinlikle yapılmamalı.',
    consequence: 'Waypoint seti değişir — onaylamadan önce haritayı doğrulayın.',
    confirmLabel: 'PİST DEĞİŞTİR',
  },
  MANUAL_TAKEOVER: {
    type: 'MANUAL_TAKEOVER',
    label: 'Manuel Devralma',
    description: 'Safety Pilot RC kontrolü devralacak, AUTO mod devre dışı kalacak.',
    warning: MANUAL_TAKEOVER_WARNING,
    consequence:
      'Mevcut tur geçersiz sayılır. UAS tur başlangıcına RTL yapacak, tur baştan uçulacak.',
    confirmLabel: 'DEVİR AL — TUR BAŞTAN',
  },
};

interface ControlStoreState {
  pendingCommand: CriticalCommand | null;
  isOverlayOpen: boolean;

  commandLog: Array<{
    type: CriticalCommandType;
    timestamp: number;
    confirmed: boolean;
  }>;

  bay1Releasing: boolean;
  bay2Releasing: boolean;
  lastBayReleaseMs: number;
  MIN_BAY_INTERVAL_MS: number;

  emergencyRTLArmed: boolean;

  requestCommand: (type: CriticalCommandType, onConfirm: () => void) => void;
  confirmCommand: () => void;
  cancelCommand: () => void;
  setBayReleasing: (bay: 1 | 2, releasing: boolean) => void;
  armEmergencyRTL: () => void;
}

export const useControlStore = create<ControlStoreState>((set, get) => ({
  pendingCommand: null,
  isOverlayOpen: false,
  commandLog: [],

  bay1Releasing: false,
  bay2Releasing: false,
  lastBayReleaseMs: 0,
  MIN_BAY_INTERVAL_MS: 5000,

  emergencyRTLArmed: false,

  requestCommand: (type, onConfirm) => {
    if (type === 'RELEASE_BAY_1' || type === 'RELEASE_BAY_2') {
      const { bay1Releasing, bay2Releasing, lastBayReleaseMs, MIN_BAY_INTERVAL_MS } = get();
      const timeSinceLast = Date.now() - lastBayReleaseMs;

      if (bay1Releasing || bay2Releasing) return;
      if (lastBayReleaseMs > 0 && timeSinceLast < MIN_BAY_INTERVAL_MS) return;
    }

    const template = COMMAND_TEMPLATES[type];
    set({
      pendingCommand: { ...template, onConfirm },
      isOverlayOpen: true,
    });
  },

  confirmCommand: () => {
    const { pendingCommand } = get();
    if (!pendingCommand) return;

    if (pendingCommand.type === 'RELEASE_BAY_1') {
      set({ bay1Releasing: true, lastBayReleaseMs: Date.now() });
    }
    if (pendingCommand.type === 'RELEASE_BAY_2') {
      set({ bay2Releasing: true, lastBayReleaseMs: Date.now() });
    }

    pendingCommand.onConfirm?.();

    set((state) => ({
      commandLog: [
        ...state.commandLog,
        { type: pendingCommand.type, timestamp: Date.now(), confirmed: true },
      ],
      pendingCommand: null,
      isOverlayOpen: false,
    }));
  },

  cancelCommand: () => {
    const { pendingCommand } = get();
    if (!pendingCommand) return;
    set((state) => ({
      commandLog: [
        ...state.commandLog,
        { type: pendingCommand.type, timestamp: Date.now(), confirmed: false },
      ],
      pendingCommand: null,
      isOverlayOpen: false,
    }));
  },

  setBayReleasing: (bay, releasing) =>
    set(bay === 1 ? { bay1Releasing: releasing } : { bay2Releasing: releasing }),

  armEmergencyRTL: () => set({ emergencyRTLArmed: true }),
}));

