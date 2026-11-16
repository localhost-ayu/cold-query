import { cases } from 'virtual:cases';
import { describe, expect, it, vi } from 'vitest';

import { createGameStore, findEmail } from './game-store';

const case001 = cases.find((bundle) => bundle.manifest.id === '001')!;
const case002 = cases.find((bundle) => bundle.manifest.id === '002')!;

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
    expect(findEmail(case001, 'e01-contrato', 'en')?.locale).toBe('en');
    const onlyPortuguese = {
      ...case001,
      emails: case001.emails.filter((email) => email.locale === 'pt-BR'),
    };
    expect(findEmail(onlyPortuguese, 'e01-contrato', 'en')?.locale).toBe(
      'pt-BR',
    );
  });
});

describe('training day', () => {
  function withTutorial() {
    const onDeliver = vi.fn();
    const store = createGameStore([case001], {
      onDeliver,
      tutorialSteps: 3,
      now: () => 1000,
    });
    store.getState().start();
    return { store, onDeliver };
  }
  const ids = (store: ReturnType<typeof withTutorial>['store']) =>
    store.getState().inbox.map((item) => `${item.caseId}:${item.emailId}`);

  it('starts with the welcome e-mail instead of the contract', () => {
    const { store } = withTutorial();
    expect(ids(store)).toEqual(['tutorial:welcome']);
    expect(store.getState().tutorial).toEqual({ status: 'pending', step: 0 });
  });

  it('skipping delivers the contract right away, once', () => {
    const { store } = withTutorial();
    store.getState().skipTutorial();
    store.getState().skipTutorial();
    expect(ids(store)).toEqual(['001:e01-contrato', 'tutorial:welcome']);
    expect(store.getState().tutorial.status).toBe('skipped');
  });

  it('advances one exercise at a time and finishes with the contract', () => {
    const { store } = withTutorial();
    store.getState().startTutorial();
    store.getState().completeTutorialStep(1); // fora de ordem: ignorado
    expect(store.getState().tutorial.step).toBe(0);
    store.getState().completeTutorialStep(0);
    store.getState().completeTutorialStep(1);
    expect(ids(store)).toEqual(['tutorial:welcome']);
    store.getState().completeTutorialStep(2);
    expect(store.getState().tutorial).toEqual({ status: 'done', step: 3 });
    expect(ids(store)).toEqual([
      '001:e01-contrato',
      'tutorial:done',
      'tutorial:welcome',
    ]);
  });

  it('treats older saves without the field as already past the training', () => {
    const { store } = withTutorial();
    store.getState().hydrate({
      cases: {},
      inbox: [],
      evidence: [],
      notes: {},
      started: true,
    });
    expect(store.getState().tutorial.status).toBe('skipped');
  });
});

describe('case progression', () => {
  it('delivers the next contract only when the previous case is solved', async () => {
    const store = createGameStore([case001, case002], { now: () => 1000 });
    store.getState().start();
    const contracts = () =>
      store
        .getState()
        .inbox.filter((item) => item.emailId === 'e01-contrato')
        .map((item) => item.caseId);
    expect(contracts()).toEqual(['001']);

    store.getState().acceptCase('001');
    // Aceitar o 001 só libera os e-mails do próprio 001.
    expect(
      store.getState().inbox.filter((item) => item.caseId === '002'),
    ).toEqual([]);
    pin(store, rows.deniseEntry);
    store.getState().selectOption('001', 'who', 'w2');
    store.getState().selectOption('001', 'when', 't1');
    expect(await store.getState().submitReport('001')).toBe('wrong');
    expect(contracts()).toEqual(['001']);

    pin(store, rows.rafaelEntry);
    pin(store, rows.rafaelId);
    store.getState().selectOption('001', 'who', 'w1');
    store.getState().selectOption('001', 'when', 't2');
    expect(await store.getState().submitReport('001')).toBe('correct');
    expect(contracts().sort()).toEqual(['001', '002']);
    expect(
      store
        .getState()
        .inbox.filter((item) => item.caseId === '002')
        .map((item) => item.emailId),
    ).toEqual(['e01-contrato']);

    store.getState().acceptCase('002');
    expect(
      store
        .getState()
        .inbox.filter((item) => item.caseId === '002')
        .map((item) => item.emailId)
        .sort(),
    ).toEqual(['e01-contrato', 'e02-dicionario']);
  });
});

describe('imported cases', () => {
  const mod = {
    ...case001,
    manifest: { ...case001.manifest, id: '901', order: 901 },
  };

  it('registers a case and, after the start, delivers its contract right away', () => {
    const { store } = setup();
    store.getState().addCases([mod]);
    expect(store.getState().cases['901'].status).toBe('available');
    expect(store.getState().inbox[0]).toMatchObject({
      caseId: '901',
      emailId: 'e01-contrato',
    });
    store.getState().acceptCase('901');
    expect(store.getState().cases['901'].status).toBe('active');
  });

  it('removing a case drops its progress, e-mails and evidence', () => {
    const { store } = setup();
    store.getState().addCases([mod]);
    store.getState().acceptCase('901');
    store.getState().pinEvidence({
      caseId: '901',
      source: 'query',
      columns: ['x'],
      rows: [[1]],
    });
    store.getState().removeCase('901');
    expect(store.getState().cases['901']).toBeUndefined();
    expect(store.getState().inbox.some((item) => item.caseId === '901')).toBe(
      false,
    );
    expect(store.getState().evidence).toEqual([]);
    expect(store.getState().cases['001']).toBeDefined();
  });
});
