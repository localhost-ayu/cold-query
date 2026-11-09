import { createStore } from 'zustand/vanilla';

import type { CaseBundle } from '@/core/case-schema';
import type { CaseFiles } from '@/core/case-schema/build';
import { createIdbCollection, type Collection } from '@/core/save/storage';

import {
  gameStore,
  officialCaseIds,
  registerCase,
  unregisterCase,
} from './game';

/**
 * Casos importados (.dbcase). Ficam no IndexedDB como os arquivos originais e
 * são remontados a cada abertura, para passar sempre pelas regras atuais.
 */
export interface InstalledCase {
  id: string;
  installedAt: number;
  files: CaseFiles;
}

export interface ModInfo {
  id: string;
  installedAt: number;
  bundle: CaseBundle;
}

export type InstallResult =
  | { ok: true; bundle: CaseBundle; replaced: boolean }
  | {
      ok: false;
      reason:
        | 'tooLarge'
        | 'notZip'
        | 'badPath'
        | 'unexpectedFile'
        | 'notText'
        | 'tooManyFiles'
        | 'noCase'
        | 'invalid'
        | 'official'
        | 'unsolvable'
        | 'storage';
      detail: string;
    };

/** Ids 001–099 ficam para os casos oficiais, inclusive os que ainda vão sair. */
export const isReservedId = (id: string) =>
  officialCaseIds.has(id) || Number(id) < 100;

const collection: Collection<InstalledCase> =
  createIdbCollection<InstalledCase>();

/** Lista reativa para a tela de Ajustes. */
export const modsStore = createStore<{ mods: ModInfo[] }>(() => ({ mods: [] }));

function remember(info: ModInfo) {
  modsStore.setState((state) => ({
    mods: [...state.mods.filter((mod) => mod.id !== info.id), info].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
  }));
}

/** O montador traz yaml, marked e zod: só baixa quando há caso importado. */
const loadTools = () =>
  Promise.all([
    import('@/core/dbcase'),
    import('@/core/case-schema/build'),
    import('@/core/case-validate'),
  ]);

/**
 * Prova que o caso tem solução antes de instalar: cada consulta de referência
 * roda num SQLite à parte (um worker só para isso, encerrado no fim).
 */
async function checkSolvable(
  bundle: CaseBundle,
  databases: Record<string, { sql: string }>,
  validate: (typeof import('@/core/case-validate'))['validateCase'],
): Promise<string[]> {
  const { createBrowserEngine } = await import('@/core/sql/worker-engine');
  const engine = createBrowserEngine();
  const key = (dbId: string) => `mod-check:${dbId}`;
  try {
    for (const [dbId, { sql }] of Object.entries(databases))
      await engine.open({ id: key(dbId), sql });
    const report = await validate(bundle, (dbId, sql) =>
      engine.exec(key(dbId), sql),
    );
    return report.errors;
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  } finally {
    engine.interrupt();
  }
}

/** Instala um .dbcase. Se já houver um caso importado com o mesmo id, ele é trocado. */
export async function installDbcase(file: File): Promise<InstallResult> {
  const [dbcase, build, validation] = await loadTools();

  let files: CaseFiles;
  try {
    if (file.size > dbcase.DBCASE_LIMITS.packed)
      return { ok: false, reason: 'tooLarge', detail: file.name };
    files = dbcase.unpackDbcase(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof dbcase.DbcaseError)
      return { ok: false, reason: error.code, detail: error.detail };
    throw error;
  }

  let built;
  try {
    built = build.buildCase(files);
  } catch (error) {
    if (error instanceof build.CaseError)
      return { ok: false, reason: 'invalid', detail: error.message };
    throw error;
  }

  const { bundle, databases } = built;
  const id = bundle.manifest.id;
  if (isReservedId(id)) return { ok: false, reason: 'official', detail: id };

  const errors = await checkSolvable(
    bundle,
    databases,
    validation.validateCase,
  );
  if (errors.length > 0)
    return {
      ok: false,
      reason: 'unsolvable',
      detail: errors.slice(0, 3).join('\n'),
    };

  const replaced = modsStore.getState().mods.some((mod) => mod.id === id);
  const record: InstalledCase = { id, installedAt: Date.now(), files };
  try {
    await collection.put(id, record);
  } catch {
    return { ok: false, reason: 'storage', detail: '' };
  }
  registerCase(bundle, databases);
  remember({ id, installedAt: record.installedAt, bundle });
  return { ok: true, bundle, replaced };
}

export async function uninstallCase(id: string): Promise<void> {
  await collection.remove(id);
  unregisterCase(id);
  modsStore.setState((state) => ({
    mods: state.mods.filter((mod) => mod.id !== id),
  }));
}

/**
 * Remonta os casos importados guardados. Roda no boot, antes de restaurar o
 * save, para o progresso deles não ser descartado como "caso desconhecido".
 * Um caso que não monta mais (regra nova, arquivo corrompido) fica de fora.
 */
export async function loadInstalledCases(): Promise<void> {
  let records: InstalledCase[];
  try {
    records = await collection.list();
  } catch {
    return;
  }
  if (records.length === 0) return;
  const [, build] = await loadTools();
  for (const record of records) {
    if (isReservedId(record.id)) continue;
    try {
      const { bundle, databases } = build.buildCase(record.files);
      registerCase(bundle, databases);
      remember({ id: record.id, installedAt: record.installedAt, bundle });
    } catch {
      // Caso quebrado: continua guardado, mas não entra no jogo.
    }
  }
}

/**
 * Num jogo que acabou de começar (ou recomeçar), entrega os contratos dos
 * casos importados, que foram registrados antes do início.
 */
export function deliverImportedContracts(): void {
  const bundles = modsStore.getState().mods.map((mod) => mod.bundle);
  if (bundles.length > 0) gameStore.getState().addCases(bundles);
}
