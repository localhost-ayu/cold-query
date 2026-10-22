import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { CaseBundle, CaseEmail } from '@/core/case-schema';
import type { Locale } from '@/core/i18n';
import {
  MAX_EVIDENCE,
  MAX_EVIDENCE_ROWS,
  discoverFacts,
  judge,
  stars,
  unlockOptions,
  type Evidence,
  type VerdictKind,
} from '@/core/resolution';

/** Um e-mail entregue na caixa de entrada. O mesmo e-mail pode chegar mais de uma vez (resultados). */
export interface InboxItem {
  id: string;
  caseId: string;
  emailId: string;
  deliveredAt: number;
  read: boolean;
  /** Para e-mails de resultado: o veredito que os gerou. */
  verdict?: VerdictKind | 'failed';
}

export interface CaseProgress {
  status: 'available' | 'active' | 'solved' | 'failed';
  acceptedAt?: number;
  attempts: number;
  wrongAttempts: number;
  hintsRevealed: number;
  /** Fatos sustentados pelo dossiê atual (recalculado a cada mudança). */
  discoveredFacts: string[];
  /** Opções já liberadas por slot; só cresce. */
  unlockedOptions: Record<string, string[]>;
  selection: Record<string, string>;
  stars?: 1 | 2 | 3;
  completedAt?: number;
}

export type PinInput = Omit<Evidence, 'id' | 'pinnedAt' | 'rows'> & {
  rows: Evidence['rows'];
};

export type PinResult =
  | { ok: true; truncated: boolean }
  | { ok: false; reason: 'limit' | 'inactive' };

/** O que vai para o save. Ações e estado derivado ficam de fora. */
/** Caixa de entrada do treinamento: e-mails do jogo, não de um caso. */
export const TUTORIAL_CASE_ID = 'tutorial';

export interface TutorialProgress {
  status: 'pending' | 'active' | 'done' | 'skipped';
  /** Próximo exercício a resolver (0 = primeiro). */
  step: number;
}

export interface GameSnapshot {
  cases: Record<string, CaseProgress>;
  inbox: InboxItem[];
  evidence: Evidence[];
  notes: Record<string, string>;
  started: boolean;
  tutorial: TutorialProgress;
}

interface GameState extends GameSnapshot {
  start: () => void;
  startTutorial: () => void;
  skipTutorial: () => void;
  /** Marca o exercício `step` como resolvido; o último conclui o treinamento. */
  completeTutorialStep: (step: number) => void;
  /** Restaura um save. Casos que o save não conhece começam do zero. */
  hydrate: (
    snapshot: Omit<GameSnapshot, 'tutorial'> & { tutorial?: TutorialProgress },
  ) => void;
  /** Apaga todo o progresso, como num jogo novo. */
  reset: () => void;
  readEmail: (inboxId: string) => void;
  acceptCase: (caseId: string) => void;
  pinEvidence: (input: PinInput) => PinResult;
  removeEvidence: (evidenceId: string) => Evidence | null;
  restoreEvidence: (evidence: Evidence) => void;
  setEvidenceNote: (evidenceId: string, note: string) => void;
  revealHint: (caseId: string) => void;
  selectOption: (caseId: string, slotId: string, optionId: string) => void;
  submitReport: (caseId: string) => Promise<VerdictKind | 'failed' | null>;
  reopenCase: (caseId: string) => void;
  setNote: (caseId: string, text: string) => void;
}

export interface GameStoreOptions {
  /** Chamado a cada e-mail entregue (banner, som). */
  onDeliver?: (item: InboxItem) => void;
  /** Quantos exercícios tem o treinamento. 0 desliga: o jogo começa direto no primeiro caso. */
  tutorialSteps?: number;
  now?: () => number;
}

function freshTutorial(tutorialSteps = 1): TutorialProgress {
  return { status: tutorialSteps > 0 ? 'pending' : 'skipped', step: 0 };
}

function freshProgress(): CaseProgress {
  return {
    status: 'available',
    attempts: 0,
    wrongAttempts: 0,
    hintsRevealed: 0,
    discoveredFacts: [],
    unlockedOptions: {},
    selection: {},
  };
}

/** E-mail no idioma pedido, com o pt-BR de reserva. */
export function findEmail(
  bundle: CaseBundle,
  emailId: string,
  locale: Locale,
): CaseEmail | undefined {
  return (
    bundle.emails.find((e) => e.id === emailId && e.locale === locale) ??
    bundle.emails.find((e) => e.id === emailId && e.locale === 'pt-BR')
  );
}

