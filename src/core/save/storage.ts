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
/** Versão 2 criou o depósito dos casos importados; a atualização preserva os saves. */
const DB_VERSION = 2;
const STORE = 'saves';
const CASES_STORE = 'cases';
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
    const req = factory.open(DB_NAME, DB_VERSION);
    // Primeira abertura ou versão nova do banco: cria só os depósitos que faltam.
    req.onupgradeneeded = () => {
      for (const name of [STORE, CASES_STORE]) {
        if (!req.result.objectStoreNames.contains(name))
          req.result.createObjectStore(name);
      }
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
/** Conexão compartilhada com o banco do jogo e um atalho para rodar uma operação num depósito. */
function connect(factory: IDBFactory | null) {
  let connection: Promise<IDBDatabase> | null = null;
  const db = () => {
    if (!factory) return Promise.reject(new Error('IndexedDB indisponível'));
    connection ??= openDatabase(factory).catch((error) => {
      connection = null; // permite tentar de novo depois
      throw error;
    });
    return connection;
  };
  return async function run<T>(
    storeName: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const store = (await db())
      .transaction(storeName, mode)
      .objectStore(storeName);
    return request(action(store));
  };
}

export function createIdbStorage(
  factory: IDBFactory | null = globalThis.indexedDB ?? null,
): SaveStorage {
  const connection = connect(factory);
  const run = <T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ) => connection(STORE, mode, action);

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

/** Coleção chave → valor (os casos importados ficam numa assim). */
export interface Collection<T> {
  list(): Promise<T[]>;
  put(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createIdbCollection<T>(
  factory: IDBFactory | null = globalThis.indexedDB ?? null,
  storeName: string = CASES_STORE,
): Collection<T> {
  const run = connect(factory);
  return {
    list: () =>
      run(storeName, 'readonly', (s) => s.getAll() as IDBRequest<T[]>),
    put: async (key, value) => {
      await run(storeName, 'readwrite', (s) => s.put(value, key));
    },
    remove: async (key) => {
      await run(storeName, 'readwrite', (s) => s.delete(key));
    },
  };
}

export function createMemoryCollection<T>(): Collection<T> {
  const items = new Map<string, T>();
  return {
    list: async () => [...items.values()],
    put: async (key, value) => {
      items.set(key, structuredClone(value));
    },
    remove: async (key) => {
      items.delete(key);
    },
  };
}
