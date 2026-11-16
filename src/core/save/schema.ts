import { z } from 'zod';

import { appIds } from '@/store/window-store';

import { CURRENT_SAVE_VERSION, MAX_SAVE_BYTES } from './version';

/**
 * Formato do save. Todo save tem `saveVersion`; ao mudar o formato, a versão
 * sobe e uma migração em `migrations` converte o anterior. Um save importado
 * é tratado como não confiável: passa por migração e validação antes de entrar.
 *
 * Este módulo traz o zod, então só é carregado quando um save é lido.
 */
export { CURRENT_SAVE_VERSION, MAX_SAVE_BYTES };

const id = z.string().min(1).max(200);
const cell = z.union([z.string(), z.number(), z.null()]);

const progressSchema = z.object({
  status: z.enum(['available', 'active', 'solved', 'failed']),
  acceptedAt: z.number().optional(),
  attempts: z.number().int().min(0),
  wrongAttempts: z.number().int().min(0),
  hintsRevealed: z.number().int().min(0),
  discoveredFacts: z.array(id),
  unlockedOptions: z.record(id, z.array(id)),
  selection: z.record(id, id),
  stars: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  completedAt: z.number().optional(),
});

const inboxSchema = z.object({
  id,
  caseId: id,
  emailId: id,
  deliveredAt: z.number(),
  read: z.boolean(),
  verdict: z.enum(['correct', 'partial', 'wrong', 'failed']).optional(),
});

const evidenceSchema = z.object({
  id,
  caseId: id,
  source: z.enum(['query', 'site']),
  dbId: id.optional(),
  sql: z.string().max(20_000).optional(),
  columns: z.array(z.string().max(500)).max(200),
  rows: z.array(z.array(cell).max(200)).max(100),
  pageId: id.optional(),
  anchor: id.optional(),
  note: z.string().max(10_000).optional(),
  clockOffset: z.number().int().min(-172_800).max(172_800).optional(),
  pinnedAt: z.string(),
});

const historySchema = z.object({
  id,
  sql: z.string().max(20_000),
  dbId: id,
  ok: z.boolean(),
  ranAt: z.number(),
});

const windowSchema = z.object({
  id: z.enum(appIds),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  minimized: z.boolean(),
  maximized: z.boolean(),
  snap: z.enum(['left', 'right']).nullable(),
  zIndex: z.number(),
  restoreBounds: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable(),
});

export const saveSchema = z.object({
  app: z.literal('cold-query'),
  saveVersion: z.literal(CURRENT_SAVE_VERSION),
  savedAt: z.string(),
  preferences: z
    .object({
      locale: z.enum(['pt-BR', 'en']),
      theme: z.enum(['system', 'light', 'dark']),
      soundEnabled: z.boolean(),
      volume: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
  game: z.object({
    cases: z.record(id, progressSchema),
    inbox: z.array(inboxSchema).max(1000),
    evidence: z.array(evidenceSchema).max(2000),
    notes: z.record(id, z.string().max(100_000)),
    started: z.boolean(),
    // Opcional: saves de antes do treinamento não têm o campo.
    tutorial: z
      .object({
        status: z.enum(['pending', 'active', 'done', 'skipped']),
        step: z.number().int().min(0).max(100),
      })
      .optional(),
  }),
  terminal: z
    .object({
      tabs: z
        .array(
          z.object({
            id,
            number: z.number().int().positive(),
            sql: z.string().max(50_000),
            dbId: id,
          }),
        )
        .max(50),
      activeTabId: id,
      history: z.array(historySchema).max(200),
      // Opcional: saves de antes das consultas salvas não têm o campo.
      saved: z
        .array(
          z.object({
            id,
            name: z.string().min(1).max(60),
            sql: z.string().max(20_000),
            dbId: id,
          }),
        )
        .max(100)
        .optional(),
      nextNumber: z.number().int().positive(),
    })
    .optional(),
  windows: z
    .object({
      windows: z.array(windowSchema).max(20),
      activeId: windowSchema.shape.id.nullable(),
    })
    .optional(),
});

export type SaveFile = z.infer<typeof saveSchema>;

/** Uma migração recebe o save na versão N e devolve na versão N + 1. */
export type Migration = (
  save: Record<string, unknown>,
) => Record<string, unknown>;

/**
 * Migrações por versão de origem. Ainda não há nenhuma: quando o formato
 * mudar para a versão 2, entra aqui `1: (save) => ({ ...save, saveVersion: 2, ... })`.
 */
export const migrations: Record<number, Migration> = {};

export type ParseResult =
  | { ok: true; save: SaveFile; migratedFrom: number | null }
  | { ok: false; reason: 'invalid' | 'newer' | 'tooLarge' };

/** Leva um save antigo até a versão atual, um passo por vez. */
export function migrate(
  raw: Record<string, unknown>,
  steps: Record<number, Migration> = migrations,
  target: number = CURRENT_SAVE_VERSION,
): Record<string, unknown> | 'newer' | 'invalid' {
  let current = raw;
  let version = current.saveVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return 'invalid';
  if (version > target) return 'newer';
  while (version < target) {
    const step = steps[version];
    if (!step) return 'invalid';
    current = step(current);
    if (current.saveVersion !== version + 1) return 'invalid';
    version += 1;
  }
  return current;
}

/** Valida um save vindo do IndexedDB ou de um arquivo (texto JSON ou objeto já lido). */
export function parseSave(
  input: string | unknown,
  steps: Record<number, Migration> = migrations,
  target: number = CURRENT_SAVE_VERSION,
): ParseResult {
  let data = input;
  if (typeof input === 'string') {
    if (new Blob([input]).size > MAX_SAVE_BYTES)
      return { ok: false, reason: 'tooLarge' };
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, reason: 'invalid' };
    }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    return { ok: false, reason: 'invalid' };

  const raw = data as Record<string, unknown>;
  const migrated = migrate(raw, steps, target);
  if (migrated === 'newer') return { ok: false, reason: 'newer' };
  if (migrated === 'invalid') return { ok: false, reason: 'invalid' };

  const result = saveSchema.safeParse(migrated);
  if (!result.success) return { ok: false, reason: 'invalid' };
  return {
    ok: true,
    save: result.data,
    migratedFrom:
      raw.saveVersion === target ? null : (raw.saveVersion as number),
  };
}