export function createGameStore(
  bundles: CaseBundle[],
  { onDeliver, now = Date.now, tutorialSteps = 0 }: GameStoreOptions = {},
) {
  const byId = new Map(bundles.map((bundle) => [bundle.manifest.id, bundle]));
  // Ids aleatórios: continuam únicos depois de restaurar um save.
  const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
  const freshCases = () =>
    Object.fromEntries(
      bundles.map((bundle) => [bundle.manifest.id, freshProgress()]),
    );

  return createStore<GameState>((set, get) => {
    /** Entrega e-mails (ids únicos por e-mail de pt-BR) e avisa quem estiver ouvindo. */
    function deliver(
      caseId: string,
      emailIds: string[],
      verdict?: InboxItem['verdict'],
    ) {
      if (
        (caseId !== TUTORIAL_CASE_ID && !byId.has(caseId)) ||
        emailIds.length === 0
      )
        return;
      const items = emailIds.map((emailId): InboxItem => {
        return {
          id: newId('m'),
          caseId,
          emailId,
          deliveredAt: now(),
          read: false,
          verdict,
        };
      });
      set((state) => ({ inbox: [...items, ...state.inbox] }));
      for (const item of items) onDeliver?.(item);
    }

    /** E-mails liberados por um gatilho ("caseAccepted", "emailRead:x"...), entregues uma vez só. */
    function unlock(trigger: string) {
      for (const bundle of bundles) {
        const caseId = bundle.manifest.id;
        const delivered = new Set(
          get()
            .inbox.filter((item) => item.caseId === caseId)
            .map((item) => item.emailId),
        );
        const due = [
          ...new Set(
            bundle.emails
              .filter(
                (email) =>
                  email.unlockedBy === trigger && !delivered.has(email.id),
              )
              .map((email) => email.id),
          ),
        ];
        deliver(caseId, due);
      }
    }

    /** Contrato do primeiro caso, entregue uma vez só. */
    function deliverFirstCase() {
      const first = [...bundles].sort(
        (a, b) => a.manifest.order - b.manifest.order,
      )[0];
      if (!first) return;
      const already = get().inbox.some(
        (item) =>
          item.caseId === first.manifest.id &&
          item.emailId === first.manifest.startEmail,
      );
      if (!already) deliver(first.manifest.id, [first.manifest.startEmail]);
    }

    function patchCase(caseId: string, patch: Partial<CaseProgress>) {
      set((state) => ({
        cases: {
          ...state.cases,
          [caseId]: { ...(state.cases[caseId] ?? freshProgress()), ...patch },
        },
      }));
    }

    /** Recalcula fatos e libera opções depois de qualquer mudança no dossiê. */
    function refresh(caseId: string) {
      const bundle = byId.get(caseId);
      const progress = get().cases[caseId];
      if (!bundle || !progress) return;
      const evidence = get().evidence.filter((item) => item.caseId === caseId);
      const discoveredFacts = discoverFacts(bundle.resolution.facts, evidence);
      patchCase(caseId, {
        discoveredFacts,
        unlockedOptions: unlockOptions(
          bundle.resolution.report,
          discoveredFacts,
          progress.unlockedOptions,
        ),
      });
    }

    return {
      cases: freshCases(),
      inbox: [],
      evidence: [],
      notes: {},
      started: false,
      tutorial: freshTutorial(tutorialSteps),

      hydrate: (snapshot) => {
        const known = (caseId: string) =>
          caseId === TUTORIAL_CASE_ID || byId.has(caseId);
        // Dados de casos que não existem mais (mod removido) são descartados.
        set({
          cases: {
            ...freshCases(),
            ...Object.fromEntries(
              Object.entries(snapshot.cases).filter(([id]) => known(id)),
            ),
          },
          inbox: snapshot.inbox.filter((item) => known(item.caseId)),
          evidence: snapshot.evidence.filter((item) => known(item.caseId)),
          notes: snapshot.notes,
          started: snapshot.started,
          // Saves de antes do treinamento: quem já tinha começado não volta para ele.
          tutorial:
            snapshot.tutorial ??
            (snapshot.started
              ? { status: 'skipped', step: 0 }
              : freshTutorial(tutorialSteps)),
        });
      },

      reset: () =>
        set({
          cases: freshCases(),
          inbox: [],
          evidence: [],
          notes: {},
          started: false,
          tutorial: freshTutorial(tutorialSteps),
        }),

      start: () => {
        if (get().started) return;
        set({ started: true });
        if (get().tutorial.status === 'pending') {
          deliver(TUTORIAL_CASE_ID, ['welcome']);
          return;
        }
        deliverFirstCase();
      },

      startTutorial: () => {
        const { tutorial } = get();
        if (tutorial.status !== 'pending') return;
        set({ tutorial: { status: 'active', step: 0 } });
      },

      skipTutorial: () => {
        const { tutorial } = get();
        if (tutorial.status !== 'pending' && tutorial.status !== 'active')
          return;
        set({ tutorial: { ...tutorial, status: 'skipped' } });
        deliverFirstCase();
      },

      completeTutorialStep: (step) => {
        const { tutorial } = get();
        if (tutorial.status !== 'active' || tutorial.step !== step) return;
        if (step + 1 < tutorialSteps) {
          set({ tutorial: { status: 'active', step: step + 1 } });
          return;
        }
        set({ tutorial: { status: 'done', step: step + 1 } });
        deliver(TUTORIAL_CASE_ID, ['done']);
        deliverFirstCase();
      },

      readEmail: (inboxId) => {
        const item = get().inbox.find((entry) => entry.id === inboxId);
        if (!item || item.read) return;
        set((state) => ({
          inbox: state.inbox.map((entry) =>
            entry.id === inboxId ? { ...entry, read: true } : entry,
          ),
        }));
        unlock(`emailRead:${item.emailId}`);
      },

      acceptCase: (caseId) => {
        const progress = get().cases[caseId];
        if (!progress || progress.status !== 'available') return;
        patchCase(caseId, { status: 'active', acceptedAt: now() });
        unlock('caseAccepted');
      },

      pinEvidence: (input) => {
        const progress = get().cases[input.caseId];
        if (!progress || progress.status !== 'active')
          return { ok: false, reason: 'inactive' };
        const count = get().evidence.filter(
          (item) => item.caseId === input.caseId,
        ).length;
        if (count >= MAX_EVIDENCE) return { ok: false, reason: 'limit' };
        const evidence: Evidence = {
          ...input,
          id: newId('ev'),
          rows: input.rows.slice(0, MAX_EVIDENCE_ROWS),
          pinnedAt: new Date(now()).toISOString(),
        };
        set((state) => ({ evidence: [...state.evidence, evidence] }));
        refresh(input.caseId);
        return { ok: true, truncated: input.rows.length > MAX_EVIDENCE_ROWS };
      },

      removeEvidence: (evidenceId) => {
        const target = get().evidence.find((item) => item.id === evidenceId);
        if (!target) return null;
        set((state) => ({
          evidence: state.evidence.filter((item) => item.id !== evidenceId),
        }));
        refresh(target.caseId);
        return target;
      },

      restoreEvidence: (evidence) => {
        if (get().evidence.some((item) => item.id === evidence.id)) return;
        set((state) => ({ evidence: [...state.evidence, evidence] }));
        refresh(evidence.caseId);
      },

      setEvidenceNote: (evidenceId, note) =>
        set((state) => ({
          evidence: state.evidence.map((item) =>
            item.id === evidenceId ? { ...item, note } : item,
          ),
        })),

      revealHint: (caseId) => {
        const bundle = byId.get(caseId);
        const progress = get().cases[caseId];
        if (!bundle || !progress || progress.status !== 'active') return;
        if (progress.hintsRevealed >= bundle.manifest.hints.length) return;
        patchCase(caseId, { hintsRevealed: progress.hintsRevealed + 1 });
      },

      selectOption: (caseId, slotId, optionId) => {
        const progress = get().cases[caseId];
        if (!progress?.unlockedOptions[slotId]?.includes(optionId)) return;
        patchCase(caseId, {
          selection: { ...progress.selection, [slotId]: optionId },
        });
      },

      submitReport: async (caseId) => {
        const bundle = byId.get(caseId);
        const progress = get().cases[caseId];
        if (!bundle || !progress || progress.status !== 'active') return null;
        const slots = bundle.resolution.report.slots;
        if (slots.some((slot) => !progress.selection[slot.id])) return null;

        const verdict = await judge(
          caseId,
          bundle.resolution.answerHashes,
          progress.selection,
        );
        const attempts = progress.attempts + 1;
        const { outcomes } = bundle.resolution;

        if (verdict === 'correct') {
          patchCase(caseId, {
            attempts,
            status: 'solved',
            completedAt: now(),
            stars: stars(progress.wrongAttempts, progress.hintsRevealed),
          });
          deliver(caseId, [outcomes.correct], 'correct');
          unlock(`answerCorrect:${caseId}`);
          return verdict;
        }

        const wrongAttempts = progress.wrongAttempts + 1;
        if (attempts >= bundle.manifest.maxAttempts) {
          patchCase(caseId, { attempts, wrongAttempts, status: 'failed' });
          deliver(caseId, [outcomes.failed], 'failed');
          return 'failed';
        }
        patchCase(caseId, { attempts, wrongAttempts });
        deliver(
          caseId,
          [verdict === 'partial' ? outcomes.partial : outcomes.wrong],
          verdict,
        );
        return verdict;
      },

      reopenCase: (caseId) => {
        const progress = get().cases[caseId];
        if (!progress || progress.status !== 'failed') return;
        set((state) => ({
          evidence: state.evidence.filter((item) => item.caseId !== caseId),
        }));
        // Volta a ativo do zero; as notas do caso ficam.
        patchCase(caseId, {
          ...freshProgress(),
          status: 'active',
          acceptedAt: now(),
        });
      },

      setNote: (caseId, text) =>
        set((state) => ({ notes: { ...state.notes, [caseId]: text } })),
    };
  });
}

export type GameStore = ReturnType<typeof createGameStore>;

export function useGame<T>(
  store: GameStore,
  selector: (state: GameState) => T,
): T {
  return useStore(store, selector);
}
