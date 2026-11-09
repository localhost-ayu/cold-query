/**
 * Lê os casos de cases/ do disco e monta cada um com `buildCase` (o mesmo
 * montador que o jogo usa para casos importados). O plugin do Vite usa para o
 * módulo `virtual:cases`; validate-cases e os testes, para conferir o conteúdo.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  CaseError,
  buildCase,
  type BuiltCase,
  type CaseFiles,
} from '../src/core/case-schema/build';

export { CaseError };

export interface DiskCase extends BuiltCase {
  dir: string;
  /** Caminho absoluto de cada banco no disco, por id (o build importa com ?raw). */
  databasePaths: Record<string, string>;
}

/** Todos os arquivos de uma pasta, com caminho relativo e barras normais. */
export function readCaseFiles(dir: string): CaseFiles {
  const files: CaseFiles = {};
  const walk = (folder: string) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = join(folder, entry.name);
      if (entry.isDirectory()) walk(full);
      else
        files[relative(dir, full).split(sep).join('/')] = readFileSync(
          full,
          'utf8',
        );
    }
  };
  walk(dir);
  return files;
}

export function loadCaseFromDir(dir: string, root: string): DiskCase {
  try {
    const built = buildCase(readCaseFiles(dir));
    const databasePaths = Object.fromEntries(
      Object.entries(built.databases).map(([id, { file }]) => [
        id,
        join(dir, file),
      ]),
    );
    return { ...built, dir, databasePaths };
  } catch (error) {
    if (error instanceof CaseError)
      throw new CaseError(`${relative(root, dir) || dir}: ${error.message}`);
    throw error;
  }
}

export function loadCasesFromDisk(root: string): DiskCase[] {
  const casesDir = join(root, 'cases');
  const cases = readdirSync(casesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(casesDir, entry.name))
    .sort()
    .map((dir) => loadCaseFromDir(dir, root));

  const ids = cases.map((item) => item.bundle.manifest.id);
  if (new Set(ids).size !== ids.length)
    throw new CaseError('ids de caso repetidos');
  return cases;
}
