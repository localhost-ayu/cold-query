'use client';

import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useEffect } from 'react';

import { appById } from '@/apps/registry';
import { useWindowStore, windowStore } from '@/store/window-store';

import { FloatingWindow } from './FloatingWindow';

/** Atalhos globais de janela. Super (Meta) segue o GNOME; Alt+Shift serve onde o sistema captura o Super. */
function useWindowShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = windowStore.getState();
      if (event.altKey && !event.shiftKey && event.key === 'Tab') {
        event.preventDefault();
        state.cycleFocus();
        return;
      }
      const modifier = event.metaKey || (event.altKey && event.shiftKey);
      if (!modifier || !state.activeId) return;
      const size = { width: window.innerWidth, height: window.innerHeight };
      const actions: Record<string, () => void> = {
        ArrowLeft: () => state.snapWindow(state.activeId!, 'left', size),
        ArrowRight: () => state.snapWindow(state.activeId!, 'right', size),
        ArrowUp: () => state.toggleMaximize(state.activeId!, size),
        ArrowDown: () => state.minimizeWindow(state.activeId!),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export function WindowManager() {
  const windows = useWindowStore((state) => state.windows);
  const activeId = useWindowStore((state) => state.activeId);
  useWindowShortcuts();

  return (
    // reducedMotion="user": quem pede menos movimento ao sistema vê só o fade.
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {windows
          .filter((item) => !item.minimized)
          .map((item) => {
            const App = appById[item.id].component;
            return (
              <FloatingWindow
                key={item.id}
                window={item}
                active={item.id === activeId}
              >
                <App />
              </FloatingWindow>
            );
          })}
      </AnimatePresence>
    </MotionConfig>
  );
}
