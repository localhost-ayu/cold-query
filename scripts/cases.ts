/**
 * Lê e valida os casos em cases/. Roda fora do navegador: o plugin do Vite usa
 * para montar o módulo `virtual:cases`, e os scripts validate-cases e os testes
 * usam para conferir o conteúdo.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';

import {
  caseSchema,
  emailFrontmatterSchema,
  resolutionSchema,
  siteFrontmatterSchema,
  type CaseBundle,
  type CaseEmail,
  type CaseSite,
} from '../src/core/case-schema';

export interface DiskCase {
  bundle: CaseBundle;
  /** Caminho absoluto de cada banco, por id. */
  databases: Record<string, string>;
  dir: string;
}

export class CaseError extends Error {}

const LOCALES = ['pt-BR', 'en'] as const;

function readJson<T>(file: string, schema: z.ZodType<T>, root: string): T {
  const result = schema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!result.success) {
    throw new CaseError(
      `${relative(root, file)}: ${result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
    );
  }
  return result.data;
}

/** Separa o frontmatter YAML (entre linhas ---) do corpo Markdown. */
function splitFrontmatter(text: string, file: string) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new CaseError(`${file}: falta o frontmatter entre ---`);
  return { data: parseYaml(match[1]) as unknown, body: match[2] };
}

/**
 * Parágrafos terminados em {#id} viram âncoras que o jogador pode fixar:
 * <p id="id" data-anchor="id">. Devolve o HTML e a lista de âncoras.
 */
function renderSite(body: string): { html: string; anchors: string[] } {
  const anchors: string[] = [];
  const html = (marked.parse(body, { async: false }) as string).replace(
    /<p>([\s\S]*?)\s*\{#([\w-]+)\}<\/p>/g,
    (_, content: string, anchor: string) => {
      anchors.push(anchor);
      return `<p id="${anchor}" data-anchor="${anchor}">${content}</p>`;
    },
  );
  return { html, anchors };
}

function readMarkdownDir<T>(
  dir: string,
  root: string,
  build: (file: string, text: string, locale: (typeof LOCALES)[number]) => T,
): T[] {
  const items: T[] = [];
  for (const locale of LOCALES) {
    const folder = join(dir, locale);
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder).sort()) {
      if (!name.endsWith('.md')) continue;
      const file = join(folder, name);
      items.push(
        build(relative(root, file), readFileSync(file, 'utf8'), locale),
      );
    }
  }
  return items;
}

function parseWith<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new CaseError(
      `${file}: ${result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
    );
  }
  return result.data;
}

/** Confere referências entre arquivos: tudo que é citado precisa existir. */
function crossCheck(bundle: CaseBundle, dir: string, root: string) {
  const where = relative(root, dir);
  const { manifest, resolution, emails } = bundle;
  const emailIds = new Set(emails.map((email) => email.id));
  const fail = (message: string) => {
    throw new CaseError(`${where}: ${message}`);
  };

  if (!emailIds.has(manifest.startEmail))
    fail(`startEmail ${manifest.startEmail} não existe`);
  for (const outcome of Object.values(resolution.outcomes)) {
    if (!emailIds.has(outcome))
      fail(`e-mail de resultado ${outcome} não existe`);
  }
  for (const email of emails) {
    for (const attachment of email.attachments) {
      if (!existsSync(join(dir, attachment)))
        fail(`${email.id}: anexo ${attachment} não existe`);
    }
    const unlock = email.unlockedBy;
    if (unlock?.startsWith('emailRead:') && !emailIds.has(unlock.slice(10)))
      fail(`${email.id}: unlockedBy aponta para e-mail inexistente`);
  }

  const factIds = new Set<string>();
  for (const fact of resolution.facts) {
    if (factIds.has(fact.id)) fail(`fato duplicado ${fact.id}`);
    factIds.add(fact.id);
  }
  for (const slot of resolution.report.slots) {
    const optionIds = new Set<string>();
    for (const option of slot.options) {
      if (optionIds.has(option.id))
        fail(`opção duplicada ${slot.id}.${option.id}`);
      optionIds.add(option.id);
      const needed =
        'all' in option.requires
          ? option.requires.all
          : 'any' in option.requires
            ? option.requires.any
            : [];
      for (const fact of needed) {
        if (!factIds.has(fact))
          fail(`${slot.id}.${option.id} exige fato inexistente ${fact}`);
      }
    }
    if (!resolution.answerHashes[slot.id])
      fail(`slot ${slot.id} sem hash de resposta`);
  }
}

export function loadCasesFromDisk(root: string): DiskCase[] {
  const casesDir = join(root, 'cases');
  const folders = readdirSync(casesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(casesDir, entry.name))
    .sort();

  const cases = folders.map((dir): DiskCase => {
    const manifest = readJson(join(dir, 'case.json'), caseSchema, root);
    const resolution = readJson(
      join(dir, 'resolution.json'),
      resolutionSchema,
      root,
    );

    const emails = readMarkdownDir<CaseEmail>(
      join(dir, 'emails'),
      root,
      (file, text, locale) => {
        const { data, body } = splitFrontmatter(text, file);
        return {
          ...parseWith(emailFrontmatterSchema, data, file),
          locale,
          html: marked.parse(body, { async: false }) as string,
        };
      },
    );
    const sites = readMarkdownDir<CaseSite>(
      join(dir, 'sites'),
      root,
      (file, text, locale) => {
        const { data, body } = splitFrontmatter(text, file);
        return {
          ...parseWith(siteFrontmatterSchema, data, file),
          locale,
          ...renderSite(body),
        };
      },
    );

    const databases: Record<string, string> = {};
    for (const database of manifest.databases) {
      const file = join(dir, database.file);
      if (!existsSync(file))
        throw new CaseError(`${relative(root, file)} não existe`);
      databases[database.id] = file;
    }

    const bundle: CaseBundle = { manifest, resolution, emails, sites };
    crossCheck(bundle, dir, root);
    return { bundle, databases, dir };
  });

  const ids = cases.map((item) => item.bundle.manifest.id);
  if (new Set(ids).size !== ids.length)
    throw new CaseError('ids de caso repetidos');
  return cases;
}
