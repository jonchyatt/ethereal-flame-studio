import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DOMAINS, type Domain } from '@/lib/jarvis/domains';

// ── Types ──────────────────────────────────────────────────────────────────

export type NotificationMode = 'focus' | 'active' | 'review' | 'dnd';

interface FeatureToggles {
  voiceEnabled: boolean;
  orbFullscreen: boolean;
  selfImprovement: boolean;
  [key: string]: boolean;
}

// ── Store ──────────────────────────────────────────────────────────────────

interface SettingsState {
  activeDomainIds: string[];
  notificationMode: NotificationMode;
  featureToggles: FeatureToggles;
}

interface SettingsActions {
  activateDomain: (id: string) => void;
  deactivateDomain: (id: string) => void;
  setNotificationMode: (mode: NotificationMode) => void;
  setFeatureToggle: (key: string, value: boolean) => void;
}

type SettingsStore = SettingsState & SettingsActions;

const PROTECTED_DOMAINS = ['home', 'personal'];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      activeDomainIds: ['home', 'personal'],
      notificationMode: 'active',
      featureToggles: {
        voiceEnabled: false,
        orbFullscreen: false,
        selfImprovement: true,
      },

      activateDomain: (id) =>
        set((state) => {
          if (state.activeDomainIds.includes(id)) return state;
          return { activeDomainIds: [...state.activeDomainIds, id] };
        }),

      deactivateDomain: (id) =>
        set((state) => {
          if (PROTECTED_DOMAINS.includes(id)) return state;
          return { activeDomainIds: state.activeDomainIds.filter((d) => d !== id) };
        }),

      setNotificationMode: (mode) => set({ notificationMode: mode }),

      setFeatureToggle: (key, value) =>
        set((state) => ({
          featureToggles: { ...state.featureToggles, [key]: value },
        })),
    }),
    {
      name: 'jarvis-settings',
    }
  )
);

// ── Derived Hook ───────────────────────────────────────────────────────────

export function useActiveDomains(): Domain[] {
  const activeDomainIds = useSettingsStore((s) => s.activeDomainIds);
  return DOMAINS.filter((d) => activeDomainIds.includes(d.id));
}
