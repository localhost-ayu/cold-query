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
} from '.';

/**
 * Monta um caso a partir dos arquivos em memória (caminho relativo → texto).
 * O mesmo código serve ao build (lendo `cases/` do disco) e ao jogo (lendo um
 * `.dbcase` importado), então um mod passa pelas mesmas regras de um caso oficial.
 *
 * Traz yaml, marked e zod: no navegador, só carrega quando alguém importa um caso.
 */

export class CaseError extends Error {}

export type CaseFiles = Record<string, string>;

export interface BuiltCase {
  bundle: CaseBundle;
  /** Banco por id: caminho dentro do caso e o SQL. */
  databases: Record<string, { file: string; sql: string }>;
}

const LOCALES = ['pt-BR', 'en'] as const;

function issues(error: z.ZodError) {
  return error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
}

function parseWith<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new CaseError(`${file}: ${issues(result.error)}`);
  return result.data;
}

function readJson<T>(files: CaseFiles, file: string, schema: z.ZodType<T>): T {
  const text = files[file];
  if (text === undefined) throw new CaseError(`${file} não existe`);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new CaseError(`${file}: JSON inválido`);
  }
  return parseWith(schema, data, file);
}

/** Separa o frontmatter YAML (entre linhas ---) do corpo Markdown. */
function splitFrontmatter(text: string, file: string) {
  const match = text
    .replace(/\r\n/g, '\n')
    .match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new CaseError(`${file}: falta o frontmatter entre ---`);
  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch {
    throw new CaseError(`${file}: frontmatter YAML inválido`);
  }
  return { data, body: match[2] };
}

/**
 * Parágrafos terminados em {#id} viram âncoras que o jogador pode fixar:
 * <p id="id" data-anchor="id">. O `(?!<\/p>)` impede que um parágrafo sem
 * âncora seja engolido junto com o seguinte. Devolve o HTML e as âncoras.
 */
export function renderSite(body: string): { html: string; anchors: string[] } {
  const anchors: string[] = [];
  const html = (marked.parse(body, { async: false }) as string).replace(
    /<p>((?:(?!<\/p>)[\s\S])*?)\s*\{#([\w-]+)\}<\/p>/g,
    (_, content: string, anchor: string) => {
      anchors.push(anchor);
      return `<p id="${anchor}" data-anchor="${anchor}">${content}</p>`;
    },
  );
  return { html, anchors };
}

/** Arquivos .md de `emails/<idioma>/` ou `sites/<idioma>/`, em ordem. */
function markdownIn(files: CaseFiles, folder: 'emails' | 'sites') {
  return LOCALES.flatMap((locale) =>
    Object.keys(files)
      .filter(
        (path) =>
          path.startsWith(`${folder}/${locale}/`) && path.endsWith('.md'),
      )
      .sort()
      .map((path) => ({ path, locale, text: files[path] })),
  );
}

/** Confere referências entre arquivos: tudo que é citado precisa existir. */
function crossCheck(bundle: CaseBundle, files: CaseFiles) {
  const { manifest, resolution, emails, sites } = bundle;
  const emailIds = new Set(emails.map((email) => email.id));
  const fail = (message: string) => {
    throw new CaseError(message);
  };

  if (!emailIds.has(manifest.startEmail))
    fail(`startEmail ${manifest.startEmail} não existe`);
  for (const outcome of Object.values(resolution.outcomes)) {
    if (!emailIds.has(outcome))
      fail(`e-mail de resultado ${outcome} não existe`);
  }
  for (const email of emails) {
    for (const attachment of email.attachments) {
      if (files[attachment] === undefined)
        fail(`${email.id}: anexo ${attachment} não existe`);
    }
    const unlock = email.unlockedBy;
    if (unlock?.startsWith('emailRead:') && !emailIds.has(unlock.slice(10)))
      fail(`${email.id}: unlockedBy aponta para e-mail inexistente`);
  }

  const pageIds = new Set(sites.map((site) => site.id));
  const factIds = new Set<string>();
  for (const fact of resolution.facts) {
    if (factIds.has(fact.id)) fail(`fato duplicado ${fact.id}`);
    factIds.add(fact.id);
    if (fact.matcher.type === 'snippet' && !pageIds.has(fact.matcher.pageId))
      fail(`${fact.id}: página ${fact.matcher.pageId} não existe`);
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

export function buildCase(files: CaseFiles): BuiltCase {
  const manifest = readJson(files, 'case.json', caseSchema);
  const resolution = readJson(files, 'resolution.json', resolutionSchema);

  const emails = markdownIn(files, 'emails').map(
    ({ path, locale, text }): CaseEmail => {
      const { data, body } = splitFrontmatter(text, path);
      return {
        ...parseWith(emailFrontmatterSchema, data, path),
        locale,
        html: marked.parse(body, { async: false }) as string,
      };
    },
  );
  const sites = markdownIn(files, 'sites').map(
    ({ path, locale, text }): CaseSite => {
      const { data, body } = splitFrontmatter(text, path);
      return {
        ...parseWith(siteFrontmatterSchema, data, path),
        locale,
        ...renderSite(body),
      };
    },
  );

  const databases: BuiltCase['databases'] = {};
  for (const database of manifest.databases) {
    const sql = files[database.file];
    if (sql === undefined) throw new CaseError(`${database.file} não existe`);
    databases[database.id] = { file: database.file, sql };
  }

  const bundle: CaseBundle = { manifest, resolution, emails, sites };
  crossCheck(bundle, files);
  return { bundle, databases };
}
