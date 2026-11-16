import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export const appIds = [
  'mail',
  'terminal',
  'dossier',
  'contracts',
  'browser',
  'files',
  'notes',
  'help',
  'settings',
] as const;
export type AppId = (typeof appIds)[number];
export type SnapSide = 'left' | 'right';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface TraceWindow extends Bounds {
  /** Uma janela por app, então o id é o próprio app. */
  id: AppId;
  minimized: boolean;
  maximized: boolean;
  snap: SnapSide | null;
  zIndex: number;
  /** Geometria para voltar depois de maximizar ou encaixar. */
  restoreBounds: Bounds | null;
}

interface WindowState {
  windows: TraceWindow[];
  activeId: AppId | null;
  openApp: (id: AppId, viewport: Viewport) => void;
  closeWindow: (id: AppId) => void;
  focusWindow: (id: AppId) => void;
  minimizeWindow: (id: AppId) => void;
  toggleMaximize: (id: AppId, viewport: Viewport) => void;
  moveWindow: (id: AppId, x: number, y: number, viewport: Viewport) => void;
  resizeWindow: (id: AppId, bounds: Bounds, viewport: Viewport) => void;
  snapWindow: (id: AppId, side: SnapSide, viewport: Viewport) => void;
  cycleFocus: () => void;
  /** Reabre as janelas de um save, encaixadas no tamanho de tela atual. */
  restore: (
    windows: TraceWindow[],
    activeId: AppId | null,
    viewport: Viewport,
  ) => void;
}

export const TOP_BAR_HEIGHT = 32;
export const DOCK_SPACE = 92;
export const MIN_WIDTH = 360;
export const MIN_HEIGHT = 240;

/** Tamanho e posição de quando o app abre pela primeira vez. */
const defaultBounds: Record<AppId, Bounds> = {
  mail: { x: 72, y: 56, width: 820, height: 620 },
  terminal: { x: 120, y: 58, width: 1040, height: 640 },
  dossier: { x: 300, y: 80, width: 760, height: 600 },
  contracts: { x: 240, y: 64, width: 820, height: 600 },
  browser: { x: 200, y: 70, width: 900, height: 620 },
  files: { x: 260, y: 110, width: 760, height: 500 },
  notes: { x: 280, y: 90, width: 700, height: 560 },
  help: { x: 180, y: 70, width: 860, height: 620 },
  settings: { x: 340, y: 90, width: 580, height: 620 },
};

function boundsOf({ x, y, width, height }: Bounds): Bounds {
  return { x, y, width, height };
}

function nextZ(windows: TraceWindow[]): number {
  return Math.max(0, ...windows.map((item) => item.zIndex)) + 1;
}

function topmostVisible(windows: TraceWindow[]): AppId | null {
  const visible = windows.filter((item) => !item.minimized);
  return visible.sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null;
}

/** Área útil: entre a top bar e o dock. */
export function desktopArea(viewport: Viewport): Bounds {
  return {
    x: 0,
    y: TOP_BAR_HEIGHT,
    width: viewport.width,
    height: Math.max(MIN_HEIGHT, viewport.height - TOP_BAR_HEIGHT - DOCK_SPACE),
  };
}

/** Garante tamanho mínimo e mantém a janela dentro da área útil. */
export function constrain(bounds: Bounds, viewport: Viewport): Bounds {
  const area = desktopArea(viewport);
  const width = Math.min(
    Math.max(bounds.width, MIN_WIDTH),
    Math.max(MIN_WIDTH, area.width),
  );
  const height = Math.min(Math.max(bounds.height, MIN_HEIGHT), area.height);
  return {
    x: Math.min(Math.max(bounds.x, 0), Math.max(0, area.width - width)),
    y: Math.min(
      Math.max(bounds.y, area.y),
      Math.max(area.y, area.y + area.height - height),
    ),
    width,
    height,
  };
}

