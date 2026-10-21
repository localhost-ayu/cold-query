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

interface GameState {
  cases: Record<string, CaseProgress>;
  inbox: InboxItem[];
  evidence: Evidence[];
  notes: Record<string, string>;
  started: boolean;
  start: () => void;
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
  onDeliver?: (item: InboxItem, bundle: CaseBundle) => void;
  now?: () => number;
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
  { onDeliver, now = Date.now }: GameStoreOptions = {},
) {
  const byId = new Map(bundles.map((bundle) => [bundle.manifest.id, bundle]));
  let counter = 0;

  return createStore<GameState>((set, get) => {
    /** Entrega e-mails (ids únicos por e-mail de pt-BR) e avisa quem estiver ouvindo. */
    function deliver(
      caseId: string,
      emailIds: string[],
      verdict?: InboxItem['verdict'],
    ) {
      const bundle = byId.get(caseId);
      if (!bundle || emailIds.length === 0) return;
      const items = emailIds.map((emailId): InboxItem => {
        counter += 1;
        return {
          id: `m-${counter}`,
          caseId,
          emailId,
          deliveredAt: now(),
          read: false,
          verdict,
        };
      });
      set((state) => ({ inbox: [...items, ...state.inbox] }));
      for (const item of items) onDeliver?.(item, bundle);
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
      cases: Object.fromEntries(
        bundles.map((bundle) => [bundle.manifest.id, freshProgress()]),
      ),
      inbox: [],
      evidence: [],
      notes: {},
      started: false,

      start: () => {
        if (get().started) return;
        set({ started: true });
        const first = [...bundles].sort(
          (a, b) => a.manifest.order - b.manifest.order,
        )[0];
        if (first) deliver(first.manifest.id, [first.manifest.startEmail]);
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
        counter += 1;
        const evidence: Evidence = {
          ...input,
          id: `ev-${counter}`,
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
