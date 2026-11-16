import { expect, test } from '@playwright/test';

import {
  acceptCase001,
  activeWindow,
  mailItem,
  openApp,
  runQuery,
  replyButton,
  startGame,
} from './helpers';

test('solves case 001 from the contract to the accepted report', async ({
  page,
}) => {
  await startGame(page);
  await acceptCase001(page);

  await openApp(page, 'Terminal SQL');
  const terminal = activeWindow(page);
  // O banco do caso abre sozinho ao aceitar; espera a tabela aparecer no schema.
  await expect(terminal.getByText('badge_events').first()).toBeVisible();

  await runQuery(
    page,
    "SELECT * FROM badge_events WHERE gate = 'ALMOX_TI' AND event_time BETWEEN '2026-03-13 17:30:00' AND '2026-03-16 08:10:00'",
  );
  await expect(terminal.getByText('2026-03-13 22:47:03')).toBeVisible();
  await terminal.getByRole('button', { name: 'Fixar no dossiê' }).click();
  await expect(page.getByText('Fixado no dossiê.')).toBeVisible();

  await runQuery(
    page,
    'SELECT id, name, department, badge_id FROM employees WHERE badge_id = 4471',
  );
  await expect(terminal.getByText('Rafael Tavares')).toBeVisible();
  await terminal.getByRole('button', { name: 'Fixar no dossiê' }).click();

  await openApp(page, 'Mail');
  await mailItem(page, 'Contrato 112').first().click();
  await replyButton(page).click();
  const report = page.getByRole('dialog');
  await report.getByLabel('Rafael Tavares, do Financeiro').check();
  await report.getByLabel('Sexta, 13/03, entre 22:30 e 23:00').check();
  await report.getByRole('button', { name: 'Enviar relatório' }).click();

  await expect(mailItem(page, 'relatório aceito')).toBeVisible();
});

test('a wrong report spends an attempt without saying which part failed', async ({
  page,
}) => {
  await startGame(page);
  await acceptCase001(page);
  await openApp(page, 'Terminal SQL');
  await runQuery(
    page,
    "SELECT * FROM badge_events WHERE gate = 'ALMOX_TI' AND event_time BETWEEN '2026-03-13 17:30:00' AND '2026-03-16 08:10:00'",
  );
  await activeWindow(page)
    .getByRole('button', { name: 'Fixar no dossiê' })
    .click();

  await openApp(page, 'Mail');
  await mailItem(page, 'Contrato 112').first().click();
  await replyButton(page).click();
  const report = page.getByRole('dialog');
  // Sem a identidade do crachá 4471, a opção do Rafael ainda não aparece.
  await expect(report.getByLabel('Rafael Tavares, do Financeiro')).toHaveCount(
    0,
  );
  await report.getByLabel('Denise Rocha, da limpeza').check();
  await report.getByLabel('Sexta, 13/03, entre 19:00 e 19:30').check();
  await report.getByRole('button', { name: 'Enviar relatório' }).click();

  await expect(mailItem(page, 'não fecha')).toBeVisible();
});
