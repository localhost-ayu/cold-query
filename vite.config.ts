/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

import { loadCasesFromDisk } from './scripts/cases';

const root = fileURLToPath(new URL('.', import.meta.url));

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(join(dir, entry.name))
      : [join(dir, entry.name)],
  );
}

/**
 * Módulo `virtual:cases`: os casos de cases/ já validados, com Markdown em HTML.
 * O SQL de cada banco vira um import dinâmico (?raw), então só baixa quando o
 * jogador aceita o caso. Mexer em qualquer arquivo de caso recarrega o módulo.
 */
function casesPlugin(): Plugin {
  const publicId = 'virtual:cases';
  const resolvedId = `\0${publicId}`;
  return {
    name: 'cold-query-cases',
    resolveId: (source) => (source === publicId ? resolvedId : undefined),
    load(source) {
      if (source !== resolvedId) return;
      for (const file of filesUnder(join(root, 'cases')))
        this.addWatchFile(file);
      const cases = loadCasesFromDisk(root);
      const loaders = cases.flatMap(({ bundle, databases }) =>
        Object.entries(databases).map(
          ([dbId, file]) =>
            `${JSON.stringify(`${bundle.manifest.id}:${dbId}`)}: () => import(${JSON.stringify(`/${relative(root, file)}?raw`)}).then((m) => m.default)`,
        ),
      );
      return [
        `export const cases = ${JSON.stringify(cases.map((item) => item.bundle))};`,
        `export const databaseLoaders = {${loaders.join(',\n')}};`,
      ].join('\n');
    },
  };
}

export default defineConfig({
  // Raiz do domínio por padrão. Para publicar em subpasta (GitHub Pages),
  // rode o build com BASE_PATH=/cold-query/.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), casesPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // O SQLite WASM localiza o próprio .wasm via import.meta.url; o pré-empacotamento
  // do Vite em dev mudaria esse caminho, então o pacote fica de fora.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
