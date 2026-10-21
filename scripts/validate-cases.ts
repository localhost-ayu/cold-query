/**
 * Valida todos os casos de cases/: schema, referências, verifyQuery, opções e
 * hashes. Uso: bun run validate-cases
 */
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { fileURLToPath } from 'node:url';

import { loadCasesFromDisk } from './cases';
import { validateCase } from './validate';

const root = fileURLToPath(new URL('..', import.meta.url));
// Os avisos do SQLite sobre comandos recusados só poluiriam a saída.
(globalThis as { sqlite3ApiConfig?: object }).sqlite3ApiConfig = {
  warn: () => {},
};
const sqlite3 = await sqlite3InitModule();

let failed = false;
for (const diskCase of loadCasesFromDisk(root)) {
  const report = await validateCase(diskCase, sqlite3);
  const title = `${report.caseId} ${diskCase.bundle.manifest.title['pt-BR']}`;
  if (report.errors.length === 0) {
    console.log(`✓ ${title}`);
  } else {
    failed = true;
    console.error(`✗ ${title}`);
    for (const error of report.errors) console.error(`  - ${error}`);
  }
}
process.exit(failed ? 1 : 0);
