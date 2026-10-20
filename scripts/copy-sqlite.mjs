/**
 * Copia o SQLite WASM do pacote npm para public/sqlite/. O worker importa esses
 * arquivos direto, sem passar pelo bundler: o pacote traz código de OPFS que o
 * Turbopack não consegue empacotar e que o Cold Query não usa.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/@sqlite.org/sqlite-wasm/dist');
const target = join(root, 'public/sqlite');

mkdirSync(target, { recursive: true });
for (const file of ['index.mjs', 'sqlite3.wasm']) {
  copyFileSync(join(source, file), join(target, file));
}
console.log('sqlite-wasm copiado para public/sqlite/');
