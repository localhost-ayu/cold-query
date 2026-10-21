/** Módulo gerado pelo plugin `cold-query-cases` (vite.config.ts). */
declare module 'virtual:cases' {
  import type { CaseBundle } from '@/core/case-schema';

  export const cases: CaseBundle[];
  /** Chave "caseId:dbId" → carrega o SQL do banco sob demanda. */
  export const databaseLoaders: Record<string, () => Promise<string>>;
}
