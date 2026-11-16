import { expect, test } from '@playwright/test';

import {
  activeWindow,
  mailItem,
  openApp,
  pinResult,
  runQuery,
  sendReport,
  solveCase001,
  startGame,
} from './helpers';

test('case 002 arrives after case 001 and is solved with JOINs', async ({
  page,
}) => {
  await startGame(page);
  await solveCase001(page);

  await mailItem(page, 'Contrato 117').click();
  await page.getByRole('button', { name: 'Aceitar contrato' }).click();

  await openApp(page, 'Terminal SQL');
  const terminal = activeWindow(page);
  // Aceitar o contrato leva o Terminal para o banco novo.
  await expect(terminal.getByText('invoices').first()).toBeVisible();

  await runQuery(
    page,
    'SELECT v.legal_name, e.name FROM vendors v JOIN employees e ON e.bank_account = v.bank_account',
  );
  await expect(terminal.getByText('Tiago Seixas')).toBeVisible();
  await pinResult(page);

  await runQuery(page, "SELECT * FROM vendors WHERE legal_name LIKE 'Delta%'");
  await pinResult(page);

  await runQuery(
    page,
    'SELECT * FROM invoices WHERE vendor_id = 42 ORDER BY issued_at LIMIT 1',
  );
  await expect(terminal.getByText('2025-07-02')).toBeVisible();
  await pinResult(page);

  await sendReport(page, 'Contrato 117', [
    'Tiago Seixas, de Compras',
    'Julho de 2025',
  ]);
  await expect(mailItem(page, 'Contrato 117: relatório aceito')).toBeVisible();
  await expect(mailItem(page, 'Sobre o próximo')).toBeVisible();
});