export function createWindowStore(initial: TraceWindow[] = []) {
  return createStore<WindowState>((set) => {
    /** Aplica uma mudança só na janela `id`. */
    const update = (
      id: AppId,
      change: (
        item: TraceWindow,
        state: WindowState,
      ) => Partial<TraceWindow> | null,
      focus = false,
    ) =>
      set((state) => ({
        windows: state.windows.map((item) => {
          if (item.id !== id) return item;
          const patch = change(item, state);
          return patch ? { ...item, ...patch } : item;
        }),
        ...(focus ? { activeId: id } : {}),
      }));

    return {
      windows: initial,
      activeId: topmostVisible(initial),

      openApp: (id, viewport) =>
        set((state) => {
          const zIndex = nextZ(state.windows);
          if (state.windows.some((item) => item.id === id)) {
            return {
              windows: state.windows.map((item) =>
                item.id === id ? { ...item, minimized: false, zIndex } : item,
              ),
              activeId: id,
            };
          }
          const created: TraceWindow = {
            id,
            ...constrain(defaultBounds[id], viewport),
            minimized: false,
            maximized: false,
            snap: null,
            zIndex,
            restoreBounds: null,
          };
          return { windows: [...state.windows, created], activeId: id };
        }),

      closeWindow: (id) =>
        set((state) => {
          const windows = state.windows.filter((item) => item.id !== id);
          return { windows, activeId: topmostVisible(windows) };
        }),

      focusWindow: (id) =>
        set((state) => {
          const target = state.windows.find((item) => item.id === id);
          // Clicar na janela que já está na frente não deve mexer no estado.
          if (!target || (state.activeId === id && !target.minimized))
            return state;
          return {
            windows: state.windows.map((item) =>
              item.id === id
                ? { ...item, minimized: false, zIndex: nextZ(state.windows) }
                : item,
            ),
            activeId: id,
          };
        }),

      minimizeWindow: (id) =>
        set((state) => {
          const windows = state.windows.map((item) =>
            item.id === id ? { ...item, minimized: true } : item,
          );
          return { windows, activeId: topmostVisible(windows) };
        }),

      toggleMaximize: (id, viewport) =>
        update(
          id,
          (item) =>
            item.maximized
              ? {
                  ...constrain(
                    item.restoreBounds ?? defaultBounds[id],
                    viewport,
                  ),
                  maximized: false,
                  snap: null,
                  restoreBounds: null,
                }
              : {
                  ...desktopArea(viewport),
                  maximized: true,
                  snap: null,
                  restoreBounds: item.restoreBounds ?? boundsOf(item),
                },
          true,
        ),

      moveWindow: (id, x, y, viewport) =>
        update(id, (item) => {
          if (item.maximized) return null;
          // Arrastar uma janela encaixada devolve o tamanho de antes do encaixe.
          const size =
            item.snap && item.restoreBounds ? item.restoreBounds : item;
          return {
            ...constrain(
              { x, y, width: size.width, height: size.height },
              viewport,
            ),
            snap: null,
            restoreBounds: null,
          };
        }),

      resizeWindow: (id, bounds, viewport) =>
        update(id, (item) =>
          item.maximized
            ? null
            : {
                ...constrain(bounds, viewport),
                snap: null,
                restoreBounds: null,
              },
        ),

      snapWindow: (id, side, viewport) =>
        update(
          id,
          (item) => {
            const area = desktopArea(viewport);
            const half = Math.floor(area.width / 2);
            return {
              x: side === 'left' ? 0 : half,
              y: area.y,
              width: side === 'left' ? half : area.width - half,
              height: area.height,
              maximized: false,
              snap: side,
              restoreBounds: item.restoreBounds ?? boundsOf(item),
            };
          },
          true,
        ),

      restore: (windows, activeId, viewport) => {
        const restored = windows
          .filter((item) => appIds.includes(item.id))
          .map((item) => {
            const area = desktopArea(viewport);
            // Maximizada e encaixada são recalculadas para a tela nova.
            if (item.maximized) return { ...item, ...area };
            if (item.snap) {
              const half = Math.floor(area.width / 2);
              return {
                ...item,
                x: item.snap === 'left' ? 0 : half,
                y: area.y,
                width: item.snap === 'left' ? half : area.width - half,
                height: area.height,
              };
            }
            return { ...item, ...constrain(item, viewport) };
          });
        set({
          windows: restored,
          activeId:
            activeId && restored.some((item) => item.id === activeId)
              ? activeId
              : topmostVisible(restored),
        });
      },

      cycleFocus: () =>
        set((state) => {
          const visible = state.windows
            .filter((item) => !item.minimized)
            .sort((a, b) => b.zIndex - a.zIndex);
          if (visible.length < 2) return state;
          // Leva a janela do fundo para a frente: repetir percorre todas.
          const next = visible[visible.length - 1];
          return {
            windows: state.windows.map((item) =>
              item.id === next.id
                ? { ...item, zIndex: nextZ(state.windows) }
                : item,
            ),
            activeId: next.id,
          };
        }),
    };
  });
}

export const windowStore = createWindowStore();

export function useWindowStore<T>(selector: (state: WindowState) => T): T {
  return useStore(windowStore, selector);
}
