import { expect, test } from '@playwright/test';

import {
  acceptCase001,
  activeWindow,
  mailItem,
  openApp,
  runQuery,
  startGame,
} from './helpers';

test('progress survives a reload', async ({ page }) => {
  await startGame(page);
  await acceptCase001(page);
  // O autosave espera 800 ms sem mudanças antes de gravar.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(mailItem(page, 'Contrato 112')).toBeVisible();
  await mailItem(page, 'Contrato 112').click();
  await expect(page.getByText('Contrato aceito')).toBeVisible();
});

test('the terminal is read-only and explains SQL errors', async ({ page }) => {
  await startGame(page);
  await acceptCase001(page);
  await openApp(page, 'Terminal SQL');
  const terminal = activeWindow(page);

  const error = terminal.locator('[role="alert"]');

  await runQuery(page, "DELETE FROM assets WHERE asset_tag = 'NB-0417'");
  await expect(error).toBeVisible();

  // A linha continua lá, e uma consulta que dá certo limpa o erro.
  await runQuery(page, "SELECT status FROM assets WHERE asset_tag = 'NB-0417'");
  await expect(terminal.getByText('DISPONIVEL')).toBeVisible();
  await expect(error).toHaveCount(0);

  await runQuery(page, "ATTACH DATABASE 'x.db' AS x");
  await expect(error).toBeVisible();
});

test('switches to English', async ({ page }) => {
  await startGame(page);
  await openApp(page, 'Ajustes');
  const english = activeWindow(page).getByRole('radio', { name: 'English' });
  // O rádio fica escondido sob o rótulo do botão segmentado; clica no rótulo.
  await activeWindow(page).getByText('English', { exact: true }).click();
  await expect(english).toBeChecked();
  await expect(mailItem(page, 'Welcome to Nova Perícia')).toBeVisible();
});
