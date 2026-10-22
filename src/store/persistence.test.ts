import { cases } from 'virtual:cases';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSave } from '@/core/save/schema';
import { createMemoryStorage, type SaveStorage } from '@/core/save/storage';

import { createGameStore } from './game-store';
import { createPersistence } from './persistence';
import { createPreferencesStore } from './preferences-store';
import {
  createTerminalStore,
  type InterruptibleEngine,
} from './terminal-store';
import { createWindowStore } from './window-store';

const viewport = { width: 1440, height: 900 };

const engine: InterruptibleEngine = {
  open: async () => [],
  exec: async () => ({ columns: [], rows: [], truncated: false, elapsedMs: 0 }),
  schema: async () => [],
  close: async () => {},
  interrupt: () => {},
};

/** Um "navegador" novo: stores zerados apontando para o mesmo armazenamento. */
function boot(storage: SaveStorage) {
  const game = createGameStore(cases);
  const terminal = createTerminalStore(engine, 'training', 'SELECT 1;');
  const windows = createWindowStore();
  const preferences = createPreferencesStore();
  const persistence = createPersistence({
    storage,
    game,
    terminal,
    windows,
    preferences,
    loadParser: async () => (input) => parseSave(input),
    debounceMs: 100,
  });
  return { game, terminal, windows, preferences, persistence };
}

function play(session: ReturnType<typeof boot>) {
  const { game, terminal, windows } = session;
  game.getState().start();
  game.getState().acceptCase('001');
  game.getState().pinEvidence({
    caseId: '001',
    source: 'query',
    columns: ['badge_id', 'name'],
    rows: [[4471, 'Rafael Tavares']],
  });
  game.getState().setNote('001', 'conferir a sexta à noite');
  terminal.getState().setSql('tab-1', 'SELECT * FROM assets;');
  terminal.getState().addTab();
  windows.getState().openApp('dossier', viewport);
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('persistence', () => {
  it('autosaves after changes settle and restores everything on the next boot', async () => {
    const storage = createMemoryStorage();
    const first = boot(storage);
    first.persistence.startAutosave();
    play(first);
    expect(await storage.read()).toBeNull();
    await vi.advanceTimersByTimeAsync(100);
    expect(first.persistence.status.getState().lastSavedAt).not.toBeNull();

    const second = boot(storage);
    expect(await second.persistence.load(viewport)).toBe('restored');
    const game = second.game.getState();
    expect(game.cases['001'].status).toBe('active');
    expect(game.evidence).toHaveLength(1);
    expect(game.notes['001']).toBe('conferir a sexta à noite');
    expect(game.inbox.map((item) => item.emailId)).toEqual(
      first.game.getState().inbox.map((item) => item.emailId),
    );
    expect(second.terminal.getState().tabs.map((tab) => tab.sql)).toEqual([
      'SELECT * FROM assets;',
      '',
    ]);
    expect(second.windows.getState().windows.map((w) => w.id)).toEqual([
      'dossier',
    ]);
  });

  it('does not deliver the first e-mail again after a restore', async () => {
    const storage = createMemoryStorage();
    const first = boot(storage);
    first.game.getState().start();
    await storage.write(first.persistence.snapshot());

    const second = boot(storage);
    await second.persistence.load(viewport);
    second.game.getState().start();
    expect(second.game.getState().inbox).toHaveLength(1);
  });

  it('reports an empty, invalid or unavailable autosave', async () => {
    expect(await boot(createMemoryStorage()).persistence.load(viewport)).toBe(
      'empty',
    );
    expect(
      await boot(createMemoryStorage({ app: 'x' })).persistence.load(viewport),
    ).toBe('invalid');

    const broken: SaveStorage = {
      read: () => Promise.reject(new Error('blocked')),
      write: () => Promise.reject(new Error('blocked')),
      clear: () => Promise.reject(new Error('blocked')),
    };
    const session = boot(broken);
    expect(await session.persistence.load(viewport)).toBe('unavailable');
    expect(session.persistence.status.getState().available).toBe(false);
  });

  it('exports and imports a save file, preferences included', async () => {
    const source = boot(createMemoryStorage());
    play(source);
    source.preferences.getState().setLocale('en');
    const text = source.persistence.exportText();

    window.localStorage.clear();
    const target = boot(createMemoryStorage());
    expect(await target.persistence.importText(text, viewport)).toEqual({
      ok: true,
    });
    expect(target.game.getState().evidence).toHaveLength(1);
    expect(target.preferences.getState().locale).toBe('en');
    expect(
      await target.persistence.importText('{"app":"cold-query"}', viewport),
    ).toEqual({ ok: false, reason: 'invalid' });
  });

  it('reset wipes progress and the autosave but keeps preferences', async () => {
    const storage = createMemoryStorage();
    const session = boot(storage);
    play(session);
    session.preferences.getState().setTheme('dark');
    await storage.write(session.persistence.snapshot());

    await session.persistence.reset();
    expect(await storage.read()).toBeNull();
    expect(session.game.getState()).toMatchObject({
      inbox: [],
      evidence: [],
      started: false,
    });
    expect(session.terminal.getState().tabs).toHaveLength(1);
    expect(session.preferences.getState().theme).toBe('dark');
  });

  it('restored windows fit a smaller screen', async () => {
    const storage = createMemoryStorage();
    const first = boot(storage);
    first.windows.getState().openApp('terminal', viewport);
    await storage.write(first.persistence.snapshot());

    const second = boot(storage);
    await second.persistence.load({ width: 900, height: 600 });
    const [terminal] = second.windows.getState().windows;
    expect(terminal.x + terminal.width).toBeLessThanOrEqual(900);
  });
});
