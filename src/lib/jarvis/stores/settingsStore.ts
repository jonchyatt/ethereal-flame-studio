import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DOMAINS, type Domain } from '@/lib/jarvis/domains';

// ── Types ──────────────────────────────────────────────────────────────────

export type NotificationMode = 'focus' | 'active' | 'review' | 'dnd';

export interface NotificationSchedule {
  workDays: number[];
  workStart: string;
  workEnd: string;
  sleepStart: string;
  sleepEnd: string;
}

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
  onboarded: boolean;
  onboardedAt: number | null;
  notificationSchedule: NotificationSchedule | null;
  dataSourceUrls: Record<string, string>;
}

interface SettingsActions {
  activateDomain: (id: string) => void;
  deactivateDomain: (id: string) => void;
  setNotificationMode: (mode: NotificationMode) => void;
  setFeatureToggle: (key: string, value: boolean) => void;
  setOnboarded: () => void;
  setNotificationSchedule: (schedule: NotificationSchedule) => void;
  setDataSourceUrl: (domainId: string, url: string) => void;
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
      onboarded: false,
      onboardedAt: null,
      notificationSchedule: null,
      dataSourceUrls: {},

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

      setOnboarded: () => set({ onboarded: true, onboardedAt: Date.now() }),

      setNotificationSchedule: (schedule) => set({ notificationSchedule: schedule }),

      setDataSourceUrl: (domainId, url) =>
        set((state) => ({
          dataSourceUrls: { ...state.dataSourceUrls, [domainId]: url },
        })),
    }),
    {
      name: 'jarvis-settings',
      partialize: (state) => ({
        activeDomainIds: state.activeDomainIds,
        notificationMode: state.notificationMode,
        featureToggles: state.featureToggles,
        onboarded: state.onboarded,
        onboardedAt: state.onboardedAt,
        notificationSchedule: state.notificationSchedule,
        dataSourceUrls: state.dataSourceUrls,
      }),
    }
  )
);

// ── Derived Hook ───────────────────────────────────────────────────────────

export function useActiveDomains(): Domain[] {
  const activeDomainIds = useSettingsStore((s) => s.activeDomainIds);
  return DOMAINS.filter((d) => activeDomainIds.includes(d.id));
}
