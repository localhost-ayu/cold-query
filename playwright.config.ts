import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta: o jogo de verdade, buildado e servido pelo
 * `vite preview`, num Firefox controlado pelo Playwright.
 * Uso: bun run e2e (a primeira vez pede `bunx playwright install firefox`).
 */
export default defineConfig({
  testDir: 'e2e',
  // .e2e.ts para o Vitest não pegar estes arquivos (ele procura .test/.spec).
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'firefox',
      // O viewport vem depois do preset, que traz o próprio (1280×720).
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'bun run build && bun run preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
