import type {
  DatabaseSource,
  QueryResult,
  SchemaTable,
  SqlErrorInfo,
} from './types';

/** Mensagens da página para o worker. Cada uma tem um id para casar a resposta. */
export type WorkerRequest =
  | { id: number; type: 'open'; source: DatabaseSource }
  | { id: number; type: 'exec'; dbId: string; sql: string }
  | { id: number; type: 'schema'; dbId: string }
  | { id: number; type: 'close'; dbId: string };

export type WorkerResponse =
  | { id: number; ok: true; value: QueryResult | SchemaTable[] | null }
  | { id: number; ok: false; error: SqlErrorInfo };
