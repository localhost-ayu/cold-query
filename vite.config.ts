/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Raiz do domínio por padrão. Para publicar em subpasta (GitHub Pages),
  // rode o build com BASE_PATH=/cold-query/.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
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
