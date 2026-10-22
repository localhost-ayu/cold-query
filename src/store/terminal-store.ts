import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import {
  SqlError,
  type DatabaseSource,
  type QueryResult,
  type SchemaTable,
  type SqlEngine,
  type SqlErrorInfo,
} from '@/core/sql/types';

export interface QueryTab {
  id: string;
  /** Número mostrado no título ("Consulta 3"); não se repete na sessão. */
  number: number;
  sql: string;
  dbId: string;
  status: 'idle' | 'running' | 'done' | 'error';
  result: QueryResult | null;
  error: SqlErrorInfo | null;
}

export interface HistoryEntry {
  id: string;
  sql: string;
  dbId: string;
  ok: boolean;
  ranAt: number;
}

export interface TerminalDatabase {
  id: string;
  status: 'loading' | 'ready' | 'error';
  schema: SchemaTable[];
  error: SqlErrorInfo | null;
}

/** O que vai para o save: o texto das abas e o histórico. Resultados não (rodam de novo). */
export interface TerminalSnapshot {
  tabs: Array<Pick<QueryTab, 'id' | 'number' | 'sql' | 'dbId'>>;
  activeTabId: string;
  history: HistoryEntry[];
  nextNumber: number;
}

interface TerminalState {
  tabs: QueryTab[];
  activeTabId: string;
  history: HistoryEntry[];
  databases: Record<string, TerminalDatabase>;
  nextNumber: number;
  /** Carrega o SQL (pode vir de um import sob demanda) e abre o banco no motor. */
  openDatabase: (id: string, load: () => Promise<string>) => Promise<void>;
  addTab: () => void;
  closeTab: (id: string) => void;
  selectTab: (id: string) => void;
  setSql: (id: string, sql: string) => void;
  setDatabase: (id: string, dbId: string) => void;
  run: (id: string) => Promise<void>;
  stop: () => void;
  hydrate: (snapshot: TerminalSnapshot) => void;
  reset: () => void;
}

export const HISTORY_LIMIT = 50;

/** O motor precisa saber interromper para o botão "Interromper" existir. */
export type InterruptibleEngine = SqlEngine & { interrupt(): void };

function errorInfo(error: unknown): SqlErrorInfo {
  return error instanceof SqlError
    ? error.info
    : {
        code: 'unknown',
        params: {},
        raw: error instanceof Error ? error.message : String(error),
      };
}

function blankTab(number: number, dbId: string, sql = ''): QueryTab {
  return {
    id: `tab-${number}`,
    number,
    sql,
    dbId,
    status: 'idle',
    result: null,
    error: null,
  };
}

export function createTerminalStore(
  engine: InterruptibleEngine,
  defaultDbId: string,
  starterSql = '',
) {
  return createStore<TerminalState>((set, get) => {
    const patchTab = (id: string, patch: Partial<QueryTab>) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id ? { ...tab, ...patch } : tab,
        ),
      }));

    return {
      tabs: [blankTab(1, defaultDbId, starterSql)],
      activeTabId: 'tab-1',
      history: [],
      databases: {},
      nextNumber: 2,

      openDatabase: async (id, load) => {
        const status = get().databases[id]?.status;
        if (status === 'loading' || status === 'ready') return;
        set((state) => ({
          databases: {
            ...state.databases,
            [id]: {
              id,
              status: 'loading',
              schema: [],
              error: null,
            },
          },
        }));
        try {
          const source: DatabaseSource = { id, sql: await load() };
          const schema = await engine.open(source);
          set((state) => ({
            databases: {
              ...state.databases,
              [id]: {
                id,
                status: 'ready',
                schema,
                error: null,
              },
            },
          }));
        } catch (error) {
          set((state) => ({
            databases: {
              ...state.databases,
              [id]: {
                id,
                status: 'error',
                schema: [],
                error: errorInfo(error),
              },
            },
          }));
        }
      },

      addTab: () =>
        set((state) => {
          const current = state.tabs.find(
            (tab) => tab.id === state.activeTabId,
          );
          const tab = blankTab(state.nextNumber, current?.dbId ?? defaultDbId);
          return {
            tabs: [...state.tabs, tab],
            activeTabId: tab.id,
            nextNumber: state.nextNumber + 1,
          };
        }),

      closeTab: (id) =>
        set((state) => {
          if (state.tabs.length === 1) return state;
          const index = state.tabs.findIndex((tab) => tab.id === id);
          const tabs = state.tabs.filter((tab) => tab.id !== id);
          // Fechar a aba ativa passa o foco para a vizinha, como num navegador.
          const activeTabId =
            state.activeTabId === id
              ? tabs[Math.min(index, tabs.length - 1)].id
              : state.activeTabId;
          return { tabs, activeTabId };
        }),

      selectTab: (id) => set({ activeTabId: id }),
      setSql: (id, sql) => patchTab(id, { sql }),
      setDatabase: (id, dbId) =>
        patchTab(id, { dbId, result: null, error: null, status: 'idle' }),

      run: async (id) => {
        const tab = get().tabs.find((item) => item.id === id);
        if (!tab || tab.status === 'running') return;
        const sql = tab.sql;
        patchTab(id, { status: 'running' });
        let ok = false;
        try {
          const result = await engine.exec(tab.dbId, sql);
          patchTab(id, { status: 'done', result, error: null });
          ok = true;
        } catch (error) {
          patchTab(id, { status: 'error', error: errorInfo(error) });
        }
        const trimmed = sql.trim();
        if (!trimmed) return;
        set((state) => {
          // Repetir a mesma consulta seguida não enche o histórico.
          const rest =
            state.history[0]?.sql === trimmed
              ? state.history.slice(1)
              : state.history;
          const entry: HistoryEntry = {
            id: `h-${Date.now()}-${rest.length}`,
            sql: trimmed,
            dbId: tab.dbId,
            ok,
            ranAt: Date.now(),
          };
          return { history: [entry, ...rest].slice(0, HISTORY_LIMIT) };
        });
      },

      stop: () => engine.interrupt(),

      hydrate: (snapshot) => {
        if (snapshot.tabs.length === 0) return;
        const tabs = snapshot.tabs.map((tab) => ({
          ...blankTab(tab.number, tab.dbId, tab.sql),
          id: tab.id,
        }));
        set({
          tabs,
          activeTabId: tabs.some((tab) => tab.id === snapshot.activeTabId)
            ? snapshot.activeTabId
            : tabs[0].id,
          history: snapshot.history.slice(0, HISTORY_LIMIT),
          nextNumber: Math.max(
            snapshot.nextNumber,
            ...tabs.map((tab) => tab.number + 1),
          ),
        });
      },

      reset: () =>
        set({
          tabs: [blankTab(1, defaultDbId, starterSql)],
          activeTabId: 'tab-1',
          history: [],
          nextNumber: 2,
        }),
    };
  });
}

export type TerminalStore = ReturnType<typeof createTerminalStore>;

export function useTerminal<T>(
  store: TerminalStore,
  selector: (state: TerminalState) => T,
): T {
  return useStore(store, selector);
}
