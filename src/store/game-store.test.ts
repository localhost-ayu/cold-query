import { cases } from 'virtual:cases';
import { describe, expect, it, vi } from 'vitest';

import { createGameStore, findEmail } from './game-store';

const case001 = cases.find((bundle) => bundle.manifest.id === '001')!;

function setup() {
  const onDeliver = vi.fn();
  const store = createGameStore([case001], { onDeliver, now: () => 1000 });
  store.getState().start();
  return { store, onDeliver };
}

const emailIds = (store: ReturnType<typeof setup>['store']) =>
  store.getState().inbox.map((item) => item.emailId);

/** Linhas iguais às que o jogador veria no Terminal para cada fato. */
const rows = {
  rafaelEntry: [[812, 4471, 'ALMOX_TI', 'IN', '2026-03-13 22:47:03']],
  rafaelId: [[9, 'Rafael Tavares', 'Financeiro', 4471]],
  deniseEntry: [[790, 9002, 'ALMOX_TI', 'IN', '2026-03-13 19:05:22']],
};

function pin(store: ReturnType<typeof setup>['store'], data: unknown[][]) {
  return store.getState().pinEvidence({
    caseId: '001',
    source: 'query',
    dbId: '001:main',
    sql: 'SELECT …',
    columns: [],
    rows: data as never,
  });
}

describe('game store', () => {
  it('delivers the contract at start, once, and announces it', () => {
    const { store, onDeliver } = setup();
    store.getState().start();
    expect(emailIds(store)).toEqual(['e01-contrato']);
    expect(onDeliver).toHaveBeenCalledTimes(1);
  });

  it('accepting the case activates it and sends the data dictionary', () => {
    const { store } = setup();
    expect(pin(store, rows.rafaelEntry)).toEqual({
      ok: false,
      reason: 'inactive',
    });
    store.getState().acceptCase('001');
    expect(store.getState().cases['001'].status).toBe('active');
    expect(emailIds(store)).toEqual(['e02-dicionario', 'e01-contrato']);
  });

  it('pinned evidence unlocks options, and they stay after removal', () => {
    const { store } = setup();
    store.getState().acceptCase('001');
    pin(store, rows.rafaelEntry);
    const idPin = pin(store, rows.rafaelId);
    expect(idPin).toEqual({ ok: true, truncated: false });

    const progress = store.getState().cases['001'];
    expect(progress.discoveredFacts).toEqual(['f_rafael_entry', 'f_rafael_id']);
    expect(progress.unlockedOptions.who).toEqual(['w1']);
    expect(progress.unlockedOptions.when).toEqual(['t2']);

    const removed = store
      .getState()
      .removeEvidence(store.getState().evidence[0].id);
    expect(store.getState().cases['001'].discoveredFacts).toEqual([
      'f_rafael_id',
    ]);
    expect(store.getState().cases['001'].unlockedOptions.who).toEqual(['w1']);
    store.getState().restoreEvidence(removed!);
    expect(store.getState().evidence).toHaveLength(2);
  });

  it('caps rows per pin', () => {
    const { store } = setup();
    store.getState().acceptCase('001');
    const many = Array.from({ length: 150 }, (_, i) => [i]);
    expect(pin(store, many)).toEqual({ ok: true, truncated: true });
    expect(store.getState().evidence[0].rows).toHaveLength(100);
  });

  it('only lets the player pick unlocked options', () => {
    const { store } = setup();
    store.getState().acceptCase('001');
    store.getState().selectOption('001', 'who', 'w1');
    expect(store.getState().cases['001'].selection).toEqual({});
  });

  it('solves on the first try with three stars and the teaser', async () => {
    const { store } = setup();
    store.getState().acceptCase('001');
    pin(store, rows.rafaelEntry);
    pin(store, rows.rafaelId);
    store.getState().selectOption('001', 'who', 'w1');
    store.getState().selectOption('001', 'when', 't2');
    expect(await store.getState().submitReport('001')).toBe('correct');
    expect(store.getState().cases['001']).toMatchObject({
      status: 'solved',
      stars: 3,
      attempts: 1,
    });
    expect(emailIds(store).slice(0, 2)).toEqual(['e99-proximo', 'e90-correto']);
  });

  it('counts hints and mistakes, then fails after the last attempt', async () => {
    const { store } = setup();
    store.getState().acceptCase('001');
    store.getState().revealHint('001');
    pin(store, rows.deniseEntry);
    pin(store, rows.rafaelEntry);
    pin(store, rows.rafaelId);
    store.getState().selectOption('001', 'who', 'w2');
    store.getState().selectOption('001', 'when', 't2');
    expect(await store.getState().submitReport('001')).toBe('partial');
    store.getState().selectOption('001', 'when', 't1');
    expect(await store.getState().submitReport('001')).toBe('wrong');
    expect(await store.getState().submitReport('001')).toBe('failed');
    expect(store.getState().cases['001']).toMatchObject({
      status: 'failed',
      attempts: 3,
      hintsRevealed: 1,
    });
    expect(emailIds(store)[0]).toBe('e93-falhou');
  });

  it('reopening wipes the dossier and attempts but keeps notes', async () => {
    const { store } = setup();
    store.getState().acceptCase('001');
    store.getState().setNote('001', 'Rafael?');
    pin(store, rows.deniseEntry);
    store.getState().selectOption('001', 'who', 'w2');
    store.getState().selectOption('001', 'when', 't1');
    for (let i = 0; i < 3; i += 1) await store.getState().submitReport('001');
    store.getState().reopenCase('001');
    expect(store.getState().cases['001']).toMatchObject({
      status: 'active',
      attempts: 0,
      unlockedOptions: {},
      discoveredFacts: [],
    });
    expect(store.getState().evidence).toEqual([]);
    expect(store.getState().notes['001']).toBe('Rafael?');
  });

  it('finds e-mails in the requested language with Portuguese as fallback', () => {
    expect(findEmail(case001, 'e01-contrato', 'en')?.locale).toBe('pt-BR');
  });
});
