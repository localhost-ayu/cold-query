import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';

import type { ParseResult, SaveFile } from '@/core/save/schema';
import type { SaveStorage } from '@/core/save/storage';
import { CURRENT_SAVE_VERSION } from '@/core/save/version';

import type { GameStore } from './game-store';
import type { Preferences } from './preferences-store';
import type { TerminalStore } from './terminal-store';
import type { Viewport } from './window-store';

type WindowStore = StoreApi<{
  windows: SaveWindows['windows'];
  activeId: SaveWindows['activeId'];
  restore: (
    windows: SaveWindows['windows'],
    activeId: SaveWindows['activeId'],
    viewport: Viewport,
  ) => void;
}>;
type SaveWindows = NonNullable<SaveFile['windows']>;

type PreferencesStore = StoreApi<
  Preferences & {
    setLocale: (locale: Preferences['locale']) => void;
    setTheme: (theme: Preferences['theme']) => void;
    setSoundEnabled: (enabled: boolean) => void;
    setVolume: (volume: number) => void;
  }
>;

export interface SaveStatus {
  /** false quando o navegador não deixa gravar (aba privada etc.). */
  available: boolean;
  lastSavedAt: number | null;
}

export interface PersistenceOptions {
  storage: SaveStorage;
  game: GameStore;
  terminal: TerminalStore;
  windows: WindowStore;
  preferences: PreferencesStore;
  /** O validador traz o zod; carrega só quando precisa ler um save. */
  loadParser: () => Promise<(input: unknown) => ParseResult>;
  debounceMs?: number;
  now?: () => number;
}

export type LoadResult = 'restored' | 'empty' | 'invalid' | 'unavailable';
export type ImportResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'newer' | 'tooLarge' };

export function createPersistence({
  storage,
  game,
  terminal,
  windows,
  preferences,
  loadParser,
  debounceMs = 800,
  now = Date.now,
}: PersistenceOptions) {
  const status = createStore<SaveStatus>(() => ({
    available: true,
    lastSavedAt: null,
  }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let autosaving = false;

  /** Retrato do jogo agora, no formato do save. Só dados: nada de funções. */
  function snapshot(): SaveFile {
    const g = game.getState();
    const t = terminal.getState();
    const w = windows.getState();
    const p = preferences.getState();
    return {
      app: 'cold-query',
      saveVersion: CURRENT_SAVE_VERSION,
      savedAt: new Date(now()).toISOString(),
      preferences: {
        locale: p.locale,
        theme: p.theme,
        soundEnabled: p.soundEnabled,
        volume: p.volume,
      },
      game: {
        cases: g.cases,
        inbox: g.inbox,
        evidence: g.evidence,
        notes: g.notes,
        started: g.started,
      },
      terminal: {
        tabs: t.tabs.map(({ id, number, sql, dbId }) => ({
          id,
          number,
          sql,
          dbId,
        })),
        activeTabId: t.activeTabId,
        history: t.history,
        nextNumber: t.nextNumber,
      },
      windows: { windows: w.windows, activeId: w.activeId },
    };
  }

  function apply(save: SaveFile, viewport: Viewport, withPreferences: boolean) {
    game.getState().hydrate(save.game);
    if (save.terminal) terminal.getState().hydrate(save.terminal);
    if (save.windows)
      windows
        .getState()
        .restore(save.windows.windows, save.windows.activeId, viewport);
    if (withPreferences && save.preferences) {
      const p = preferences.getState();
      const saved = save.preferences;
      if (saved.locale) p.setLocale(saved.locale);
      if (saved.theme) p.setTheme(saved.theme);
      if (saved.soundEnabled !== undefined)
        p.setSoundEnabled(saved.soundEnabled);
      if (saved.volume !== undefined) p.setVolume(saved.volume);
    }
  }

  async function write(): Promise<void> {
    try {
      await storage.write(snapshot());
      status.setState({ available: true, lastSavedAt: now() });
    } catch {
      status.setState({ available: false });
    }
  }

  function schedule() {
    if (!autosaving) return;
    clearTimeout(timer);
    timer = setTimeout(() => void write(), debounceMs);
  }

  /** Grava já o que estiver pendente (a aba vai fechar ou sumir). */
  function flush(): Promise<void> | undefined {
    if (!autosaving || timer === undefined) return undefined;
    clearTimeout(timer);
    timer = undefined;
    return write();
  }

  return {
    status,
    snapshot,

    /** Lê o autosave e restaura. Preferências ficam como estão (já vêm do localStorage). */
    async load(viewport: Viewport): Promise<LoadResult> {
      let raw: unknown;
      try {
        raw = await storage.read();
      } catch {
        status.setState({ available: false });
        return 'unavailable';
      }
      if (raw === null || raw === undefined) return 'empty';
      const parse = await loadParser();
      const result = parse(raw);
      if (!result.ok) return 'invalid';
      apply(result.save, viewport, false);
      return 'restored';
    },

    /** Liga o autosave: qualquer mudança no jogo, no Terminal ou nas janelas agenda uma gravação. */
    startAutosave(): () => void {
      autosaving = true;
      const unsubscribers = [
        game.subscribe(schedule),
        terminal.subscribe(schedule),
        windows.subscribe(schedule),
        preferences.subscribe(schedule),
      ];
      return () => {
        autosaving = false;
        clearTimeout(timer);
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },

    flush,

    exportText(): string {
      return JSON.stringify(snapshot(), null, 2);
    },

    /** Importa um arquivo de save: valida, troca o jogo inteiro e grava na hora. */
    async importText(text: string, viewport: Viewport): Promise<ImportResult> {
      const parse = await loadParser();
      const result = parse(text);
      if (!result.ok) return result;
      apply(result.save, viewport, true);
      await write();
      return { ok: true };
    },

    /** Apaga o progresso: jogo, Terminal e o autosave. Preferências ficam. */
    async reset(): Promise<void> {
      clearTimeout(timer);
      game.getState().reset();
      terminal.getState().reset();
      try {
        await storage.clear();
      } catch {
        status.setState({ available: false });
      }
      status.setState({ lastSavedAt: null });
    },
  };
}

export type Persistence = ReturnType<typeof createPersistence>;
