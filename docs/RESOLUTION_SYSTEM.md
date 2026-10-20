# Sistema de resolução

## Princípio

O runtime descobre fatos a partir do dossiê, mas nunca classifica evidências na interface. Fatos liberam opções plausíveis; somente hashes opacos avaliam o envio. Uma opção já vista permanece liberada mesmo se a evidência que a originou for removida.

## Interfaces de domínio

```ts
export type Locale = 'pt-BR' | 'en';
/** Valor de célula. NULL do SQLite chega como null, não como texto. */
export type Scalar = string | number | null;
export type LocalizedText = Record<'pt-BR', string> &
  Partial<Record<Locale, string>>;

export interface DatabaseDescriptor {
  id: string;
  file: string;
  label: LocalizedText;
  readOnly: boolean;
}

export interface Hint {
  id: string;
  text: LocalizedText;
}

export interface Case {
  schemaVersion: number;
  id: string;
  order: number;
  title: LocalizedText;
  summary: LocalizedText;
  difficulty: 1 | 2 | 3 | 4 | 5;
  sqlConcepts: string[];
  estimatedMinutes: number;
  author: string;
  license: string;
  databases: DatabaseDescriptor[];
  startEmail: string;
  maxAttempts: number;
  hints: Hint[];
}

export interface RowHasValuesMatcher {
  type: 'rowHasValues';
  values: Scalar[];
}

export interface RowsHaveValuesMatcher {
  type: 'rowsHaveValues';
  values: Scalar[];
  min: number;
}

export interface SnippetMatcher {
  type: 'snippet';
  pageId: string;
  anchor: string;
}

export type Matcher =
  | RowHasValuesMatcher
  | RowsHaveValuesMatcher
  | SnippetMatcher;

export interface Fact {
  id: string;
  bonus: boolean;
  matcher: Matcher;
  verifyQuery: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  source: 'query' | 'site';
  dbId?: string;
  sql?: string;
  columns: string[];
  rows: Scalar[][];
  pageId?: string;
  anchor?: string;
  note?: string;
  pinnedAt: string;
}

export type OptionRequirement =
  | { all: string[] }
  | { any: string[] }
  | { minFacts: number };

export interface ReportOption {
  id: string;
  label: LocalizedText;
  requires: OptionRequirement;
}

export interface ReportSlot {
  id: string;
  label: LocalizedText;
  options: ReportOption[];
}

export interface Report {
  slots: ReportSlot[];
}

export type VerdictKind = 'correct' | 'partial' | 'wrong';

export interface Verdict {
  kind: VerdictKind;
  correctSlots: number;
  totalSlots: number;
  attempt: number;
  attemptsRemaining: number;
  exhausted: boolean;
}

export interface WindowSnapshot {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

export interface CaseProgress {
  status: 'locked' | 'available' | 'active' | 'solved' | 'failed';
  acceptedAt?: string;
  attempts: number;
  revealedHintIds: string[];
  discoveredFactIds: string[];
  unlockedOptionIds: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  stars?: 1 | 2 | 3;
  completedAt?: string;
}

export interface SaveFile {
  saveVersion: number;
  exportedAt: string;
  activeCaseId?: string;
  locale: Locale;
  theme: 'light' | 'dark' | 'system';
  wallpaperId: string;
  audio: { muted: boolean; volume: number };
  cases: Record<string, CaseProgress>;
  evidence: Evidence[];
  notes: Record<string, string>;
  readEmailIds: string[];
  unlockedEmailIds: string[];
  windows: WindowSnapshot[];
}
```

`Resolution` é o envelope privado do pacote e referencia essas interfaces:

```ts
export interface OutcomeEmails {
  correct: string;
  partial: string;
  wrong: string;
  failed: string;
}

export interface Resolution {
  facts: Fact[];
  report: Report;
  answerHashes: Record<string, string>;
  outcomes: OutcomeEmails;
}
```

## Algoritmos

Para `rowHasValues`, normalize cada célula com `String(value)` e procure uma linha que contenha todos os valores normalizados, sem considerar posição, alias ou ordem. Para `rowsHaveValues`, faça a mesma verificação por linha dentro de uma única evidência e compare a contagem com `min`. Não some linhas de fixações diferentes. `snippet` exige `source === 'site'` e igualdade de `pageId`/`anchor`.

O conjunto descoberto é recalculado a partir do dossiê atual. Já o conjunto de opções liberadas é monotônico: `novo = anterior ∪ opções satisfeitas`. Isso evita que remoção de evidência revele informação.

No envio, calcule SHA-256 de `caseId|slotId|optionId` para cada escolha. Um slot é correto se o hash coincide com `answerHashes[slotId]`. Todos corretos resultam em `correct`; ao menos um em `partial`; nenhum em `wrong`. Comparar hashes em tempo constante não é uma defesa relevante no cliente, mas a igualdade deve ser exata.

Penalidade é `tentativasErradas + dicasReveladas`. Sucesso com zero penalidades vale 3 estrelas; com até uma vale 2; qualquer outro sucesso vale 1. Completude é `fatosDescobertos / totalDeFatos * 100`, incluindo bônus, arredondada para exibição sem afetar regras.

## Invariantes

- IDs de opção são opacos e únicos dentro do slot.
- Máximo de 100 evidências por caso e 100 linhas por evidência.
- Linhas preservam os tipos do SQLite: texto, número ou `null`. Num matcher, `null` só casa com `NULL`; `String(null)` não vale como texto `"null"`.
- Fatos e respostas não aparecem em logs/telemetria; não há telemetria.
- Retornos partial/wrong nunca identificam o slot incorreto.
- Reabrir limpa dossiê, tentativas, fatos e opções do caso, mas mantém notas.
- `validate-cases` prova descobribilidade de cada fato e alcançabilidade da combinação correta.
