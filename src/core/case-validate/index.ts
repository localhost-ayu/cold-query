import type { CaseBundle } from '@/core/case-schema';
import {
  answerHash,
  discoverFacts,
  matches,
  unlockOptions,
  type Evidence,
} from '@/core/resolution';
import type { QueryResult } from '@/core/sql/types';

export interface CaseReport {
  caseId: string;
  errors: string[];
  /** Combinações de opções que o hash aceita como corretas. */
  correctCombinations: Array<Record<string, string>>;
}

/** Roda uma consulta num banco do caso. Pode ser síncrona (Node) ou assíncrona (worker). */
export type RunQuery = (
  dbId: string,
  sql: string,
) => QueryResult | Promise<QueryResult>;

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

/**
 * Validação de conteúdo de um caso, além do schema: cada fato precisa ser
 * descobrível pela sua consulta de referência, toda opção do relatório precisa
 * ser liberável e exatamente uma combinação de opções pode ser a correta.
 */
export async function validateCase(
  bundle: CaseBundle,
  runQuery: RunQuery,
): Promise<CaseReport> {
  const { manifest, resolution, sites } = bundle;
  const errors: string[] = [];
  const caseId = manifest.id;
  const mainDb = manifest.databases[0].id;

  const evidence: Evidence[] = [];
  for (const fact of resolution.facts) {
    if (fact.matcher.type === 'snippet') {
      const { pageId, anchor } = fact.matcher;
      if (
        !sites.some(
          (site) => site.id === pageId && site.anchors.includes(anchor),
        )
      ) {
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
      const result = await runQuery(mainDb, fact.verifyQuery);
      const item: Evidence = {
        id: fact.id,
        caseId,
        source: 'query',
        columns: result.columns,
        rows: result.rows.slice(0, 100),
        pinnedAt: '',
      };
      if (!matches(fact.matcher, item))
        errors.push(`${fact.id}: verifyQuery não satisfaz o matcher`);
      evidence.push(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${fact.id}: verifyQuery falhou (${message})`);
    }
  }

  // Com todas as evidências de referência, toda opção precisa ser liberável.
  const unlocked = unlockOptions(
    resolution.report,
    discoverFacts(resolution.facts, evidence),
  );
  for (const slot of resolution.report.slots) {
    for (const option of slot.options) {
      if (!unlocked[slot.id].includes(option.id))
        errors.push(`${slot.id}.${option.id} nunca é liberada`);
    }
  }

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

  return { caseId, errors, correctCombinations };
}
