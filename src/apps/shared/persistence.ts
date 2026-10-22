import { terminalStore } from '@/apps/terminal/session';
import { createIdbStorage } from '@/core/save/storage';
import { createPersistence } from '@/store/persistence';
import { preferencesStore } from '@/store/preferences-store';
import { windowStore } from '@/store/window-store';

import { gameStore } from './game';

/** Save do jogo no IndexedDB do navegador, com o validador carregado sob demanda. */
export const persistence = createPersistence({
  storage: createIdbStorage(),
  game: gameStore,
  terminal: terminalStore,
  windows: windowStore,
  preferences: preferencesStore,
  loadParser: () =>
    import('@/core/save/schema').then(
      (module) => (input: unknown) => module.parseSave(input),
    ),
});

export function currentViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}
