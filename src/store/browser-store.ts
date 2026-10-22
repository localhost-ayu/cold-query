import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { normalizeUrl } from '@/core/browser';

/** Página inicial do Navegador: a lista de favoritos. */
export const START_PAGE = 'about:start';

interface BrowserState {
  entries: string[];
  index: number;
  navigate: (url: string) => void;
  back: () => void;
  forward: () => void;
  home: () => void;
}

/** Histórico do Navegador como em qualquer navegador: voltar, avançar e ramificar. */
export function createBrowserStore() {
  return createStore<BrowserState>((set) => ({
    entries: [START_PAGE],
    index: 0,
    navigate: (url) =>
      set((state) => {
        const target = url === START_PAGE ? url : normalizeUrl(url);
        if (state.entries[state.index] === target) return state;
        // Navegar depois de voltar descarta o "avançar".
        const entries = [...state.entries.slice(0, state.index + 1), target];
        return { entries, index: entries.length - 1 };
      }),
    back: () => set((state) => ({ index: Math.max(0, state.index - 1) })),
    forward: () =>
      set((state) => ({
        index: Math.min(state.entries.length - 1, state.index + 1),
      })),
    home: () =>
      set((state) => {
        const entries = [
          ...state.entries.slice(0, state.index + 1),
          START_PAGE,
        ];
        return { entries, index: entries.length - 1 };
      }),
  }));
}

export const browserStore = createBrowserStore();

export function useBrowser<T>(selector: (state: BrowserState) => T): T {
  return useStore(browserStore, selector);
}
