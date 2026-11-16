import { AnimatePresence } from 'framer-motion';
import { Suspense, useEffect, useMemo, useSyncExternalStore } from 'react';

import { appById } from '@/apps/registry';
import { layoutOverview } from '@/os/overview/layout';
import { lockScreen } from '@/os/lock/lock';
import { shellStore, useShell } from '@/store/shell-store';
import {
  TOP_BAR_HEIGHT,
  useWindowStore,
  windowStore,
} from '@/store/window-store';

import { FloatingWindow } from './FloatingWindow';

/** Espaço do overview reservado para a busca (em cima) e o dash (embaixo). */
const OVERVIEW_TOP = TOP_BAR_HEIGHT + 84;
const OVERVIEW_BOTTOM = 124;

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/** Tamanho da janela do navegador como string estável ("1440x900"), para o snapshot não mudar à toa. */
function useViewportKey() {
  return useSyncExternalStore(
    subscribeResize,
    () => `${window.innerWidth}x${window.innerHeight}`,
  );
}

/**
 * Atalhos globais. Super sozinho ou Alt+F1 abre as Atividades, como no GNOME.
 * Super+setas encaixa e maximiza; Alt+Shift+setas faz o mesmo onde o sistema
 * operacional captura o Super.
 */
function useWindowShortcuts() {
  useEffect(() => {
    // Super vira atalho só se for solto sem outra tecla no meio.
    let superAlone = false;
    const onKeyDown = (event: KeyboardEvent) => {
      superAlone = event.key === 'Meta';
      // Com a tela bloqueada, só ela responde ao teclado.
      if (shellStore.getState().locked) return;
      const state = windowStore.getState();
      // Super+L bloqueia, como no GNOME; Alt+Shift+L onde o sistema captura o Super.
      if (
        event.key.toLowerCase() === 'l' &&
        (event.metaKey || (event.altKey && event.shiftKey))
      ) {
        event.preventDefault();
        lockScreen();
        return;
      }
      if (event.altKey && event.key === 'F1') {
        event.preventDefault();
        shellStore.getState().toggleOverview();
        return;
      }
      if (event.altKey && !event.shiftKey && event.key === 'Tab') {
        event.preventDefault();
        state.cycleFocus();
        return;
      }
      const modifier = event.metaKey || (event.altKey && event.shiftKey);
      if (!modifier || !state.activeId || shellStore.getState().overviewOpen)
        return;
      const size = { width: window.innerWidth, height: window.innerHeight };
      const id = state.activeId;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => state.snapWindow(id, 'left', size),
        ArrowRight: () => state.snapWindow(id, 'right', size),
        ArrowUp: () => state.toggleMaximize(id, size),
        ArrowDown: () => state.minimizeWindow(id),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta' && superAlone && !shellStore.getState().locked)
        shellStore.getState().toggleOverview();
      superAlone = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}

export function WindowManager() {
  const windows = useWindowStore((state) => state.windows);
  const activeId = useWindowStore((state) => state.activeId);
  const overviewOpen = useShell((state) => state.overviewOpen);
  const searching = useShell((state) => state.overviewQuery.trim() !== '');
  const viewportKey = useViewportKey();
  useWindowShortcuts();

  // No overview aparecem também as minimizadas, como no GNOME.
  const visible = windows.filter((item) => overviewOpen || !item.minimized);

  const slots = useMemo(() => {
    if (!overviewOpen) return null;
    const [width, height] = viewportKey.split('x').map(Number);
    const area = {
      x: 0,
      y: OVERVIEW_TOP,
      width,
      height: Math.max(160, height - OVERVIEW_TOP - OVERVIEW_BOTTOM),
    };
    const placed = layoutOverview(visible, area);
    return new Map(visible.map((item, index) => [item.id, placed[index]]));
  }, [overviewOpen, viewportKey, visible]);

  return (
    <AnimatePresence>
      {visible.map((item) => {
        const { component: App, fallback: Fallback } = appById[item.id];
        return (
          <FloatingWindow
            key={item.id}
            window={item}
            active={!overviewOpen && item.id === activeId}
            overviewSlot={slots?.get(item.id) ?? null}
            hidden={searching}
          >
            <Suspense fallback={Fallback ? <Fallback /> : null}>
              <App />
            </Suspense>
          </FloatingWindow>
        );
      })}
    </AnimatePresence>
  );
}
