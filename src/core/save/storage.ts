/**
 * Onde o autosave mora. A interface é mínima para os testes poderem trocar o
 * IndexedDB por memória.
 */
export interface SaveStorage {
  read(): Promise<unknown | null>;
  write(data: unknown): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'cold-query';
const STORE = 'saves';
const KEY = 'autosave';

/** Transforma um IDBRequest (baseado em eventos) numa Promise. */
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, 1);
    // Primeira abertura (ou versão nova do banco): cria o depósito de saves.
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
}

/**
 * Autosave no IndexedDB. Se o navegador não deixar (aba privada, armazenamento
 * bloqueado), as operações rejeitam e quem chama decide o que fazer.
 */
export function createIdbStorage(
  factory: IDBFactory | null = globalThis.indexedDB ?? null,
): SaveStorage {
  let connection: Promise<IDBDatabase> | null = null;
  const db = () => {
    if (!factory) return Promise.reject(new Error('IndexedDB indisponível'));
    connection ??= openDatabase(factory).catch((error) => {
      connection = null; // permite tentar de novo depois
      throw error;
    });
    return connection;
  };

  async function run<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const store = (await db()).transaction(STORE, mode).objectStore(STORE);
    return request(action(store));
  }

  return {
    read: async () => (await run('readonly', (s) => s.get(KEY))) ?? null,
    write: async (data) => {
      await run('readwrite', (s) => s.put(data, KEY));
    },
    clear: async () => {
      await run('readwrite', (s) => s.delete(KEY));
    },
  };
}

/** Armazenamento em memória: testes e navegadores sem IndexedDB. */
export function createMemoryStorage(initial: unknown = null): SaveStorage {
  let value = initial;
  return {
    read: async () => value,
    write: async (data) => {
      value = structuredClone(data);
    },
    clear: async () => {
      value = null;
    },
  };
}
