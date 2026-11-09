import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import {
  CURRENT_SAVE_VERSION,
  MAX_SAVE_BYTES,
  migrate,
  parseSave,
  type Migration,
} from './schema';
import { createIdbCollection, createIdbStorage } from './storage';

const valid = {
  app: 'cold-query',
  saveVersion: CURRENT_SAVE_VERSION,
  savedAt: '2026-10-21T12:00:00.000Z',
  game: {
    cases: {
      '001': {
        status: 'active',
        attempts: 1,
        wrongAttempts: 1,
        hintsRevealed: 0,
        discoveredFacts: ['f_audit'],
        unlockedOptions: { who: ['w4'] },
        selection: { who: 'w4' },
      },
    },
    inbox: [
      {
        id: 'm-1',
        caseId: '001',
        emailId: 'e01-contrato',
        deliveredAt: 1,
        read: true,
      },
    ],
    evidence: [],
    notes: { '001': 'olhar a auditoria' },
    started: true,
  },
};

describe('parseSave', () => {
  it('accepts a current save as text or object', () => {
    expect(parseSave(JSON.stringify(valid))).toMatchObject({
      ok: true,
      migratedFrom: null,
    });
    expect(parseSave(valid).ok).toBe(true);
  });

  it('rejects broken JSON, other apps and tampered fields', () => {
    expect(parseSave('{not json')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseSave({ ...valid, app: 'other-game' }).ok).toBe(false);
    const tampered = structuredClone(valid);
    (tampered.game.cases['001'] as { stars?: number }).stars = 7;
    expect(parseSave(tampered).ok).toBe(false);
  });

  it('refuses saves from a newer version of the game', () => {
    expect(parseSave({ ...valid, saveVersion: 99 })).toEqual({
      ok: false,
      reason: 'newer',
    });
  });

  it('refuses huge files before parsing them', () => {
    const huge = `{"x":"${'a'.repeat(MAX_SAVE_BYTES)}"}`;
    expect(parseSave(huge)).toEqual({ ok: false, reason: 'tooLarge' });
  });
});

describe('migrate', () => {
  // Simula um jogo na versão 3 com duas migrações encadeadas.
  const steps: Record<number, Migration> = {
    1: (save) => ({ ...save, saveVersion: 2, renamed: save.old }),
    2: (save) => ({ ...save, saveVersion: 3, extra: true }),
  };

  it('runs every step from the save version up to the target', () => {
    expect(migrate({ saveVersion: 1, old: 'x' }, steps, 3)).toMatchObject({
      saveVersion: 3,
      renamed: 'x',
      extra: true,
    });
  });

  it('fails when a step is missing or lies about its version', () => {
    expect(migrate({ saveVersion: 1 }, { 1: steps[1] }, 3)).toBe('invalid');
    expect(migrate({ saveVersion: 1 }, { 1: (s) => s }, 2)).toBe('invalid');
    expect(migrate({ saveVersion: 0 }, steps, 3)).toBe('invalid');
  });
});

describe('IndexedDB storage', () => {
  it('writes, reads back and clears the autosave', async () => {
    const storage = createIdbStorage();
    expect(await storage.read()).toBeNull();
    await storage.write(valid);
    expect(await storage.read()).toEqual(valid);
    await storage.clear();
    expect(await storage.read()).toBeNull();
  });

  it('rejects when IndexedDB is not available', async () => {
    await expect(createIdbStorage(null).read()).rejects.toThrow();
  });
});

describe('IndexedDB collections', () => {
  it('lists, replaces and removes entries next to the autosave', async () => {
    const cases = createIdbCollection<{ id: string; title: string }>();
    await cases.put('901', { id: '901', title: 'A' });
    await cases.put('901', { id: '901', title: 'B' });
    await cases.put('902', { id: '902', title: 'C' });
    expect((await cases.list()).map((item) => item.title).sort()).toEqual([
      'B',
      'C',
    ]);
    await cases.remove('901');
    expect(await cases.list()).toEqual([{ id: '902', title: 'C' }]);
    // O autosave continua no seu depósito.
    const saves = createIdbStorage();
    await saves.write({ ok: true });
    expect(await saves.read()).toEqual({ ok: true });
  });
});
