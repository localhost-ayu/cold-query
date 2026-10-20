/// <reference lib="webworker" />
import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';

import { createDatabase, readSchema, runQuery } from './database';
import { toSqlError } from './errors';
import type { WorkerRequest, WorkerResponse } from './protocol';
import { SqlError, type QueryResult, type SchemaTable } from './types';

// Erros já voltam traduzidos para a página; os avisos do SQLite só poluiriam o console.
(globalThis as { sqlite3ApiConfig?: object }).sqlite3ApiConfig = {
  warn: () => {},
  debug: () => {},
};

/**
 * O SQLite vem de public/sqlite/ (ver scripts/copy-sqlite.mjs), importado em
 * tempo de execução e fora do bundler. Carrega uma vez por worker; se o worker
 * morrer por timeout, o próximo recomeça daqui.
 */
async function loadSqlite(): Promise<Sqlite3Static> {
  const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/sqlite/index.mjs`;
  const sqliteModule = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ url
  )) as {
    default: () => Promise<Sqlite3Static>;
  };
  return sqliteModule.default();
}

const ready = loadSqlite();
const databases = new Map<string, Database>();

function database(dbId: string): Database {
  const db = databases.get(dbId);
  if (!db) {
    throw new SqlError({
      code: 'engine',
      params: {},
      raw: `database "${dbId}" is not open`,
    });
  }
  return db;
}

async function handle(
  request: WorkerRequest,
): Promise<QueryResult | SchemaTable[] | null> {
  const sqlite3 = await ready;
  switch (request.type) {
    case 'open': {
      databases.get(request.source.id)?.close();
      const db = createDatabase(sqlite3, request.source.sql);
      databases.set(request.source.id, db);
      return readSchema(db);
    }
    case 'exec':
      return runQuery(database(request.dbId), request.sql);
    case 'schema':
      return readSchema(database(request.dbId));
    case 'close':
      databases.get(request.dbId)?.close();
      databases.delete(request.dbId);
      return null;
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id } = event.data;
  try {
    const value = await handle(event.data);
    self.postMessage({ id, ok: true, value } satisfies WorkerResponse);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: toSqlError(error).info,
    } satisfies WorkerResponse);
  }
};
