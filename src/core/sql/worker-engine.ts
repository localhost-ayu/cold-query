import type { WorkerRequest, WorkerResponse } from './protocol';
import {
  QUERY_TIMEOUT_MS,
  SqlError,
  type DatabaseSource,
  type QueryResult,
  type SchemaTable,
  type SqlEngine,
  type SqlErrorCode,
} from './types';

/** O mínimo de Worker que o motor usa; nos testes entra um falso. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface WorkerEngineOptions {
  createWorker: () => WorkerLike;
  queryTimeoutMs?: number;
  /** Abrir inclui baixar o WASM e rodar o script do caso, então ganha mais folga. */
  openTimeoutMs?: number;
}

export interface WorkerSqlEngine extends SqlEngine {
  /** Mata o worker e cancela o que estiver rodando. O próximo pedido recria tudo. */
  interrupt(): void;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: SqlError) => void;
  timer: ReturnType<typeof setTimeout>;
}

type RequestBody = WorkerRequest extends infer R
  ? R extends { id: number }
    ? Omit<R, 'id'>
    : never
  : never;

export function createWorkerEngine({
  createWorker,
  queryTimeoutMs = QUERY_TIMEOUT_MS,
  openTimeoutMs = 20_000,
}: WorkerEngineOptions): WorkerSqlEngine {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  // Fontes abertas pelo jogador e quais delas existem no worker atual.
  const sources = new Map<string, DatabaseSource>();
  const loaded = new Set<string>();

  function fail(code: SqlErrorCode, raw = ''): SqlError {
    return new SqlError({ code, params: {}, raw });
  }

  function kill(code: SqlErrorCode): void {
    worker?.terminate();
    worker = null;
    loaded.clear();
    for (const [id, request] of pending) {
      clearTimeout(request.timer);
      request.reject(fail(code));
      pending.delete(id);
    }
  }

  function ensureWorker(): WorkerLike {
    if (worker) return worker;
    const created = createWorker();
    created.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(data.id);
      if (data.ok) request.resolve(data.value);
      else request.reject(new SqlError(data.error));
    };
    created.onerror = (event) => {
      event.preventDefault?.();
      kill('engine');
    };
    worker = created;
    return created;
  }

  function send<T>(
    body: RequestBody,
    timeoutMs: number,
    onTimeout: SqlErrorCode,
  ): Promise<T> {
    const target = ensureWorker();
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Primeiro rejeita este pedido com o motivo certo; os demais caem como interrompidos.
        pending.delete(id);
        reject(fail(onTimeout));
        kill('interrupted');
      }, timeoutMs);
      pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });
      target.postMessage({ ...body, id } as WorkerRequest);
    });
  }

  async function ensureLoaded(dbId: string): Promise<void> {
    if (loaded.has(dbId)) return;
    const source = sources.get(dbId);
    if (!source) throw fail('engine', `database "${dbId}" was never opened`);
    await send<SchemaTable[]>(
      { type: 'open', source },
      openTimeoutMs,
      'engine',
    );
    loaded.add(dbId);
  }

  return {
    async open(source) {
      sources.set(source.id, source);
      loaded.delete(source.id);
      const schema = await send<SchemaTable[]>(
        { type: 'open', source },
        openTimeoutMs,
        'engine',
      );
      loaded.add(source.id);
      return schema;
    },
    async exec(dbId, sql) {
      await ensureLoaded(dbId);
      return send<QueryResult>(
        { type: 'exec', dbId, sql },
        queryTimeoutMs,
        'timeout',
      );
    },
    async schema(dbId) {
      await ensureLoaded(dbId);
      return send<SchemaTable[]>(
        { type: 'schema', dbId },
        queryTimeoutMs,
        'timeout',
      );
    },
    async close(dbId) {
      sources.delete(dbId);
      if (!loaded.delete(dbId) || !worker) return;
      await send<null>({ type: 'close', dbId }, queryTimeoutMs, 'timeout');
    },
    interrupt() {
      kill('interrupted');
    },
  };
}

/** Motor real do navegador. O bundler resolve o `new URL(..., import.meta.url)`. */
export function createBrowserEngine(): WorkerSqlEngine {
  return createWorkerEngine({
    createWorker: () =>
      new Worker(new URL('./sql.worker.ts', import.meta.url), {
        type: 'module',
      }) as unknown as WorkerLike,
  });
}
