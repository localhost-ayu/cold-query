import { persistence } from '@/apps/shared/persistence';
import { shellStore } from '@/store/shell-store';

/** Bloqueia a tela (volta ao menu) e grava o progresso na hora, sem esperar o autosave. */
export function lockScreen() {
  if (shellStore.getState().locked) return;
  void persistence.flush();
  shellStore.getState().lock();
}

/** Roda `action` assim que a tela estiver desbloqueada (na hora, se já estiver). */
export function whenUnlocked(action: () => void): () => void {
  if (!shellStore.getState().locked) {
    action();
    return () => {};
  }
  const stop = shellStore.subscribe((state) => {
    if (state.locked) return;
    stop();
    action();
  });
  return stop;
}
