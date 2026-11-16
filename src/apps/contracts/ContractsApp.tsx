import { LockSimple, Star } from '@phosphor-icons/react';
import { useState } from 'react';

import {
  caseBundles,
  gameStore,
  localized,
  officialCaseIds,
  useGameState,
} from '@/apps/shared/game';
import { helpTopics } from '@/content/help';
import type { CaseBundle } from '@/core/case-schema';
import type { Locale } from '@/core/i18n';
import { completeness } from '@/core/resolution';
import { play } from '@/os/audio';
import { ConfirmDialog } from '@/os/dialog/ConfirmDialog';
import { useLocale, useT } from '@/os/i18n';
import type { CaseProgress } from '@/store/game-store';
import { windowStore } from '@/store/window-store';

type Status = CaseProgress['status'] | 'locked';

/** Nome do conceito como a Ajuda o chama ("Datas", não "DATES"); a parte antes do ":". */
function conceptName(concept: string, locale: Locale) {
  const topic = helpTopics.find((item) => item.concept === concept);
  return topic ? localized(topic.title, locale).split(':')[0] : concept;
}

function openMail() {
  windowStore
    .getState()
    .openApp('mail', { width: window.innerWidth, height: window.innerHeight });
  play('open');
}

/** Três estrelas, cheias até `count`. O número vai por extenso para leitores de tela. */
function Stars({ count, label }: { count: number; label: string }) {
  return (
    <span className="contracts__stars" role="img" aria-label={label}>
      {[1, 2, 3].map((n) => (
        <Star key={n} weight={n <= count ? 'fill' : 'regular'} aria-hidden />
      ))}
    </span>
  );
}

function ContractRow({
  bundle,
  status,
  progress,
  onReplay,
}: {
  bundle: CaseBundle;
  status: Status;
  progress: CaseProgress | undefined;
  onReplay: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { manifest, resolution } = bundle;

  if (status === 'locked') {
    return (
      <li className="contracts__row" data-status="locked">
        <span className="contracts__number">{manifest.id}</span>
        <div className="contracts__main">
          <strong>{t('contracts.locked')}</strong>
          <span className="contracts__meta">{t('contracts.lockedHint')}</span>
        </div>
        <LockSimple className="contracts__lock" aria-hidden />
      </li>
    );
  }

  const best = progress?.best;
  const current =
    progress && status !== 'available'
      ? completeness(resolution.facts, progress.discoveredFacts)
      : 0;
  const shownCompleteness = Math.max(best?.completeness ?? 0, current);
  const statusLabel = t(`contracts.status.${status}`, {
    attempt: (progress?.attempts ?? 0) + 1,
    max: manifest.maxAttempts,
  });

  return (
    <li className="contracts__row" data-status={status}>
      <span className="contracts__number">{manifest.id}</span>
      <div className="contracts__main">
        <span className="contracts__client">{manifest.client}</span>
        <strong>{localized(manifest.title, locale)}</strong>
        <span className="contracts__meta">
          {t('contracts.meta', {
            difficulty: manifest.difficulty,
            minutes: manifest.estimatedMinutes,
            concepts: manifest.sqlConcepts
              .map((concept) => conceptName(concept, locale))
              .join(', '),
          })}
        </span>
      </div>
      <div className="contracts__result">
        <span className="contracts__status">{statusLabel}</span>
        {best ? (
          <Stars
            count={best.stars}
            label={t('contracts.stars', { count: best.stars })}
          />
        ) : null}
        {shownCompleteness > 0 ? (
          <span className="contracts__completeness">
            {t('contracts.completeness', { value: shownCompleteness })}
          </span>
        ) : null}
      </div>
      <div className="contracts__actions">
        {status === 'solved' ? (
          <button
            type="button"
            className="pill-button pill-button--small"
            onClick={onReplay}
          >
            {t('contracts.replay')}
          </button>
        ) : status === 'failed' ? (
          <button
            type="button"
            className="pill-button pill-button--small"
            onClick={() => {
              gameStore.getState().reopenCase(manifest.id);
              openMail();
            }}
          >
            {t('mail.reopen')}
          </button>
        ) : (
          <button
            type="button"
            className="pill-button pill-button--small"
            onClick={openMail}
          >
            {t('contracts.open')}
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Contratos: todos os casos numa lista, com o estado, a melhor marca e a
 * completude. Casos que ainda não chegaram aparecem trancados, sem título,
 * para não estragar a surpresa.
 */
export function ContractsApp() {
  const t = useT();
  const locale = useLocale();
  const cases = useGameState((state) => state.cases);
  const inbox = useGameState((state) => state.inbox);
  const [replaying, setReplaying] = useState<CaseBundle | null>(null);

  const arrived = (bundle: CaseBundle) =>
    inbox.some(
      (item) =>
        item.caseId === bundle.manifest.id &&
        item.emailId === bundle.manifest.startEmail,
    );
  const statusOf = (bundle: CaseBundle): Status =>
    arrived(bundle)
      ? (cases[bundle.manifest.id]?.status ?? 'available')
      : 'locked';

  const sorted = [...caseBundles].sort(
    (a, b) => a.manifest.order - b.manifest.order,
  );
  const official = sorted.filter((b) => officialCaseIds.has(b.manifest.id));
  const community = sorted.filter((b) => !officialCaseIds.has(b.manifest.id));
  const solved = official.filter((b) => cases[b.manifest.id]?.best).length;
  const stars = official.reduce(
    (sum, b) => sum + (cases[b.manifest.id]?.best?.stars ?? 0),
    0,
  );

  const list = (bundles: CaseBundle[]) => (
    <ol className="boxed-list contracts__list">
      {bundles.map((bundle) => (
        <ContractRow
          key={bundle.manifest.id}
          bundle={bundle}
          status={statusOf(bundle)}
          progress={cases[bundle.manifest.id]}
          onReplay={() => setReplaying(bundle)}
        />
      ))}
    </ol>
  );

  return (
    <div className="contracts">
      <header className="contracts__summary">
        <h2>{t('contracts.title')}</h2>
        <p>
          {t('contracts.summary', {
            solved,
            total: official.length,
            stars,
            maxStars: official.length * 3,
          })}
        </p>
      </header>
      {list(official)}
      {community.length > 0 ? (
        <>
          <h3 className="contracts__group">{t('contracts.community')}</h3>
          {list(community)}
        </>
      ) : null}

      <ConfirmDialog
        open={replaying !== null}
        title={t('contracts.replayTitle')}
        body={t('contracts.replayBody', {
          title: replaying ? localized(replaying.manifest.title, locale) : '',
        })}
        confirmLabel={t('contracts.replay')}
        cancelLabel={t('settings.cancel')}
        onConfirm={() => {
          if (replaying) gameStore.getState().replayCase(replaying.manifest.id);
          setReplaying(null);
          openMail();
        }}
        onCancel={() => setReplaying(null)}
      />
    </div>
  );
}
