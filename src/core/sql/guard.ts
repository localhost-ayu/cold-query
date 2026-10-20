import { SqlError } from './types';

/**
 * Primeira barreira, antes de o SQL chegar ao worker. A barreira real fica no
 * SQLite (query_only + authorizer); esta só devolve uma mensagem clara e cedo.
 */
const BLOCKED_KEYWORDS = ['ATTACH', 'DETACH', 'VACUUM'];

/** Pragmas de leitura que ajudam a explorar o schema. Todo o resto é negado. */
export const READ_ONLY_PRAGMAS = new Set([
  'table_info',
  'table_xinfo',
  'table_list',
  'index_list',
  'index_info',
  'index_xinfo',
  'foreign_key_list',
]);

/** Troca strings, identificadores entre aspas e comentários por espaços. */
export function stripLiterals(sql: string): string {
  // Cada alternativa casa um trecho que não deve ser lido como palavra-chave:
  // '...' (com '' escapado), "...", `...`, [...], -- até o fim da linha, /* ... */
  return sql.replace(
    /'(?:[^']|'')*'?|"(?:[^"]|"")*"?|`[^`]*`?|\[[^\]]*\]?|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g,
    (match) => ' '.repeat(match.length),
  );
}

export function guardStatement(sql: string): void {
  const code = stripLiterals(sql);

  if (!code.replace(/;/g, '').trim()) {
    throw new SqlError({ code: 'empty', params: {}, raw: '' });
  }

  for (const keyword of BLOCKED_KEYWORDS) {
    // \b garante palavra inteira: "attachments" não é "ATTACH".
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(code)) {
      throw new SqlError({ code: 'blocked', params: { keyword }, raw: '' });
    }
  }

  // PRAGMA nome = valor  ou  PRAGMA nome(valor): só os de leitura passam.
  for (const match of code.matchAll(/\bPRAGMA\s+(?:\w+\.)?(\w+)/gi)) {
    if (!READ_ONLY_PRAGMAS.has(match[1].toLowerCase())) {
      throw new SqlError({
        code: 'blocked',
        params: { keyword: `PRAGMA ${match[1]}` },
        raw: '',
      });
    }
  }
}
