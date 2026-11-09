import { cases, databaseLoaders } from 'virtual:cases';

import { tutorialChallenges, tutorialEmails } from '@/content/tutorial';
import type { CaseBundle, CaseSite, LocalizedText } from '@/core/case-schema';
import type { Locale } from '@/core/i18n';
import { play } from '@/os/audio';
import {
  TUTORIAL_CASE_ID,
  createGameStore,
  findEmail,
  useGame,
  type GameStore,
  type InboxItem,
} from '@/store/game-store';
import { preferencesStore } from '@/store/preferences-store';
import { shellStore } from '@/store/shell-store';

/**
 * Liga o estado do jogo ao resto do TraceOS: os casos vêm do build
 * (`virtual:cases`) e cada e-mail entregue vira banner e som de e-mail.
 */
export const caseBundles: CaseBundle[] = cases;

export const caseById = new Map(
  caseBundles.map((bundle) => [bundle.manifest.id, bundle]),
);

export const gameStore: GameStore = createGameStore(caseBundles, {
  tutorialSteps: tutorialChallenges.length,
  onDeliver: (item) => {
    const mail = resolveMail(item, preferencesStore.getState().locale);
    if (!mail) return;
    shellStore.getState().notify({
      appId: 'mail',
      sender: mail.from.name,
      body: mail.subject,
    });
    play('mail');
  },
});

export function useGameState<T>(
  selector: (state: ReturnType<GameStore['getState']>) => T,
): T {
  return useGame(gameStore, selector);
}

/** Uma mensagem pronta para o Mail, venha de um caso ou do treinamento. */
export interface MailView {
  from: { name: string; address: string; role: string };
  subject: string;
  /** Data fictícia da história (ISO com fuso). */
  date: string;
  html: string;
  kind: 'brief' | 'info' | 'outcome';
  attachments: string[];
  /** Presente nos e-mails do treinamento. */
  tutorial?: 'welcome' | 'done';
}

// As mensagens do treinamento chegam na manhã do primeiro contrato.
const tutorialDates = {
  welcome: '2026-03-16T09:30:00-03:00',
  done: '2026-03-16T10:05:00-03:00',
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function resolveMail(item: InboxItem, locale: Locale): MailView | null {
  if (item.caseId === TUTORIAL_CASE_ID) {
    const email = tutorialEmails[item.emailId as 'welcome' | 'done'];
    if (!email) return null;
    return {
      from: { ...email.from, role: localized(email.from.role, locale) },
      subject: localized(email.subject, locale),
      date: tutorialDates[email.id],
      html: email.paragraphs
        .map(
          (paragraph) => `<p>${escapeHtml(localized(paragraph, locale))}</p>`,
        )
        .join(''),
      kind: 'info',
      attachments: [],
      tutorial: email.id,
    };
  }
  const bundle = caseById.get(item.caseId);
  const email = bundle ? findEmail(bundle, item.emailId, locale) : undefined;
  if (!email) return null;
  return {
    from: email.from,
    subject: email.subject,
    date: email.date,
    html: email.html,
    kind: email.kind,
    attachments: email.attachments,
  };
}

/** Texto do caso no idioma do jogador, com pt-BR de reserva. */
export function localized(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text['pt-BR'];
}

/** Banco de um caso no Terminal: "001:main". */
export const caseDatabaseId = (caseId: string, dbId: string) =>
  `${caseId}:${dbId}`;

export function loadCaseDatabase(databaseId: string): Promise<string> {
  const loader = databaseLoaders[databaseId];
  if (!loader)
    return Promise.reject(new Error(`banco ${databaseId} não existe`));
  return loader();
}

/** Página de intranet de um caso, no idioma pedido (com pt-BR de reserva). */
export interface SiteEntry {
  caseId: string;
  site: CaseSite;
}

export function sitesFor(caseIds: string[], locale: Locale): SiteEntry[] {
  return caseIds.flatMap((caseId) => {
    const bundle = caseById.get(caseId);
    if (!bundle) return [];
    const ids = [...new Set(bundle.sites.map((site) => site.id))];
    return ids.flatMap((id) => {
      const site =
        bundle.sites.find((s) => s.id === id && s.locale === locale) ??
        bundle.sites.find((s) => s.id === id && s.locale === 'pt-BR');
      return site ? [{ caseId, site }] : [];
    });
  });
}
