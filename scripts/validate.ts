/**
 * Valida um caso lido do disco usando o SQLite do Node. A regra em si fica em
 * src/core/case-validate, a mesma que o jogo usa ao importar um .dbcase.
 */
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';

import {
  validateCase as validateBundle,
  type CaseReport,
} from '../src/core/case-validate';
import { createDatabase, runQuery } from '../src/core/sql/database';
import type { BuiltCase } from '../src/core/case-schema/build';

export type { CaseReport };

export async function validateCase(
  built: BuiltCase,
  sqlite3: Sqlite3Static,
): Promise<CaseReport> {
  const databases = Object.fromEntries(
    Object.entries(built.databases).map(([id, { sql }]) => [
      id,
      createDatabase(sqlite3, sql),
    ]),
  );
  try {
    return await validateBundle(built.bundle, (dbId, sql) =>
      runQuery(databases[dbId], sql, 1000),
    );
  } finally {
    for (const db of Object.values(databases)) db.close();
  }
}
