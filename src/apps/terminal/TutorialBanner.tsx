import { CheckCircle, GraduationCap, Lightbulb } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { gameStore, localized, useGameState } from '@/apps/shared/game';
import { trainingDatabase } from '@/content/databases/training';
import { tutorialChallenges } from '@/content/tutorial';
import type { QueryResult } from '@/core/sql/types';
import { checkChallenge } from '@/core/tutorial';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';

interface TutorialBannerProps {
  dbId: string;
  result: QueryResult | null;
  onUseTraining: () => void;
}

/**
 * Faixa do treinamento no topo do Terminal (como um AdwBanner): mostra o
 * exercício atual e confere cada resultado novo. Acertou, avança sozinho.
 */
export function TutorialBanner({
  dbId,
  result,
  onUseTraining,
}: TutorialBannerProps) {
  const t = useT();
  const locale = useLocale();
  const tutorial = useGameState((state) => state.tutorial);
  const [hintFor, setHintFor] = useState<number | null>(null);
  const checked = useRef<QueryResult | null>(null);
  const active = tutorial.status === 'active';
  const onTraining = dbId === trainingDatabase.id;
  const challenge = tutorialChallenges[tutorial.step];
  const total = tutorialChallenges.length;

  // Cada resultado novo da base de treino é conferido uma vez contra o exercício atual.
  useEffect(() => {
    if (!active || !onTraining || !result || !challenge) return;
    if (checked.current === result) return;
    checked.current = result;
    if (checkChallenge(challenge, result)) {
      gameStore.getState().completeTutorialStep(tutorial.step);
      play('success');
    }
  }, [active, onTraining, result, challenge, tutorial.step]);

  if (!active || !challenge) return null;

  if (!onTraining) {
    return (
      <div
        className="tutorial-banner"
        role="region"
        aria-label={t('tutorial.label')}
      >
        <GraduationCap
          weight="duotone"
          aria-hidden
          className="tutorial-banner__icon"
        />
        <p className="tutorial-banner__task">{t('tutorial.needTraining')}</p>
        <button
          type="button"
          className="pill-button pill-button--small"
          onClick={onUseTraining}
        >
          {t('tutorial.useTraining')}
        </button>
      </div>
    );
  }

  const showHint = hintFor === tutorial.step;
  return (
    // key: trocar de exercício remonta a faixa e toca a animação de entrada de novo.
    <div
      key={tutorial.step}
      className="tutorial-banner"
      role="region"
      aria-label={t('tutorial.label')}
    >
      <GraduationCap
        weight="duotone"
        aria-hidden
        className="tutorial-banner__icon"
      />
      <div className="tutorial-banner__body">
        <p className="tutorial-banner__meta">
          <span>
            {t('tutorial.progress', { step: tutorial.step + 1, total })}
          </span>
          <span className="tutorial-banner__concept">{challenge.concept}</span>
          {tutorial.step > 0 ? (
            <span className="tutorial-banner__solved" role="status">
              <CheckCircle weight="fill" aria-hidden />
              {t('tutorial.solvedCount', { count: tutorial.step, total })}
            </span>
          ) : null}
        </p>
        <p className="tutorial-banner__task">
          {localized(challenge.task, locale)}
        </p>
        {showHint ? (
          <p className="tutorial-banner__hint">
            {localized(challenge.hint, locale)}
          </p>
        ) : null}
      </div>
      <div className="tutorial-banner__actions">
        <button
          type="button"
          className="flat-button"
          aria-expanded={showHint}
          onClick={() => setHintFor(showHint ? null : tutorial.step)}
        >
          <Lightbulb weight={showHint ? 'fill' : 'regular'} aria-hidden />
          {t(showHint ? 'tutorial.hideHint' : 'tutorial.showHint')}
        </button>
        <button
          type="button"
          className="flat-button"
          onClick={() => gameStore.getState().skipTutorial()}
        >
          {t('tutorial.skipShort')}
        </button>
      </div>
    </div>
  );
}
