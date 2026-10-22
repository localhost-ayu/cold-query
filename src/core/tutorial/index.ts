import type { LocalizedText } from '@/core/case-schema';
import type { QueryResult, SqlValue } from '@/core/sql/types';

export interface TutorialChallenge {
  id: string;
  /** Conceito de SQL treinado, mostrado como etiqueta. */
  concept: string;
  task: LocalizedText;
  hint: LocalizedText;
  /**
   * Respostas aceitas: listas de valores que precisam aparecer numa mesma
   * coluna do resultado (por exemplo, os ids ou os nomes dos clientes). Assim
   * vale tanto `SELECT *` quanto `SELECT id` ou `SELECT client`.
   */
  expect: SqlValue[][];
  /** true quando a ordem das linhas faz parte da resposta (ORDER BY). */
  ordered: boolean;
}

const text = (value: SqlValue) =>
  value === null ? '\u0000null' : String(value);

/** Compara como multiconjunto (mesmos valores, mesma quantidade, qualquer ordem). */
function sameValues(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

/**
 * O resultado resolve o desafio? Precisa ter exatamente o número de linhas
 * esperado e alguma coluna com os valores esperados (na ordem, se `ordered`).
 */
export function checkChallenge(
  challenge: TutorialChallenge,
  result: QueryResult,
): boolean {
  if (result.truncated) return false;
  return challenge.expect.some((expected) => {
    if (result.rows.length !== expected.length) return false;
    const want = expected.map(text);
    return result.columns.some((_, column) => {
      const got = result.rows.map((row) => text(row[column]));
      return challenge.ordered
        ? got.every((value, index) => value === want[index])
        : sameValues(got, want);
    });
  });
}
