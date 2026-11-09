// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { readCaseFiles } from '../../../scripts/cases';

import { CaseError, buildCase } from './build';

const case001 = readCaseFiles(
  fileURLToPath(
    new URL('../../../cases/001-notebook-almoxarifado', import.meta.url),
  ),
);

function error(files: Record<string, string>) {
  try {
    buildCase(files);
    return null;
  } catch (caught) {
    return caught instanceof CaseError ? caught.message : 'other';
  }
}

describe('buildCase', () => {
  it('builds the official case from files in memory', () => {
    const { bundle, databases } = buildCase(case001);
    expect(bundle.manifest.id).toBe('001');
    expect(bundle.emails.length).toBeGreaterThan(0);
    expect(databases.main.sql).toContain('CREATE TABLE');
  });

  it('names the file and the problem when something is wrong', () => {
    expect(error({ ...case001, 'case.json': '{' })).toBe(
      'case.json: JSON inválido',
    );
    const noDb = { ...case001 };
    delete noDb['db/vantara_acessos.sql'];
    expect(error(noDb)).toMatch(/vantara_acessos\.sql não existe/);
    const brokenMail = Object.keys(case001).find((path) =>
      path.startsWith('emails/pt-BR/'),
    )!;
    expect(error({ ...case001, [brokenMail]: 'sem frontmatter' })).toMatch(
      /falta o frontmatter/,
    );
  });
});
