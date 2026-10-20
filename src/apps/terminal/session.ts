import { trainingDatabase } from '@/content/databases/training';
import type { MessageKey } from '@/core/i18n';
import type { DatabaseSource } from '@/core/sql/types';
import { createBrowserEngine } from '@/core/sql/worker-engine';
import { createTerminalStore } from '@/store/terminal-store';

export interface TerminalDatabaseEntry {
  source: DatabaseSource;
  labelKey: MessageKey;
}

/** Bancos disponíveis no seletor. Os de cada caso entram aqui quando o caso é aceito. */
export const terminalDatabases: TerminalDatabaseEntry[] = [
  { source: trainingDatabase, labelKey: 'terminal.db.training' },
];

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

export function ensureDatabasesOpen(): void {
  const { databases, openDatabase } = terminalStore.getState();
  for (const { source } of terminalDatabases) {
    const status = databases[source.id]?.status;
    if (status !== 'ready' && status !== 'loading') void openDatabase(source);
  }
}

/** Atalho de executar escrito como o sistema mostra (⌘ no Mac). */
export function runShortcutLabel(): string {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac ? '⌘ Enter' : 'Ctrl Enter';
}
