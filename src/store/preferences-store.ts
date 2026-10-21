import { useStore } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { defaultLocale, isLocale, type Locale } from '@/core/i18n';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface Preferences {
  locale: Locale;
  theme: ThemePreference;
  soundEnabled: boolean;
  /** 0 a 1. */
  volume: number;
}

interface PreferencesState extends Preferences {
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

/** Mesma chave lida pelo script de tema no <head>, antes do React. */
export const PREFERENCES_STORAGE_KEY = 'cold-query:preferences';

/** Quem pede menos movimento ao sistema começa sem som; dá para ligar em Ajustes. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const defaultPreferences: Preferences = {
  locale: defaultLocale,
  theme: 'system',
  soundEnabled: !prefersReducedMotion(),
  volume: 0.6,
};

/** localStorage pode não existir ou lançar erro (aba privada, bloqueio); aí nada é salvo. */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* sem armazenamento, as preferências valem só para esta visita */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* idem */
    }
  },
};

export function createPreferencesStore(initial: Partial<Preferences> = {}) {
  return createStore<PreferencesState>()(
    persist(
      (set) => ({
        ...defaultPreferences,
        ...initial,
        setLocale: (locale) => set({ locale }),
        setTheme: (theme) => set({ theme }),
        setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
        setVolume: (volume) =>
          set({ volume: Math.min(1, Math.max(0, volume)) }),
      }),
      {
        name: PREFERENCES_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => safeLocalStorage),
        partialize: ({ locale, theme, soundEnabled, volume }) => ({
          locale,
          theme,
          soundEnabled,
          volume,
        }),
        // Descarta valores estranhos vindos do storage em vez de confiar neles.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<Preferences>;
          return {
            ...current,
            locale: isLocale(saved.locale) ? saved.locale : current.locale,
            theme: ['system', 'light', 'dark'].includes(saved.theme as string)
              ? (saved.theme as ThemePreference)
              : current.theme,
            soundEnabled:
              typeof saved.soundEnabled === 'boolean'
                ? saved.soundEnabled
                : current.soundEnabled,
            volume:
              typeof saved.volume === 'number' &&
              saved.volume >= 0 &&
              saved.volume <= 1
                ? saved.volume
                : current.volume,
          };
        },
      },
    ),
  );
}

export const preferencesStore = createPreferencesStore();

export function usePreferences<T>(selector: (state: PreferencesState) => T): T {
  return useStore(preferencesStore, selector);
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}
