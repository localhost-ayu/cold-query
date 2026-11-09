/** Valor de uma célula como o SQLite devolve (BLOBs viram texto antes de chegar aqui). */
export type SqlValue = string | number | null;

export interface DatabaseSource {
  id: string;
  /** Script que cria e popula o banco do zero, rodado antes de o banco virar somente leitura. */
  sql: string;
}

export interface QueryResult {
  columns: string[];
  rows: SqlValue[][];
  /** true quando havia mais linhas que o limite e o resultado foi cortado. */
  truncated: boolean;
  elapsedMs: number;
}

export interface SchemaColumn {
  name: string;
  type: string;
  primaryKey: boolean;
}

/** Coluna desta tabela que aponta para a coluna de outra (REFERENCES). */
export interface SchemaForeignKey {
  column: string;
  table: string;
  refColumn: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  foreignKeys: SchemaForeignKey[];
}

export type SqlErrorCode =
  | 'empty'
  | 'blocked'
  | 'syntax'
  | 'incomplete'
  | 'noTable'
  | 'noColumn'
  | 'ambiguous'
  | 'readOnly'
  | 'notAuthorized'
  | 'tooBig'
  | 'timeout'
  | 'interrupted'
  | 'engine'
  | 'unknown';

export interface SqlErrorInfo {
  code: SqlErrorCode;
  /** Valores para interpolar na mensagem traduzida (nome da tabela, token etc.). */
  params: Record<string, string>;
  /** Mensagem original do SQLite, mostrada como detalhe técnico. */
  raw: string;
}

export class SqlError extends Error {
  readonly info: SqlErrorInfo;

  constructor(info: SqlErrorInfo) {
    super(info.raw || info.code);
    this.name = 'SqlError';
    this.info = info;
  }
}

export interface SqlEngine {
  open(source: DatabaseSource): Promise<SchemaTable[]>;
  exec(dbId: string, sql: string): Promise<QueryResult>;
  schema(dbId: string): Promise<SchemaTable[]>;
  close(dbId: string): Promise<void>;
}

export const MAX_RESULT_ROWS = 1000;
export const QUERY_TIMEOUT_MS = 5000;
