import { expect, type Page } from '@playwright/test';

/** Passa pela tela de bloqueio: levanta o escudo e desbloqueia. */
export async function unlock(page: Page) {
  await page.getByRole('button', { name: /para desbloquear/ }).click();
  await page.getByRole('button', { name: 'Desbloquear' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Tela de bloqueio' }),
  ).toHaveCount(0);
}

/** Abre o jogo novo, desbloqueia e espera o e-mail de boas-vindas. */
export async function startGame(page: Page) {
  await page.goto('/');
  await unlock(page);
  await expect(mailItem(page, 'Bem-vindo à Nova Perícia')).toBeVisible({
    timeout: 15_000,
  });
}

export const mailItem = (page: Page, subject: string) =>
  page.locator('.mail__item', { hasText: subject });

/** Pula o treinamento e aceita o contrato do caso 001. */
export async function acceptCase001(page: Page) {
  await mailItem(page, 'Bem-vindo à Nova Perícia').click();
  await page.getByRole('button', { name: 'Já sei SQL, pular' }).click();
  await mailItem(page, 'Contrato 112').click();
  await page.getByRole('button', { name: 'Aceitar contrato' }).click();
  await expect(page.getByText('Contrato aceito')).toBeVisible();
}

/** Abre um app pelo overview (Alt+F1, digitar, Enter), como o jogador faria. */
export async function openApp(page: Page, name: string) {
  await page.keyboard.press('Alt+F1');
  // Espera a busca ganhar o foco, senão as primeiras letras vão para outra janela.
  await expect(
    page.getByRole('searchbox', { name: 'Digite para pesquisar' }),
  ).toBeFocused();
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  await expect(
    page.locator('.window[data-active] .window__title').last(),
  ).toHaveText(name);
}

export const activeWindow = (page: Page) =>
  page.locator('.window[data-active]');

/** Troca o texto do editor do Terminal e executa (Ctrl+Enter). */
export async function runQuery(page: Page, sql: string) {
  const editor = activeWindow(page).locator('.cm-content');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(sql);
  await page.keyboard.press('Control+Enter');
}

/** O "Responder" do fim da mensagem (a barra da janela tem outro igual). */
export const replyButton = (page: Page) =>
  page
    .getByRole('region', { name: 'Mensagem' })
    .getByRole('button', { name: 'Responder com relatório' });

/** Fixa o resultado que está na tela do Terminal. */
export async function pinResult(page: Page) {
  await activeWindow(page)
    .getByRole('button', { name: 'Fixar no dossiê' })
    .click();
  await expect(page.getByText('Fixado no dossiê.')).toBeVisible();
}

/** Responde o contrato com uma opção por slot, pelos rótulos visíveis. */
export async function sendReport(
  page: Page,
  contract: string,
  choices: string[],
) {
  await openApp(page, 'Mail');
  await mailItem(page, contract).first().click();
  await replyButton(page).click();
  const report = page.getByRole('dialog');
  for (const choice of choices) await report.getByLabel(choice).check();
  await report.getByRole('button', { name: 'Enviar relatório' }).click();
}

/** Resolve o caso 001 pelo caminho mais curto, para chegar aos casos seguintes. */
export async function solveCase001(page: Page) {
  await acceptCase001(page);
  await openApp(page, 'Terminal SQL');
  await expect(
    activeWindow(page).getByText('badge_events').first(),
  ).toBeVisible();
  await runQuery(
    page,
    "SELECT * FROM badge_events WHERE badge_id = 4471 AND gate = 'ALMOX_TI'",
  );
  await pinResult(page);
  await runQuery(page, 'SELECT * FROM employees WHERE badge_id = 4471');
  await pinResult(page);
  await sendReport(page, 'Contrato 112', [
    'Rafael Tavares, do Financeiro',
    'Sexta, 13/03, entre 22:30 e 23:00',
  ]);
  await expect(mailItem(page, 'relatório aceito')).toBeVisible();
}
