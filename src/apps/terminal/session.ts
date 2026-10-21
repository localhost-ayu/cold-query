import { useMemo } from 'react';

import {
  caseById,
  caseDatabaseId,
  loadCaseDatabase,
  localized,
  useGameState,
} from '@/apps/shared/game';
import { trainingDatabase } from '@/content/databases/training';
import { translate, type Locale } from '@/core/i18n';
import { createBrowserEngine } from '@/core/sql/worker-engine';
import { createTerminalStore } from '@/store/terminal-store';

export interface TerminalDatabaseEntry {
  id: string;
  label: (locale: Locale) => string;
  /** Caso dono do banco; null na base de treino, que não vai para o dossiê. */
  caseId: string | null;
  load: () => Promise<string>;
}

const trainingEntry: TerminalDatabaseEntry = {
  id: trainingDatabase.id,
  label: (locale) => translate('terminal.db.training', locale),
  caseId: null,
  load: async () => trainingDatabase.sql,
};

/** Base de treino mais os bancos dos casos aceitos, na ordem dos casos. */
export function useTerminalDatabases(): TerminalDatabaseEntry[] {
  const cases = useGameState((state) => state.cases);
  return useMemo(() => {
    const accepted = Object.entries(cases)
      .filter(([, progress]) => progress.status !== 'available')
      .flatMap(([caseId]) => {
        const bundle = caseById.get(caseId);
        if (!bundle) return [];
        return bundle.manifest.databases.map(
          (database): TerminalDatabaseEntry => {
            const id = caseDatabaseId(caseId, database.id);
            return {
              id,
              label: (locale) => localized(database.label, locale),
              caseId,
              load: () => loadCaseDatabase(id),
            };
          },
        );
      });
    return [trainingEntry, ...accepted];
  }, [cases]);
}

const starterSql =
  'SELECT *\nFROM contracts\nORDER BY opened_on DESC\nLIMIT 10;';

/**
 * Uma sessão por aba do navegador: fechar e reabrir a janela do Terminal
 * mantém abas, histórico e o worker já aquecido.
 */
export const terminalStore = createTerminalStore(
  createBrowserEngine(),
  trainingDatabase.id,
  starterSql,
);

/**
 * Bancos para os quais o Terminal já pulou sozinho. Quando um caso é aceito, a
 * aba ativa vai para o banco dele uma vez; depois o jogador escolhe à vontade.
 */
const autoSelected = new Set<string>([trainingDatabase.id]);

export function nextDatabaseToSelect(
  entries: TerminalDatabaseEntry[],
): string | null {
  const fresh = entries.find((entry) => !autoSelected.has(entry.id));
  for (const entry of entries) autoSelected.add(entry.id);
  return fresh?.id ?? null;
}

export function ensureDatabasesOpen(entries: TerminalDatabaseEntry[]): void {
  for (const entry of entries) {
    void terminalStore.getState().openDatabase(entry.id, entry.load);
  }
}

/** Atalho de executar escrito como o sistema mostra (⌘ no Mac). */
export function runShortcutLabel(): string {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac ? '⌘ Enter' : 'Ctrl Enter';
}
