/**
 * Validação de conteúdo de um caso (além do schema): cada fato precisa ser
 * descobrível, a resposta certa precisa estar entre as opções liberáveis e
 * exatamente uma combinação de opções pode ser a correta.
 */
import { readFileSync } from 'node:fs';

import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';

import {
  answerHash,
  discoverFacts,
  matches,
  unlockOptions,
  type Evidence,
} from '../src/core/resolution';
import { createDatabase, runQuery } from '../src/core/sql/database';
import type { DiskCase } from './cases';

export interface CaseReport {
  caseId: string;
  errors: string[];
  /** Combinações de opções que o hash aceita como corretas. */
  correctCombinations: Array<Record<string, string>>;
}

function combinations(
  slots: Array<{ id: string; options: string[] }>,
): Array<Record<string, string>> {
  return slots.reduce<Array<Record<string, string>>>(
    (acc, slot) =>
      acc.flatMap((partial) =>
        slot.options.map((option) => ({ ...partial, [slot.id]: option })),
      ),
    [{}],
  );
}

export async function validateCase(
  diskCase: DiskCase,
  sqlite3: Sqlite3Static,
): Promise<CaseReport> {
  const { manifest, resolution, sites } = diskCase.bundle;
  const errors: string[] = [];
  const caseId = manifest.id;

  // Um banco por id, construído a partir do SQL versionado.
  const databases = Object.fromEntries(
    Object.entries(diskCase.databases).map(([id, file]) => [
      id,
      createDatabase(sqlite3, readFileSync(file, 'utf8')),
    ]),
  );
  const mainDb = databases[manifest.databases[0].id];

  // Cada fato: a verifyQuery precisa produzir linhas que satisfaçam o matcher.
  const evidence: Evidence[] = [];
  for (const fact of resolution.facts) {
    if (fact.matcher.type === 'snippet') {
      const { pageId, anchor } = fact.matcher;
      const page = sites.find((site) => site.id === pageId);
      if (!page?.anchors.includes(anchor)) {
        errors.push(`${fact.id}: âncora ${pageId}#${anchor} não existe`);
        continue;
      }
      evidence.push({
        id: fact.id,
        caseId,
        source: 'site',
        pageId,
        anchor,
        columns: [],
        rows: [],
        pinnedAt: '',
      });
      continue;
    }
    if (!fact.verifyQuery) {
      errors.push(`${fact.id}: falta verifyQuery`);
      continue;
    }
    try {
      const result = runQuery(mainDb, fact.verifyQuery, 100);
      const item: Evidence = {
        id: fact.id,
        caseId,
        source: 'query',
        columns: result.columns,
        rows: result.rows,
        pinnedAt: '',
      };
      if (!matches(fact.matcher, item))
        errors.push(`${fact.id}: verifyQuery não satisfaz o matcher`);
      evidence.push(item);
    } catch (error) {
      errors.push(`${fact.id}: verifyQuery falhou (${String(error)})`);
    }
  }

  // Com todas as evidências de referência, toda opção precisa ser liberável.
  const discovered = discoverFacts(resolution.facts, evidence);
  const unlocked = unlockOptions(resolution.report, discovered);
  for (const slot of resolution.report.slots) {
    for (const option of slot.options) {
      if (!unlocked[slot.id].includes(option.id))
        errors.push(`${slot.id}.${option.id} nunca é liberada`);
    }
  }

  // Exatamente uma combinação correta, e ela precisa estar entre as liberadas.
  const slots = resolution.report.slots.map((slot) => ({
    id: slot.id,
    options: slot.options.map((option) => option.id),
  }));
  const correctCombinations: Array<Record<string, string>> = [];
  for (const combination of combinations(slots)) {
    const hashes = await Promise.all(
      slots.map((slot) => answerHash(caseId, slot.id, combination[slot.id])),
    );
    if (
      hashes.every(
        (hash, index) => resolution.answerHashes[slots[index].id] === hash,
      )
    )
      correctCombinations.push(combination);
  }
  if (correctCombinations.length !== 1)
    errors.push(
      `esperava 1 combinação correta, achei ${correctCombinations.length}`,
    );

  for (const db of Object.values(databases)) db.close();
  return { caseId, errors, correctCombinations };
}
