import { cases, databaseLoaders } from 'virtual:cases';

import type { CaseBundle, LocalizedText } from '@/core/case-schema';
import type { Locale } from '@/core/i18n';
import { play } from '@/os/audio';
import {
  createGameStore,
  findEmail,
  useGame,
  type GameStore,
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
  onDeliver: (item, bundle) => {
    const email = findEmail(
      bundle,
      item.emailId,
      preferencesStore.getState().locale,
    );
    if (!email) return;
    shellStore.getState().notify({
      appId: 'mail',
      sender: email.from.name,
      body: email.subject,
    });
    play('mail');
  },
});

export function useGameState<T>(
  selector: (state: ReturnType<GameStore['getState']>) => T,
): T {
  return useGame(gameStore, selector);
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
