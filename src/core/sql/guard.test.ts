import { describe, expect, it } from 'vitest';

import { guardStatement, stripLiterals } from './guard';
import { SqlError } from './types';

function codeOf(sql: string): string | null {
  try {
    guardStatement(sql);
    return null;
  } catch (error) {
    return error instanceof SqlError ? error.info.code : 'thrown';
  }
}

describe('guardStatement', () => {
  it('lets plain reads through', () => {
    expect(
      codeOf('SELECT * FROM badge_events WHERE gate = "ALMOX_TI";'),
    ).toBeNull();
    expect(codeOf('WITH x AS (SELECT 1) SELECT * FROM x')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(codeOf('  ;  -- nada aqui')).toBe('empty');
  });

  it('blocks ATTACH, DETACH and VACUUM in any case', () => {
    expect(codeOf("attach ':memory:' as other")).toBe('blocked');
    expect(codeOf('SELECT 1; DeTaCh other')).toBe('blocked');
    expect(codeOf("VACUUM INTO '/tmp/copy.db'")).toBe('blocked');
  });

  it('ignores keywords inside strings, identifiers and comments', () => {
    expect(codeOf("SELECT 'attach' AS word")).toBeNull();
    expect(codeOf('SELECT "vacuum" FROM t')).toBeNull();
    expect(codeOf('SELECT 1 -- ATTACH later')).toBeNull();
    expect(codeOf('SELECT /* PRAGMA writable_schema */ 1')).toBeNull();
    expect(codeOf('SELECT attachments FROM mail')).toBeNull();
  });

  it('allows only read-only pragmas', () => {
    expect(codeOf('PRAGMA table_info(employees)')).toBeNull();
    expect(codeOf('PRAGMA main.index_list(assets)')).toBeNull();
    expect(codeOf('PRAGMA query_only = OFF')).toBe('blocked');
    expect(codeOf('pragma writable_schema=1')).toBe('blocked');
  });
});

describe('stripLiterals', () => {
  it('keeps the original length so indexes still line up', () => {
    const sql = 'SELECT \'a;b\', "c" -- x\nFROM t /* y */';
    expect(stripLiterals(sql)).toHaveLength(sql.length);
    expect(stripLiterals(sql)).not.toContain(';');
  });
});
