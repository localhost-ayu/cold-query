import { expect, type Page } from '@playwright/test';

/** Abre o jogo novo e espera o e-mail de boas-vindas. */
export async function startGame(page: Page) {
  await page.goto('/');
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
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  await expect(activeWindow(page)).toContainText(name);
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
