import { z } from 'zod';

/**
 * Schemas do formato de caso (docs/CASE_FORMAT.md). Valem para os casos que
 * acompanham o jogo e, depois, para os importados: conteúdo de fora é não
 * confiável e só entra se passar por aqui.
 */

const id = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/i, 'id em ASCII simples');
/** Texto por idioma; pt-BR é obrigatório e serve de reserva. */
export const localizedText = z.object({
  'pt-BR': z.string().min(1),
  en: z.string().min(1).optional(),
});
const scalar = z.union([z.string(), z.number(), z.null()]);

export const databaseSchema = z.object({
  id,
  file: z.string().regex(/^db\/[\w.-]+\.sql$/),
  label: localizedText,
  readOnly: z.literal(true),
});

export const caseSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^\d{3}$/),
  order: z.number().int().positive(),
  title: localizedText,
  summary: localizedText,
  difficulty: z.number().int().min(1).max(5),
  sqlConcepts: z.array(z.string()).min(1),
  estimatedMinutes: z.number().int().positive(),
  author: z.string().min(1),
  license: z.string().min(1),
  client: z.string().min(1),
  databases: z.array(databaseSchema).min(1),
  startEmail: id,
  maxAttempts: z.number().int().min(1).max(10),
  hints: z.array(z.object({ id, text: localizedText })),
});

export const matcherSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rowHasValues'), values: z.array(scalar).min(1) }),
  z.object({
    type: z.literal('rowsHaveValues'),
    values: z.array(scalar).min(1),
    min: z.number().int().min(2),
  }),
  z.object({ type: z.literal('snippet'), pageId: id, anchor: id }),
]);

export const requirementSchema = z.union([
  z.object({ all: z.array(id).min(1) }).strict(),
  z.object({ any: z.array(id).min(1) }).strict(),
  z.object({ minFacts: z.number().int().min(1) }).strict(),
]);

export const resolutionSchema = z.object({
  facts: z
    .array(
      z.object({
        id,
        bonus: z.boolean(),
        matcher: matcherSchema,
        /** Consulta de referência: o validador prova que ela satisfaz o matcher. */
        verifyQuery: z.string().optional(),
      }),
    )
    .min(1),
  report: z.object({
    slots: z
      .array(
        z.object({
          id,
          label: localizedText,
          options: z
            .array(
              z.object({
                id,
                label: localizedText,
                requires: requirementSchema,
              }),
            )
            .min(2),
        }),
      )
      .min(1),
  }),
  /** sha256 de "caseId|slotId|optionId" da opção certa, por slot. */
  answerHashes: z.record(id, z.string().regex(/^[0-9a-f]{64}$/)),
  outcomes: z.object({
    correct: id,
    partial: id,
    wrong: id,
    failed: id,
  }),
});

export const unlockSchema = z.union([
  z.literal('caseAccepted'),
  z.string().regex(/^emailRead:[\w-]+$/),
  z.string().regex(/^answerCorrect:\d{3}$/),
]);

export const emailFrontmatterSchema = z.object({
  id,
  from: z.object({
    name: z.string().min(1),
    address: z.string().regex(/^[^@\s]+@[^@\s]+\.example$/),
    role: z.string().min(1),
  }),
  subject: z.string().min(1),
  /** Data fictícia, como aparece no jogo (ISO com fuso). */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/),
  kind: z.enum(['brief', 'info', 'outcome']),
  unlockedBy: unlockSchema.optional(),
  attachments: z.array(z.string()).default([]),
});

export const siteFrontmatterSchema = z.object({
  id,
  url: z.string().regex(/^[\w.-]+\.example(\/[\w./-]*)?$/),
  title: z.string().min(1),
});

export type CaseManifest = z.infer<typeof caseSchema>;
export type Resolution = z.infer<typeof resolutionSchema>;
export type Fact = Resolution['facts'][number];
export type Matcher = z.infer<typeof matcherSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type ReportSlot = Resolution['report']['slots'][number];
export type EmailFrontmatter = z.infer<typeof emailFrontmatterSchema>;
export type SiteFrontmatter = z.infer<typeof siteFrontmatterSchema>;
export type LocalizedText = z.infer<typeof localizedText>;

/** E-mail pronto para o jogo: frontmatter validado e corpo já em HTML. */
export interface CaseEmail extends EmailFrontmatter {
  locale: 'pt-BR' | 'en';
  html: string;
}

export interface CaseSite extends SiteFrontmatter {
  locale: 'pt-BR' | 'en';
  html: string;
  anchors: string[];
}

/** Um caso inteiro, como o jogo recebe. O SQL dos bancos carrega sob demanda. */
export interface CaseBundle {
  manifest: CaseManifest;
  resolution: Resolution;
  emails: CaseEmail[];
  sites: CaseSite[];
}
