// @vitest-environment node
import sqlite3InitModule, { type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { discoverFacts, unlockOptions } from '../src/core/resolution';
import { loadCasesFromDisk, type DiskCase } from './cases';
import { validateCase } from './validate';

const root = fileURLToPath(new URL('..', import.meta.url));
let sqlite3: Sqlite3Static;
let case001: DiskCase;

beforeAll(async () => {
  (globalThis as { sqlite3ApiConfig?: object }).sqlite3ApiConfig = {
    warn: () => {},
  };
  sqlite3 = await sqlite3InitModule();
  case001 = loadCasesFromDisk(root).find(
    (item) => item.bundle.manifest.id === '001',
  )!;
});

describe('case 001', () => {
  it('passes validation and only Rafael + Friday night is correct', async () => {
    const report = await validateCase(case001, sqlite3);
    expect(report.errors).toEqual([]);
    expect(report.correctCombinations).toEqual([{ who: 'w1', when: 't2' }]);
  });

  it('needs both the storeroom entry and the badge owner to suggest Rafael', () => {
    const { resolution } = case001.bundle;
    const onlyEntry = unlockOptions(resolution.report, ['f_rafael_entry']);
    expect(onlyEntry.who).not.toContain('w1');
    expect(onlyEntry.when).toContain('t2');
    const both = unlockOptions(resolution.report, [
      'f_rafael_entry',
      'f_rafael_id',
    ]);
    expect(both.who).toContain('w1');
  });

  it('ships every e-mail the flow needs, in Portuguese', () => {
    const ids = case001.bundle.emails.map((email) => email.id);
    for (const id of [
      'e01-contrato',
      'e02-dicionario',
      'e90-correto',
      'e91-parcial',
      'e92-errado',
      'e93-falhou',
      'e99-proximo',
    ]) {
      expect(ids).toContain(id);
    }
    expect(
      case001.bundle.sites.find((s) => s.id === 'politica-acesso')?.anchors,
    ).toEqual(['p-almox', 'p-limpeza', 'p-ronda', 'p-retirada']);
  });
});

describe('case 002', () => {
  it('passes validation and only Tiago + July 2025 is correct', async () => {
    const case002 = loadCasesFromDisk(root).find(
      (item) => item.bundle.manifest.id === '002',
    )!;
    const report = await validateCase(case002, sqlite3);
    expect(report.errors).toEqual([]);
    expect(report.correctCombinations).toEqual([{ who: 'w3', when: 't3' }]);
  });

  it('arrives only after case 001 is solved', () => {
    const case002 = loadCasesFromDisk(root).find(
      (item) => item.bundle.manifest.id === '002',
    )!;
    const contract = case002.bundle.emails.find(
      (email) => email.id === case002.bundle.manifest.startEmail,
    );
    expect(contract?.unlockedBy).toBe('answerCorrect:001');
  });
});

describe('site anchors', () => {
  it('wrap exactly the paragraph that ends with {#id}', () => {
    const page = case001.bundle.sites.find((s) => s.id === 'politica-acesso')!;
    const almox = page.html.match(/<p id="p-almox"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    expect(almox?.startsWith('O almoxarifado de TI')).toBe(true);
    expect(page.html).toContain('<p>Revisão de janeiro de 2026.');
  });
});

describe('validator', () => {
  it('catches a fact whose reference query does not prove it', async () => {
    const broken = structuredClone(case001);
    const fact = broken.bundle.resolution.facts.find(
      (f) => f.id === 'f_rafael_id',
    )!;
    fact.matcher = { type: 'rowHasValues', values: [4471, 'Fulano de Tal'] };
    const report = await validateCase(broken, sqlite3);
    expect(report.errors).toContain(
      'f_rafael_id: verifyQuery não satisfaz o matcher',
    );
    expect(report.errors).toContain('who.w1 nunca é liberada');
  });

  it('catches answer hashes that match no option', async () => {
    const broken = structuredClone(case001);
    broken.bundle.resolution.answerHashes.when = '0'.repeat(64);
    const report = await validateCase(broken, sqlite3);
    expect(report.errors).toContain('esperava 1 combinação correta, achei 0');
  });

  it('discovers nothing from an empty dossier', () => {
    expect(discoverFacts(case001.bundle.resolution.facts, [])).toEqual([]);
  });
});
