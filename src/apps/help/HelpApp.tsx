import {
  BookOpen,
  Keyboard,
  Lightbulb,
  LockSimple,
  Play,
  Question,
} from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';

import {
  caseBundles,
  caseById,
  localized,
  useGameState,
} from '@/apps/shared/game';
import { terminalStore } from '@/apps/terminal/session';
import { trainingDatabase } from '@/content/databases/training';
import { helpTopics } from '@/content/help';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { windowStore } from '@/store/window-store';

type Page = 'how' | 'hints' | 'keys' | `topic:${string}`;

/**
 * Conceitos abertos: os dos casos até o contrato mais adiantado já aceito, e
 * sempre os do primeiro caso (que o treinamento também cobre).
 */
function useUnlockedConcepts(): Set<string> {
  const cases = useGameState((state) => state.cases);
  const ordered = [...caseBundles].sort(
    (a, b) => a.manifest.order - b.manifest.order,
  );
  const reached = Math.max(
    ordered[0]?.manifest.order ?? 0,
    ...ordered
      .filter((bundle) => cases[bundle.manifest.id]?.status !== 'available')
      .map((bundle) => bundle.manifest.order),
  );
  return new Set(
    ordered
      .filter((bundle) => bundle.manifest.order <= reached)
      .flatMap((bundle) => bundle.manifest.sqlConcepts),
  );
}

/** Abre o exemplo numa aba nova do Terminal, na base de treino. */
function tryExample(sql: string) {
  const store = terminalStore.getState();
  store.addTab();
  const { activeTabId } = terminalStore.getState();
  store.setDatabase(activeTabId, trainingDatabase.id);
  terminalStore.getState().setSql(activeTabId, sql);
  windowStore.getState().openApp('terminal', {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  play('open');
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function HelpApp() {
  const t = useT();
  const locale = useLocale();
  const unlocked = useUnlockedConcepts();
  const cases = useGameState((state) => state.cases);
  const [page, setPage] = useState<Page>('how');

  const topics = helpTopics.filter((topic) => unlocked.has(topic.concept));
  // Tópicos de contratos que ainda não chegaram: só o título, trancado, como mapa do currículo.
  const locked = helpTopics.filter((item) => !unlocked.has(item.concept));
  const topic = page.startsWith('topic:')
    ? topics.find((item) => `topic:${item.concept}` === page)
    : undefined;

  const revealed = Object.entries(cases).flatMap(([caseId, progress]) => {
    const bundle = caseById.get(caseId);
    if (!bundle || progress.hintsRevealed === 0) return [];
    return bundle.manifest.hints
      .slice(0, progress.hintsRevealed)
      .map((hint) => ({
        caseId,
        client: bundle.manifest.client,
        text: localized(hint.text, locale),
        id: hint.id,
      }));
  });

  const nav = (id: Page, icon: ReactNode, label: string) => (
    <li key={id}>
      <button
        type="button"
        className="help__link"
        aria-current={page === id || undefined}
        onClick={() => setPage(id)}
      >
        {icon}
        <span>{label}</span>
      </button>
    </li>
  );

  return (
    <div className="help">
      <nav className="help__nav" aria-label={t('help.contents')}>
        <ul>
          {nav('how', <Question weight="duotone" aria-hidden />, t('help.how'))}
          {nav(
            'hints',
            <Lightbulb weight="duotone" aria-hidden />,
            t('help.hints'),
          )}
          {nav(
            'keys',
            <Keyboard weight="duotone" aria-hidden />,
            t('help.keys'),
          )}
        </ul>
        <h2 className="help__heading">{t('help.guide')}</h2>
        <ul>
          {topics.map((item) =>
            nav(
              `topic:${item.concept}`,
              <BookOpen weight="duotone" aria-hidden />,
              localized(item.title, locale),
            ),
          )}
          {locked.map((item) => (
            <li
              key={item.concept}
              className="help__locked"
              title={t('help.lockedHint')}
            >
              <LockSimple weight="bold" aria-hidden />
              <span>{localized(item.title, locale)}</span>
              <span className="sr-only">{t('help.lockedHint')}</span>
            </li>
          ))}
        </ul>
      </nav>

      <article
        className="help__page"
        tabIndex={0}
        role="region"
        aria-label={t('help.page')}
      >
        {topic ? (
          <>
            <p className="help__concept">{topic.concept}</p>
            <h2>{localized(topic.title, locale)}</h2>
            <p className="help__summary">{localized(topic.summary, locale)}</p>
            {topic.body.map((paragraph, index) => (
              <p key={index}>{localized(paragraph, locale)}</p>
            ))}
            {topic.example ? (
              <figure className="help__example">
                <pre>
                  <code>{topic.example}</code>
                </pre>
                <figcaption>
                  <button
                    type="button"
                    className="pill-button pill-button--small"
                    onClick={() => tryExample(topic.example!)}
                  >
                    <Play weight="fill" aria-hidden />
                    {t('help.tryIt')}
                  </button>
                  <span>{t('help.tryItHint')}</span>
                </figcaption>
              </figure>
            ) : null}
          </>
        ) : page === 'hints' ? (
          <>
            <h2>{t('help.hints')}</h2>
            {revealed.length === 0 ? (
              <p className="help__summary">{t('help.noHints')}</p>
            ) : (
              <ol className="help__hints">
                {revealed.map((hint) => (
                  <li key={`${hint.caseId}-${hint.id}`}>
                    <span className="help__hint-client">{hint.client}</span>
                    {hint.text}
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : page === 'keys' ? (
          <>
            <h2>{t('help.keys')}</h2>
            <dl className="help__keys">
              <dt>
                <Kbd>Ctrl</Kbd> <Kbd>Enter</Kbd>
              </dt>
              <dd>{t('help.keyRun')}</dd>
              <dt>
                <Kbd>Super</Kbd> / <Kbd>Alt</Kbd> <Kbd>F1</Kbd>
              </dt>
              <dd>{t('help.keyOverview')}</dd>
              <dt>
                <Kbd>Alt</Kbd> <Kbd>Tab</Kbd>
              </dt>
              <dd>{t('help.keyCycle')}</dd>
              <dt>
                <Kbd>Super</Kbd> / <Kbd>Alt</Kbd> <Kbd>Shift</Kbd> +{' '}
                <Kbd>←</Kbd> <Kbd>→</Kbd>
              </dt>
              <dd>{t('help.keySnap')}</dd>
              <dt>
                <Kbd>Super</Kbd> / <Kbd>Alt</Kbd> <Kbd>Shift</Kbd> +{' '}
                <Kbd>↑</Kbd> <Kbd>↓</Kbd>
              </dt>
              <dd>{t('help.keyMaximize')}</dd>
              <dt>
                <Kbd>Super</Kbd> / <Kbd>Alt</Kbd> <Kbd>Shift</Kbd> +{' '}
                <Kbd>L</Kbd>
              </dt>
              <dd>{t('help.keyLock')}</dd>
              <dt>
                <Kbd>Esc</Kbd>
              </dt>
              <dd>{t('help.keyEscape')}</dd>
            </dl>
          </>
        ) : (
          <>
            <h2>{t('help.how')}</h2>
            <ol className="help__steps">
              <li>{t('help.step1')}</li>
              <li>{t('help.step2')}</li>
              <li>{t('help.step3')}</li>
              <li>{t('help.step4')}</li>
              <li>{t('help.step5')}</li>
            </ol>
            <p className="help__summary">{t('help.stars')}</p>
          </>
        )}
      </article>
    </div>
  );
}
