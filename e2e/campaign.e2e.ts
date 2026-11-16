import { expect, test, type Page } from '@playwright/test';

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

/** Aceita o contrato, roda e fixa cada consulta, e manda o relatório. */
async function solve(
  page: Page,
  contract: string,
  table: string,
  queries: string[],
  choices: string[],
) {
  await openApp(page, 'Mail');
  await mailItem(page, contract).first().click();
  await page.getByRole('button', { name: 'Aceitar contrato' }).click();
  await openApp(page, 'Terminal SQL');
  // Aceitar leva o Terminal para o banco do caso novo.
  await expect(activeWindow(page).getByText(table).first()).toBeVisible();
  for (const sql of queries) {
    await runQuery(page, sql);
    await expect(activeWindow(page).locator('[role="alert"]')).toHaveCount(0);
    await pinResult(page);
  }
  await sendReport(page, contract, choices);
  await expect(mailItem(page, `${contract}: relatório aceito`)).toBeVisible();
}

test('plays the whole season, from case 001 to the end-of-season e-mail', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await startGame(page);
  await solveCase001(page);

  await solve(
    page,
    'Contrato 117',
    'invoices',
    [
      'SELECT v.legal_name, e.name FROM vendors v JOIN employees e ON e.bank_account = v.bank_account',
      "SELECT * FROM vendors WHERE legal_name LIKE 'Delta%'",
      'SELECT * FROM invoices WHERE vendor_id = 42 ORDER BY issued_at LIMIT 1',
    ],
    ['Tiago Seixas, de Compras', 'Julho de 2025'],
  );

  await solve(
    page,
    'Contrato 121',
    'refunds',
    [
      'SELECT c.name, COUNT(DISTINCT t.id) AS vendas, COUNT(DISTINCT r.id) AS estornos FROM cashiers c JOIN transactions t ON t.cashier_id = c.id LEFT JOIN refunds r ON r.cashier_id = c.id GROUP BY c.id HAVING vendas >= 100',
      'SELECT cashier_id, COUNT(*), MIN(amount), MAX(amount), SUM(amount) FROM refunds WHERE approved_by IS NULL GROUP BY cashier_id',
    ],
    [
      'Wellington Castro, do caixa 7 à tarde',
      'Valores logo abaixo do limite de R$ 50, sem supervisor',
      'Entre R$ 9 mil e R$ 14 mil',
    ],
  );

  await solve(
    page,
    'Contrato 126',
    'matter_team',
    [
      "SELECT u.username, d.downloaded_at, d.channel FROM downloads d JOIN users u ON u.id = d.user_id JOIN documents doc ON doc.id = d.document_id WHERE doc.title = 'minuta_fusao_v7'",
      'SELECT u.username, doc.title FROM downloads d JOIN documents doc ON doc.id = d.document_id JOIN users u ON u.id = d.user_id LEFT JOIN matter_team mt ON mt.matter_id = doc.matter_id AND mt.user_id = d.user_id WHERE doc.matter_id = 3 AND mt.user_id IS NULL',
      "SELECT * FROM users WHERE active = 1 AND hr_id IN (SELECT id FROM hr_records WHERE status = 'DESLIGADO')",
      "SELECT * FROM hr_records WHERE status = 'DESLIGADO'",
    ],
    [
      'c.brito (Caetano Brito)',
      'Credencial de ex-funcionário ainda ativa, usada pela VPN',
      'Desativação de contas no desligamento',
    ],
  );

  await solve(
    page,
    'Contrato 134',
    'heartbeats',
    [
      "SELECT AVG(strftime('%s', f.event_time) - strftime('%s', a.event_time)) FROM heartbeats f JOIN heartbeats a ON a.seq = f.seq WHERE f.source = 'FW' AND a.source = 'AD'",
      "SELECT * FROM dhcp_leases WHERE ip = '10.30.2.57'",
      "WITH real AS (SELECT src_ip, datetime(event_time, '-432 seconds') AS t FROM fw_events WHERE bytes_out > 1000000000) SELECT l.host, a.assigned_to, real.t FROM real JOIN dhcp_leases l ON l.ip = real.src_ip AND real.t BETWEEN l.lease_start AND l.lease_end JOIN assets a ON a.asset_tag = l.host",
      'SELECT src_ip, event_time, bytes_out, dst_scope FROM fw_events WHERE bytes_out > 1000000000',
      "SELECT * FROM ad_logons WHERE username = 'h.sato'",
      'SELECT * FROM absences',
    ],
    [
      'Gustavo Pires, do Comercial',
      'A conta do Henrique Sato, emprestada ou roubada',
      'Entre 22:48 e 22:55',
    ],
  );

  await expect(mailItem(page, 'Fim de temporada')).toBeVisible();
});
