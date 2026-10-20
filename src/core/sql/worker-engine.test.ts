import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkerRequest, WorkerResponse } from './protocol';
import { SqlError } from './types';
import { createWorkerEngine, type WorkerLike } from './worker-engine';

function messageEvent(data: WorkerResponse): MessageEvent<WorkerResponse> {
  return { data } as unknown as MessageEvent<WorkerResponse>;
}

/** Worker de mentira: guarda os pedidos e responde quando o teste mandar. */
class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  requests: WorkerRequest[] = [];
  terminated = false;
  autoReply = true;

  postMessage(message: WorkerRequest): void {
    this.requests.push(message);
    if (this.autoReply && message.type !== 'exec') this.reply(message.id, []);
  }

  reply(id: number, value: Extract<WorkerResponse, { ok: true }>['value']) {
    queueMicrotask(() =>
      this.onmessage?.(messageEvent({ id, ok: true, value })),
    );
  }

  terminate(): void {
    this.terminated = true;
  }
}

const source = { id: 'training', sql: 'CREATE TABLE t (a)' };
let workers: FakeWorker[];
let engine: ReturnType<typeof createWorkerEngine>;

beforeEach(() => {
  vi.useFakeTimers();
  workers = [];
  engine = createWorkerEngine({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    queryTimeoutMs: 5000,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'resolved';
  } catch (error) {
    return error instanceof SqlError ? error.info.code : 'other';
  }
}

describe('worker engine', () => {
  it('starts the worker lazily and matches replies by id', async () => {
    expect(workers).toHaveLength(0);
    await engine.open(source);
    const query = engine.exec('training', 'SELECT 1');
    await vi.waitFor(() => expect(workers[0].requests).toHaveLength(2));
    const exec = workers[0].requests[1];
    workers[0].reply(exec.id, {
      columns: ['1'],
      rows: [[1]],
      truncated: false,
      elapsedMs: 1,
    });
    await expect(query).resolves.toMatchObject({ rows: [[1]] });
  });

  it('kills the worker after the timeout and reopens databases on the next query', async () => {
    await engine.open(source);
    const endless = engine.exec('training', 'WITH RECURSIVE ...');
    const outcome = rejection(endless);
    await vi.advanceTimersByTimeAsync(5000);

    expect(await outcome).toBe('timeout');
    expect(workers[0].terminated).toBe(true);

    const next = engine.exec('training', 'SELECT 2');
    await vi.waitFor(() =>
      expect(workers[1]?.requests.map((r) => r.type)).toEqual(['open', 'exec']),
    );
    expect(workers[1].requests[0]).toMatchObject({ type: 'open', source });
    workers[1].reply(workers[1].requests[1].id, {
      columns: [],
      rows: [],
      truncated: false,
      elapsedMs: 0,
    });
    await expect(next).resolves.toBeTruthy();
  });

  it('interrupts a running query on demand', async () => {
    await engine.open(source);
    const running = rejection(engine.exec('training', 'SELECT 1'));
    await vi.waitFor(() => expect(workers[0].requests).toHaveLength(2));
    engine.interrupt();
    expect(await running).toBe('interrupted');
    expect(workers[0].terminated).toBe(true);
  });

  it('forwards SQL errors from the worker', async () => {
    await engine.open(source);
    const query = engine.exec('training', 'SELEC');
    await vi.waitFor(() => expect(workers[0].requests).toHaveLength(2));
    const { id } = workers[0].requests[1];
    workers[0].onmessage?.(
      messageEvent({
        id,
        ok: false,
        error: {
          code: 'syntax',
          params: { token: 'SELEC' },
          raw: 'near "SELEC"',
        },
      }),
    );
    expect(await rejection(query)).toBe('syntax');
  });

  it('refuses databases that were never opened', async () => {
    expect(await rejection(engine.exec('ghost', 'SELECT 1'))).toBe('engine');
  });
});
