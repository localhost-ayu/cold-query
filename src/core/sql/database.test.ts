// @vitest-environment node
import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { trainingDatabase } from '@/content/databases/training';

import {
  createDatabase,
  readSchema,
  runQuery,
  splitStatements,
} from './database';
import { SqlError } from './types';

let sqlite3: Sqlite3Static;
let db: Database;

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

beforeEach(() => {
  db = createDatabase(sqlite3, trainingDatabase.sql);
});

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return error instanceof SqlError ? error.info.code : 'not-sql-error';
  }
  return undefined;
}

describe('runQuery', () => {
  it('returns columns, rows and NULLs as null', () => {
    const result = runQuery(
      db,
      'SELECT id, analyst_id FROM contracts WHERE id = 112',
    );
    expect(result.columns).toEqual(['id', 'analyst_id']);
    expect(result.rows).toEqual([[112, null]]);
    expect(result.truncated).toBe(false);
  });

  it('returns the last result set of a script', () => {
    const result = runQuery(
      db,
      'SELECT 1; SELECT name FROM analysts WHERE id = 1; -- fim',
    );
    expect(result.rows).toEqual([['Helena Duarte']]);
  });

  it('cuts results at the row limit and says so', () => {
    const sql =
      'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 50) SELECT x FROM n';
    const result = runQuery(db, sql, 20);
    expect(result.rows).toHaveLength(20);
    expect(result.truncated).toBe(true);
    expect(runQuery(db, sql, 50).truncated).toBe(false);
  });

  it('refuses writes because the database is query_only', () => {
    expect(errorCode(() => runQuery(db, 'DELETE FROM analysts'))).toBe(
      'readOnly',
    );
    expect(errorCode(() => runQuery(db, 'CREATE TABLE x (a)'))).toBe(
      'readOnly',
    );
  });

  it('blocks ATTACH even when the text guard is bypassed', () => {
    // A string montada em tempo de execução não aparece como palavra-chave para o guard.
    expect(errorCode(() => db.exec("ATTACH ':memory:' AS other"))).toBe(
      'not-sql-error',
    );
    expect(errorCode(() => runQuery(db, "ATTACH ':memory:' AS other"))).toBe(
      'blocked',
    );
  });

  it('denies write pragmas at the SQLite level', () => {
    expect(errorCode(() => db.exec('PRAGMA query_only = OFF'))).toBe(
      'not-sql-error',
    );
    expect(runQuery(db, 'PRAGMA table_info(analysts)').rows.length).toBe(5);
  });

  it('caps huge values', () => {
    expect(errorCode(() => runQuery(db, 'SELECT zeroblob(100000000)'))).toBe(
      'tooBig',
    );
  });

  it('translates common mistakes into error codes', () => {
    expect(errorCode(() => runQuery(db, 'SELEC * FROM analysts'))).toBe(
      'syntax',
    );
    expect(errorCode(() => runQuery(db, 'SELECT * FROM employees'))).toBe(
      'noTable',
    );
    expect(errorCode(() => runQuery(db, 'SELECT badge FROM analysts'))).toBe(
      'noColumn',
    );
    expect(
      errorCode(() =>
        runQuery(
          db,
          'SELECT id FROM analysts JOIN contracts ON analysts.id = contracts.analyst_id',
        ),
      ),
    ).toBe('ambiguous');
  });
});

describe('readSchema', () => {
  it('lists tables with typed columns and primary keys', () => {
    const schema = readSchema(db);
    expect(schema.map((table) => table.name)).toEqual([
      'analysts',
      'contracts',
    ]);
    expect(schema[0].columns[0]).toEqual({
      name: 'id',
      type: 'INTEGER',
      primaryKey: true,
    });
  });
});

describe('readSchema foreign keys', () => {
  it('lists REFERENCES between tables', () => {
    const contracts = readSchema(db).find(
      (table) => table.name === 'contracts',
    );
    expect(contracts?.foreignKeys).toEqual([
      { column: 'analyst_id', table: 'analysts', refColumn: 'id' },
    ]);
    expect(readSchema(db)[0].foreignKeys).toEqual([]);
  });
});

describe('splitStatements', () => {
  it('splits on semicolons outside literals', () => {
    expect(splitStatements("SELECT ';'; SELECT 2;;")).toEqual([
      "SELECT ';'",
      'SELECT 2',
    ]);
  });
});
