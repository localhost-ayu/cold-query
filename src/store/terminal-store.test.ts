import { describe, expect, it, vi } from 'vitest';

import { SqlError, type QueryResult } from '@/core/sql/types';

import {
  HISTORY_LIMIT,
  createTerminalStore,
  type InterruptibleEngine,
} from './terminal-store';

const result: QueryResult = {
  columns: ['n'],
  rows: [[1]],
  truncated: false,
  elapsedMs: 2,
};

function fakeEngine(
  overrides: Partial<InterruptibleEngine> = {},
): InterruptibleEngine {
  return {
    open: vi.fn(async () => [{ name: 't', columns: [], foreignKeys: [] }]),
    exec: vi.fn(async () => result),
    schema: vi.fn(async () => []),
    close: vi.fn(async () => {}),
    interrupt: vi.fn(),
    ...overrides,
  };
}

describe('terminal store', () => {
  it('loads a database and exposes its schema', async () => {
    const store = createTerminalStore(fakeEngine(), 'training');
    const loading = store
      .getState()
      .openDatabase('training', async () => 'CREATE TABLE t (a)');
    expect(store.getState().databases.training.status).toBe('loading');
    await loading;
    expect(store.getState().databases.training).toMatchObject({
      status: 'ready',
      schema: [{ name: 't' }],
    });
  });

  it('runs the tab query and records it in the history', async () => {
    const store = createTerminalStore(fakeEngine(), 'training', 'SELECT 1');
    await store.getState().run('tab-1');
    expect(store.getState().tabs[0]).toMatchObject({ status: 'done', result });
    expect(store.getState().history[0]).toMatchObject({
      sql: 'SELECT 1',
      ok: true,
    });
  });

  it('keeps SQL errors on the tab', async () => {
    const engine = fakeEngine({
      exec: vi.fn(async () => {
        throw new SqlError({
          code: 'noTable',
          params: { name: 'x' },
          raw: 'no such table: x',
        });
      }),
    });
    const store = createTerminalStore(engine, 'training', 'SELECT * FROM x');
    await store.getState().run('tab-1');
    expect(store.getState().tabs[0]).toMatchObject({
      status: 'error',
      error: { code: 'noTable' },
    });
    expect(store.getState().history[0].ok).toBe(false);
  });

  it('does not repeat the same query back to back and caps the history', async () => {
    const store = createTerminalStore(fakeEngine(), 'training', 'SELECT 1');
    await store.getState().run('tab-1');
    await store.getState().run('tab-1');
    expect(store.getState().history).toHaveLength(1);

    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      store.getState().setSql('tab-1', `SELECT ${i}`);
      await store.getState().run('tab-1');
    }
    expect(store.getState().history).toHaveLength(HISTORY_LIMIT);
    expect(store.getState().history[0].sql).toBe(`SELECT ${HISTORY_LIMIT + 4}`);
  });

  it('numbers tabs without reuse and never closes the last one', () => {
    const store = createTerminalStore(fakeEngine(), 'training');
    store.getState().addTab();
    store.getState().addTab();
    store.getState().closeTab('tab-3');
    store.getState().addTab();
    expect(store.getState().tabs.map((tab) => tab.number)).toEqual([1, 2, 4]);
    expect(store.getState().activeTabId).toBe('tab-4');

    store.getState().closeTab('tab-4');
    expect(store.getState().activeTabId).toBe('tab-2');
    store.getState().closeTab('tab-1');
    store.getState().closeTab('tab-2');
    expect(store.getState().tabs).toHaveLength(1);
  });
});

describe('saved queries', () => {
  it('saves with a name, renames, deletes and survives a snapshot', () => {
    const store = createTerminalStore(fakeEngine(), 'training');
    store.getState().saveQuery('  Downloads da v7  ', ' SELECT 1 ', 'training');
    store.getState().saveQuery('', 'SELECT 2', 'training');
    store.getState().saveQuery('Vazia', '   ', 'training');
    expect(store.getState().saved).toMatchObject([
      { name: 'Downloads da v7', sql: 'SELECT 1', dbId: 'training' },
    ]);
    const [entry] = store.getState().saved;
    store.getState().renameSaved(entry.id, 'Quem baixou a v7');
    expect(store.getState().saved[0].name).toBe('Quem baixou a v7');

    const restored = createTerminalStore(fakeEngine(), 'training');
    restored.getState().hydrate({
      tabs: [{ id: 'tab-1', number: 1, sql: '', dbId: 'training' }],
      activeTabId: 'tab-1',
      history: [],
      saved: store.getState().saved,
      nextNumber: 2,
    });
    expect(restored.getState().saved[0].name).toBe('Quem baixou a v7');

    store.getState().deleteSaved(entry.id);
    expect(store.getState().saved).toEqual([]);
  });
});
