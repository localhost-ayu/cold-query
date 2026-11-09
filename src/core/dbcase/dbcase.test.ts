// @vitest-environment node
import { strToU8, zipSync } from 'fflate';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { readCaseFiles } from '../../../scripts/cases';
import { buildCase } from '../case-schema/build';

import { DbcaseError, packDbcase, unpackDbcase } from '.';

const case001 = readCaseFiles(
  fileURLToPath(
    new URL('../../../cases/001-notebook-almoxarifado', import.meta.url),
  ),
);

function code(run: () => unknown) {
  try {
    run();
    return 'ok';
  } catch (error) {
    return error instanceof DbcaseError ? error.code : 'other';
  }
}

const zip = (files: Record<string, string>) =>
  zipSync(
    Object.fromEntries(Object.entries(files).map(([p, t]) => [p, strToU8(t)])),
  );

describe('.dbcase', () => {
  it('round-trips the official case and still builds', () => {
    const files = unpackDbcase(packDbcase(case001));
    expect(files['case.json']).toBe(case001['case.json']);
    expect(files['SOLUTION.md']).toBeUndefined();
    expect(buildCase(files).bundle.manifest.id).toBe('001');
  });

  it('accepts the case inside a single top folder', () => {
    const nested = Object.fromEntries(
      Object.entries(case001).map(([path, text]) => [`meu-caso/${path}`, text]),
    );
    expect(Object.keys(unpackDbcase(zip(nested)))).toContain('case.json');
  });

  it('rejects path tricks, stray files and garbage', () => {
    expect(
      code(() => unpackDbcase(zip({ 'case.json': '{}', '../evil.sql': 'x' }))),
    ).toBe('badPath');
    expect(
      code(() => unpackDbcase(zip({ 'case.json': '{}', 'db/run.js': 'x' }))),
    ).toBe('unexpectedFile');
    expect(code(() => unpackDbcase(zip({ 'notes.txt': 'x' })))).toBe('noCase');
    expect(code(() => unpackDbcase(strToU8('isso não é um zip')))).toBe(
      'notZip',
    );
  });

  it('refuses binary content and oversized files', () => {
    const binary = zipSync({
      'case.json': strToU8('{}'),
      'db/x.sql': new Uint8Array([0xff, 0xfe, 0xfd]),
    });
    expect(code(() => unpackDbcase(binary))).toBe('notText');
    const big = zip({ 'case.json': 'x'.repeat(11 * 1024 * 1024) });
    expect(code(() => unpackDbcase(big))).toBe('tooLarge');
  });
});
