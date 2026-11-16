import { expect, test } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readCaseFiles } from '../scripts/cases';
import { packDbcase } from '../src/core/dbcase';
import { answerHash } from '../src/core/resolution';

import { activeWindow, mailItem, openApp, startGame } from './helpers';

/** Um mod de teste: o caso 001 com outro id, título e hashes refeitos. */
async function buildMod(id: string): Promise<string> {
  const files = readCaseFiles(
    join(import.meta.dirname, '../cases/001-notebook-almoxarifado'),
  );
  const manifest = JSON.parse(files['case.json']);
  manifest.id = id;
  manifest.order = Number(id);
  manifest.title = { 'pt-BR': 'Caso da comunidade', en: 'Community case' };
  const resolution = JSON.parse(files['resolution.json']);
  resolution.answerHashes = {
    who: await answerHash(id, 'who', 'w1'),
    when: await answerHash(id, 'when', 't2'),
  };
  files['case.json'] = JSON.stringify(manifest);
  files['resolution.json'] = JSON.stringify(resolution);
  const file = join(mkdtempSync(join(tmpdir(), 'cold-query-')), `${id}.dbcase`);
  writeFileSync(file, packDbcase(files));
  return file;
}

test('installs a community case, keeps it after a reload and removes it', async ({
  page,
}) => {
  const mod = await buildMod('901');
  await startGame(page);
  await openApp(page, 'Ajustes');
  const settings = activeWindow(page);

  await settings.locator('input[accept*=".dbcase"]').setInputFiles(mod);
  await expect(
    settings.getByText('“Caso da comunidade” instalado.'),
  ).toBeVisible({
    timeout: 20_000,
  });

  await page.waitForTimeout(1500);
  await page.reload();
  await openApp(page, 'Ajustes');
  const remove = activeWindow(page).getByRole('button', {
    name: 'Remover o caso 901',
  });
  await expect(remove).toBeVisible();
  await remove.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remover' })
    .click();
  await expect(remove).toHaveCount(0);
});

test('refuses a package with a file that is not part of a case', async ({
  page,
}) => {
  const { zipSync, strToU8 } = await import('fflate');
  const file = join(mkdtempSync(join(tmpdir(), 'cold-query-')), 'bad.dbcase');
  writeFileSync(
    file,
    zipSync({ 'case.json': strToU8('{}'), 'run.js': strToU8('alert(1)') }),
  );
  await startGame(page);
  await openApp(page, 'Ajustes');
  await activeWindow(page)
    .locator('input[accept*=".dbcase"]')
    .setInputFiles(file);
  await expect(activeWindow(page).getByRole('alert')).toContainText('run.js');
  await expect(mailItem(page, 'Caso da comunidade')).toHaveCount(0);
});
