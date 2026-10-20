import { SqlError, type SqlErrorInfo } from './types';

/** Mensagem do SQLite sem o prefixo do wrapper ("SQLITE_ERROR: sqlite3 result code 1: "). */
export function cleanSqliteMessage(message: string): string {
  return message.replace(/^SQLITE_\w+:\s*sqlite3 result code \d+:\s*/, '');
}

const patterns: Array<
  [RegExp, (match: RegExpMatchArray) => Omit<SqlErrorInfo, 'raw'>]
> = [
  [
    /near "([^"]*)": syntax error/,
    (m) => ({ code: 'syntax', params: { token: m[1] } }),
  ],
  [/incomplete input/, () => ({ code: 'incomplete', params: {} })],
  [
    /no such table: (\S+)/,
    (m) => ({ code: 'noTable', params: { name: m[1] } }),
  ],
  [
    /no such column: (\S+)/,
    (m) => ({ code: 'noColumn', params: { name: m[1] } }),
  ],
  [
    /ambiguous column name: (\S+)/,
    (m) => ({ code: 'ambiguous', params: { name: m[1] } }),
  ],
  [/readonly database|query_only/i, () => ({ code: 'readOnly', params: {} })],
  [/not authorized/, () => ({ code: 'notAuthorized', params: {} })],
  [/too big/, () => ({ code: 'tooBig', params: {} })],
  [/interrupted/, () => ({ code: 'interrupted', params: {} })],
];

/** Converte qualquer erro vindo do SQLite em um SqlError com código traduzível. */
export function toSqlError(error: unknown): SqlError {
  if (error instanceof SqlError) return error;
  const raw = cleanSqliteMessage(
    error instanceof Error ? error.message : String(error),
  );
  for (const [pattern, build] of patterns) {
    const match = raw.match(pattern);
    if (match) return new SqlError({ ...build(match), raw });
  }
  return new SqlError({ code: 'unknown', params: {}, raw });
}
