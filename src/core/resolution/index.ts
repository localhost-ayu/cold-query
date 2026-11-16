import type {
  Fact,
  Matcher,
  Requirement,
  Resolution,
} from '@/core/case-schema';
import type { SqlValue } from '@/core/sql/types';

export const MAX_EVIDENCE = 100;
export const MAX_EVIDENCE_ROWS = 100;

/** Algo que o jogador fixou no dossiê: linhas de uma consulta ou um trecho de site. */
export interface Evidence {
  id: string;
  caseId: string;
  source: 'query' | 'site';
  dbId?: string;
  sql?: string;
  columns: string[];
  rows: SqlValue[][];
  pageId?: string;
  anchor?: string;
  note?: string;
  pinnedAt: string;
}

// ── matchers ───────────────────────────────────────────────────────────

/** NULL só casa com null; o resto compara como texto ("4471" casa com 4471). */
function cellMatches(cell: SqlValue, value: SqlValue): boolean {
  if (cell === null || value === null) return cell === value;
  return String(cell) === String(value);
}

/** A linha tem todos os valores, em qualquer coluna e ordem. */
export function rowHasValues(row: SqlValue[], values: SqlValue[]): boolean {
  return values.every((value) => row.some((cell) => cellMatches(cell, value)));
}

export function matches(matcher: Matcher, evidence: Evidence): boolean {
  switch (matcher.type) {
    case 'rowHasValues':
      return (
        evidence.source === 'query' &&
        evidence.rows.some((row) => rowHasValues(row, matcher.values))
      );
    case 'rowsHaveValues':
      // Conta linhas dentro de uma mesma fixação; fixações diferentes não somam.
      return (
        evidence.source === 'query' &&
        evidence.rows.filter((row) => rowHasValues(row, matcher.values))
          .length >= matcher.min
      );
    case 'snippet':
      return (
        evidence.source === 'site' &&
        evidence.pageId === matcher.pageId &&
        evidence.anchor === matcher.anchor
      );
  }
}

/** Fatos que o dossiê atual sustenta. Recalculado sempre a partir das evidências. */
export function discoverFacts(facts: Fact[], evidence: Evidence[]): string[] {
  return facts
    .filter((fact) => evidence.some((item) => matches(fact.matcher, item)))
    .map((fact) => fact.id);
}

// ── opções do relatório ────────────────────────────────────────────────

export function isSatisfied(
  requirement: Requirement,
  discovered: ReadonlySet<string>,
): boolean {
  if ('all' in requirement)
    return requirement.all.every((fact) => discovered.has(fact));
  if ('any' in requirement)
    return requirement.any.some((fact) => discovered.has(fact));
  return discovered.size >= requirement.minFacts;
}

/**
 * Opções liberadas por slot. É monotônico: o que já apareceu nunca some, mesmo
 * que a evidência seja removida, para remover não virar um jeito de testar pistas.
 */
export function unlockOptions(
  report: Resolution['report'],
  discovered: Iterable<string>,
  previous: Record<string, string[]> = {},
): Record<string, string[]> {
  const known = new Set(discovered);
  return Object.fromEntries(
    report.slots.map((slot) => {
      const already = new Set(previous[slot.id] ?? []);
      const unlocked = slot.options
        .filter(
          (option) =>
            already.has(option.id) || isSatisfied(option.requires, known),
        )
        .map((option) => option.id);
      return [slot.id, unlocked];
    }),
  );
}

// ── veredito ───────────────────────────────────────────────────────────

/** sha256 em hexadecimal, pela Web Crypto (existe no navegador, no Bun e no Node). */
export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function answerHash(caseId: string, slotId: string, optionId: string) {
  return sha256(`${caseId}|${slotId}|${optionId}`);
}

export type VerdictKind = 'correct' | 'partial' | 'wrong';

/** Compara a escolha de cada slot com o hash da resposta. Não diz qual slot errou. */
export async function judge(
  caseId: string,
  answerHashes: Record<string, string>,
  selection: Record<string, string>,
): Promise<VerdictKind> {
  const slots = Object.keys(answerHashes);
  const results = await Promise.all(
    slots.map(async (slot) => {
      const option = selection[slot];
      return option !== undefined &&
        (await answerHash(caseId, slot, option)) === answerHashes[slot]
        ? 1
        : 0;
    }),
  );
  const correct = results.reduce<number>((sum, value) => sum + value, 0);
  if (correct === slots.length) return 'correct';
  return correct > 0 ? 'partial' : 'wrong';
}

/**
 * Estrelas: 3 acertando de primeira sem dicas; 2 com no máximo uma penalidade
 * (um erro ou uma dica); 1 nos demais casos.
 */
/**
 * Quantas dicas o jogador pode revelar agora. As marcadas com
 * `afterWrongAttempt` ficam no fim e só contam depois de um relatório errado.
 */
export function availableHints(
  hints: Array<{ afterWrongAttempt?: boolean }>,
  wrongAttempts: number,
): number {
  return wrongAttempts > 0
    ? hints.length
    : hints.filter((hint) => !hint.afterWrongAttempt).length;
}

export function stars(wrongAttempts: number, hintsUsed: number): 1 | 2 | 3 {
  const penalties = wrongAttempts + hintsUsed;
  if (penalties === 0) return 3;
  return penalties === 1 ? 2 : 1;
}

/** Porcentagem de fatos descobertos, bônus incluídos. Só para exibição. */
export function completeness(facts: Fact[], discovered: string[]): number {
  if (facts.length === 0) return 0;
  return Math.round((new Set(discovered).size / facts.length) * 100);
}
