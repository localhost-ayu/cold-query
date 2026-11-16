import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { AppId } from './window-store';

export interface ShellNotification {
  id: string;
  appId: AppId;
  /** Quem manda (nome próprio, não traduzido). */
  sender: string;
  /** Texto já no idioma certo, como o assunto de um e-mail. */
  body: string;
  createdAt: number;
  read: boolean;
}

type Popover = 'calendar' | 'quickSettings' | null;

interface ShellState {
  /** Tela de bloqueio na frente de tudo. O jogo sempre abre bloqueado: é o menu inicial. */
  locked: boolean;
  overviewOpen: boolean;
  /** Texto da busca das Atividades; com texto, as janelas saem de cena. */
  overviewQuery: string;
  popover: Popover;
  notifications: ShellNotification[];
  /** Notificação mostrada como banner no topo da tela, se houver. */
  bannerId: string | null;
  /** Bloqueia a tela: fecha Atividades, menus e banner, como o GNOME faz. */
  lock: () => void;
  unlock: () => void;
  setOverview: (open: boolean) => void;
  toggleOverview: () => void;
  setOverviewQuery: (query: string) => void;
  setPopover: (popover: Popover) => void;
  togglePopover: (popover: Exclude<Popover, null>) => void;
  notify: (
    notification: Omit<ShellNotification, 'id' | 'createdAt' | 'read'>,
  ) => void;
  dismissBanner: () => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const NOTIFICATION_LIMIT = 20;

export function createShellStore() {
  let counter = 0;
  return createStore<ShellState>((set) => ({
    locked: true,
    overviewOpen: false,
    overviewQuery: '',
    popover: null,
    notifications: [],
    bannerId: null,

    lock: () =>
      set({
        locked: true,
        overviewOpen: false,
        overviewQuery: '',
        popover: null,
        bannerId: null,
      }),
    unlock: () => set({ locked: false }),

    // Abrir o overview fecha qualquer menu da barra, como no GNOME.
    setOverview: (overviewOpen) =>
      set({ overviewOpen, overviewQuery: '', popover: null }),
    toggleOverview: () =>
      set((state) => ({
        overviewOpen: !state.overviewOpen,
        overviewQuery: '',
        popover: null,
      })),
    setOverviewQuery: (overviewQuery) => set({ overviewQuery }),

    setPopover: (popover) => set({ popover }),
    togglePopover: (popover) =>
      set((state) => ({
        popover: state.popover === popover ? null : popover,
        overviewOpen: false,
        overviewQuery: '',
      })),

    notify: (notification) =>
      set((state) => {
        counter += 1;
        const created: ShellNotification = {
          ...notification,
          id: `n-${counter}`,
          createdAt: Date.now(),
          read: false,
        };
        return {
          notifications: [created, ...state.notifications].slice(
            0,
            NOTIFICATION_LIMIT,
          ),
          bannerId: created.id,
        };
      }),

    dismissBanner: () => set({ bannerId: null }),
    markAllRead: () =>
      set((state) => ({
        notifications: state.notifications.map((item) => ({
          ...item,
          read: true,
        })),
      })),
    clearNotifications: () => set({ notifications: [], bannerId: null }),
  }));
}

export const shellStore = createShellStore();

export function useShell<T>(selector: (state: ShellState) => T): T {
  return useStore(shellStore, selector);
}
