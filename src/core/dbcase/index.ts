import { strToU8, unzipSync, zipSync } from 'fflate';

import type { CaseFiles } from '@/core/case-schema/build';

/**
 * Pacote `.dbcase`: um zip com a estrutura de um caso. Conteúdo de terceiros,
 * então nada entra sem passar pelos limites e pela lista de caminhos aceitos.
 */
export const DBCASE_LIMITS = {
  /** Arquivo .dbcase inteiro, compactado. */
  packed: 25 * 1024 * 1024,
  /** Soma de tudo depois de descompactar. */
  unpacked: 100 * 1024 * 1024,
  /** JSON e Markdown, cada um. */
  text: 10 * 1024 * 1024,
  /** Cada banco .sql. */
  sql: 50 * 1024 * 1024,
  files: 500,
};

export type DbcaseErrorCode =
  | 'tooLarge'
  | 'notZip'
  | 'badPath'
  | 'unexpectedFile'
  | 'notText'
  | 'tooManyFiles'
  | 'noCase';

export class DbcaseError extends Error {
  readonly code: DbcaseErrorCode;
  readonly detail: string;

  constructor(code: DbcaseErrorCode, detail = '') {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'DbcaseError';
    this.code = code;
    this.detail = detail;
  }
}

/** Caminhos aceitos dentro de um caso. SOLUTION.md e README.md vêm junto, mas o jogo ignora. */
const ALLOWED = [
  /^case\.json$/,
  /^resolution\.json$/,
  /^(SOLUTION|README)\.md$/,
  /^db\/[\w.-]+\.sql$/,
  /^(emails|sites)\/(pt-BR|en)\/[\w.-]+\.md$/,
];
const IGNORED = /^(SOLUTION|README)\.md$/;

/** Barra caminhos absolutos, com "..", barra invertida ou drive do Windows (zip-slip). */
function safePath(name: string): boolean {
  return (
    !name.startsWith('/') &&
    !name.includes('\\') &&
    !/^[a-z]:/i.test(name) &&
    !name.split('/').some((part) => part === '..' || part === '.')
  );
}

/**
 * Abre um .dbcase e devolve os arquivos do caso como texto.
 * Aceita o caso na raiz do zip ou dentro de uma única pasta.
 */
export function unpackDbcase(data: Uint8Array): CaseFiles {
  if (data.byteLength > DBCASE_LIMITS.packed)
    throw new DbcaseError('tooLarge', 'packed');

  let entries: Record<string, Uint8Array>;
  let declared = 0;
  let count = 0;
  try {
    entries = unzipSync(data, {
      // O filtro roda antes de descompactar: barra bombas de zip pelo tamanho declarado.
      filter: (file) => {
        if (file.name.endsWith('/')) return false;
        count += 1;
        declared += file.originalSize;
        if (count > DBCASE_LIMITS.files) throw new DbcaseError('tooManyFiles');
        if (declared > DBCASE_LIMITS.unpacked)
          throw new DbcaseError('tooLarge', 'unpacked');
        return true;
      },
    });
  } catch (error) {
    if (error instanceof DbcaseError) throw error;
    throw new DbcaseError('notZip');
  }

  const names = Object.keys(entries);
  for (const name of names) {
    if (!safePath(name)) throw new DbcaseError('badPath', name);
  }

  // Caso dentro de uma pasta única ("001-caso/case.json"): tira o prefixo.
  let prefix = '';
  if (!names.includes('case.json')) {
    const tops = new Set(names.map((name) => name.split('/')[0]));
    const [top] = tops;
    if (tops.size !== 1 || !names.includes(`${top}/case.json`))
      throw new DbcaseError('noCase');
    prefix = `${top}/`;
  }

  const decoder = new TextDecoder('utf-8', { fatal: true });
  const files: CaseFiles = {};
  let total = 0;
  for (const name of names) {
    const path = name.slice(prefix.length);
    if (!ALLOWED.some((pattern) => pattern.test(path)))
      throw new DbcaseError('unexpectedFile', path);
    if (IGNORED.test(path)) continue;
    const bytes = entries[name];
    total += bytes.byteLength;
    const limit = path.endsWith('.sql')
      ? DBCASE_LIMITS.sql
      : DBCASE_LIMITS.text;
    // O tamanho declarado no zip pode mentir; o real é conferido aqui.
    if (bytes.byteLength > limit || total > DBCASE_LIMITS.unpacked)
      throw new DbcaseError('tooLarge', path);
    try {
      files[path] = decoder.decode(bytes);
    } catch {
      throw new DbcaseError('notText', path);
    }
  }
  return files;
}

/** Empacota os arquivos de um caso num .dbcase (usado pelo script case:pack). */
export function packDbcase(files: CaseFiles): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, text]) => [path, strToU8(text)]),
    ),
    { level: 9 },
  );
}
