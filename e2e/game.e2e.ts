import { expect, test } from '@playwright/test';

import {
  acceptCase001,
  activeWindow,
  mailItem,
  openApp,
  runQuery,
  startGame,
  unlock,
} from './helpers';

test('progress survives a reload', async ({ page }) => {
  await startGame(page);
  await acceptCase001(page);
  // O autosave espera 800 ms sem mudanças antes de gravar.
  await page.waitForTimeout(1500);
  await page.reload();
  await unlock(page);
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

test('opens on the lock screen, which also locks the game again', async ({
  page,
}) => {
  await page.goto('/');
  const lock = page.getByRole('dialog', { name: 'Tela de bloqueio' });
  await expect(lock).toBeVisible();
  // Bloqueada, a área de trabalho não recebe atalhos: a tecla só levanta o escudo.
  await page.keyboard.press('Alt+F1');
  await expect(page.getByRole('button', { name: 'Desbloquear' })).toBeVisible();
  await expect(page.locator('.overview')).toHaveCount(0);

  // Opções e créditos sem entrar no sistema.
  await page.getByRole('button', { name: 'Opções' }).click();
  await page.getByText('English', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unlock' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Credits' }).click();
  await expect(page.getByRole('dialog', { name: 'Credits' })).toContainText(
    'Nathã Grazzioli Botelho',
  );
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(lock).toHaveCount(0);
  await expect(mailItem(page, 'Welcome to Nova Perícia')).toBeVisible();

  // Super+L do GNOME; Alt+Shift+L funciona onde o sistema captura o Super.
  await page.keyboard.press('Alt+Shift+L');
  await expect(page.getByRole('dialog', { name: 'Lock screen' })).toBeVisible();
});
