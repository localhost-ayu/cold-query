/**
 * Empacota uma pasta de caso num .dbcase, depois de validar tudo como o jogo
 * vai validar na importação. Uso:
 *   bun run case:pack <pasta-do-caso> [saida.dbcase]
 */
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { packDbcase, unpackDbcase } from '../src/core/dbcase';

import { CaseError, loadCaseFromDir, readCaseFiles } from './cases';
import { validateCase } from './validate';

const [dirArg, outArg] = process.argv.slice(2);
if (!dirArg) {
  console.error('uso: bun run case:pack <pasta-do-caso> [saida.dbcase]');
  process.exit(1);
}
const dir = resolve(dirArg);
const out = resolve(outArg ?? `${basename(dir)}.dbcase`);

(globalThis as { sqlite3ApiConfig?: object }).sqlite3ApiConfig = {
  warn: () => {},
};
const sqlite3 = await sqlite3InitModule();

try {
  const report = await validateCase(
    loadCaseFromDir(dir, process.cwd()),
    sqlite3,
  );
  if (report.errors.length > 0) {
    console.error(`✗ ${report.caseId}`);
    for (const error of report.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const packed = packDbcase(readCaseFiles(dir));
  // Abre o pacote de volta com as mesmas regras da importação no jogo.
  unpackDbcase(packed);
  writeFileSync(out, packed);
  console.log(
    `✓ ${report.caseId} → ${out} (${(packed.byteLength / 1024).toFixed(0)} KiB)`,
  );
} catch (error) {
  if (
    error instanceof CaseError ||
    (error instanceof Error && error.name === 'DbcaseError')
  ) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  throw error;
}
