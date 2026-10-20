import type {
  Database,
  Sqlite3Static,
  SqlValue as RawSqlValue,
} from '@sqlite.org/sqlite-wasm';

import { toSqlError } from './errors';
import { READ_ONLY_PRAGMAS, guardStatement, stripLiterals } from './guard';
import {
  MAX_RESULT_ROWS,
  type QueryResult,
  type SchemaTable,
  type SqlValue,
} from './types';

/** Teto para strings e blobs criados por consulta (zeroblob(1e9) e afins). */
const MAX_VALUE_BYTES = 8 * 1024 * 1024;

/**
 * Cria um banco em memória a partir do script do caso e o fecha para escrita.
 * A ordem importa: o script roda primeiro; depois query_only, limites e o
 * authorizer, que também negaria o próprio PRAGMA query_only.
 */
export function createDatabase(
  sqlite3: Sqlite3Static,
  script: string,
): Database {
  const db = new sqlite3.oo1.DB(':memory:');
  const { capi } = sqlite3;
  try {
    db.exec(script);
    db.exec('PRAGMA query_only = ON');
    capi.sqlite3_limit(db, capi.SQLITE_LIMIT_LENGTH, MAX_VALUE_BYTES);
    capi.sqlite3_limit(db, capi.SQLITE_LIMIT_ATTACHED, 0);
    capi.sqlite3_set_authorizer(
      db,
      (_userData, action, arg1) => {
        if (action === capi.SQLITE_ATTACH || action === capi.SQLITE_DETACH) {
          return capi.SQLITE_DENY;
        }
        if (action === capi.SQLITE_PRAGMA) {
          return typeof arg1 === 'string' &&
            READ_ONLY_PRAGMAS.has(arg1.toLowerCase())
            ? capi.SQLITE_OK
            : capi.SQLITE_DENY;
        }
        return capi.SQLITE_OK;
      },
      0,
    );
    return db;
  } catch (error) {
    db.close();
    throw toSqlError(error);
  }
}

/** Divide o texto em comandos pelos ';' que estão fora de strings e comentários. */
export function splitStatements(sql: string): string[] {
  // stripLiterals preserva o comprimento, então os índices valem para o original.
  const code = stripLiterals(sql);
  const statements: string[] = [];
  let start = 0;
  for (let index = 0; index <= code.length; index += 1) {
    if (index === code.length || code[index] === ';') {
      if (code.slice(start, index).trim()) {
        statements.push(sql.slice(start, index).trim());
      }
      start = index + 1;
    }
  }
  return statements;
}

function toCell(value: RawSqlValue): SqlValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value === 'bigint') {
    // Inteiros acima de 2^53 viram texto para não perder dígitos.
    return Number.isSafeInteger(Number(value))
      ? Number(value)
      : value.toString();
  }
  const bytes = value instanceof ArrayBuffer ? value.byteLength : value.length;
  return `[BLOB ${bytes} B]`;
}

/**
 * Executa um ou mais comandos e devolve o último conjunto de linhas.
 * Comandos sem colunas (raros num banco somente leitura) só são executados.
 */
export function runQuery(
  db: Database,
  sql: string,
  maxRows: number = MAX_RESULT_ROWS,
): QueryResult {
  guardStatement(sql);
  const started = performance.now();
  let result: Omit<QueryResult, 'elapsedMs'> = {
    columns: [],
    rows: [],
    truncated: false,
  };

  try {
    for (const text of splitStatements(sql)) {
      const statement = db.prepare(text);
      try {
        if (statement.columnCount === 0) {
          while (statement.step()) {
            /* consome o comando inteiro */
          }
          continue;
        }
        const rows: SqlValue[][] = [];
        let truncated = false;
        while (statement.step()) {
          if (rows.length === maxRows) {
            truncated = true;
            break;
          }
          rows.push(statement.get([]).map(toCell));
        }
        result = { columns: statement.getColumnNames(), rows, truncated };
      } finally {
        statement.finalize();
      }
    }
  } catch (error) {
    throw toSqlError(error);
  }

  return { ...result, elapsedMs: Math.round(performance.now() - started) };
}

/** Tabelas e colunas visíveis ao jogador, em ordem alfabética. */
export function readSchema(db: Database): SchemaTable[] {
  const tables = db.selectValues(
    "SELECT name FROM sqlite_schema WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ) as string[];

  return tables.map((name) => ({
    name,
    columns: db
      .selectArrays(
        'SELECT name, type, pk FROM pragma_table_info(?) ORDER BY cid',
        [name],
      )
      .map(([column, type, pk]) => ({
        name: String(column),
        type: String(type || ''),
        primaryKey: Number(pk) > 0,
      })),
  }));
}
