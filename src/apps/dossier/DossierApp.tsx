import { Code, PushPin, Trash } from '@phosphor-icons/react';
import { useRef, useState } from 'react';

import {
  caseById,
  gameStore,
  localized,
  useGameState,
} from '@/apps/shared/game';
import type { Evidence } from '@/core/resolution';
import { useLocale, useT } from '@/os/i18n';
import { WindowHeaderItems } from '@/os/windows/header-slots';

import { Timeline } from './Timeline';

function EvidenceCard({
  evidence,
  position,
  onRemove,
}: {
  evidence: Evidence;
  position: number;
  onRemove: (evidence: Evidence) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const count = evidence.rows.length;
  // Trecho de site: guarda [url, texto] na primeira linha.
  const isSite = evidence.source === 'site';
  const [url, passage] = (evidence.rows[0] ?? []) as [string?, string?];

  return (
    <article className="evidence">
      <header className="evidence__header">
        <PushPin weight="fill" aria-hidden className="evidence__pin" />
        <span>
          {isSite
            ? t('dossier.passage')
            : count === 1
              ? t('terminal.rowsOne')
              : t('terminal.rowsMany', { count })}
        </span>
        <time dateTime={evidence.pinnedAt}>
          {t('dossier.pinnedAt', {
            time: new Date(evidence.pinnedAt).toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
            }),
          })}
        </time>
        <button
          type="button"
          className="flat-button flat-button--icon"
          aria-label={t('dossier.remove')}
          title={t('dossier.remove')}
          onClick={() => onRemove(evidence)}
        >
          <Trash aria-hidden />
        </button>
      </header>

      {evidence.sql ? (
        <details className="evidence__sql">
          <summary>
            <Code aria-hidden />
            {t('dossier.showSql')}
          </summary>
          <pre>
            <code>{evidence.sql}</code>
          </pre>
        </details>
      ) : null}

      {isSite ? (
        <blockquote className="evidence__quote">
          <p>{passage}</p>
          <cite>{url}</cite>
        </blockquote>
      ) : (
        <div
          className="evidence__table"
          tabIndex={0}
          role="region"
          aria-label={t('dossier.evidence', { n: position })}
        >
          <table>
            <thead>
              <tr>
                {evidence.columns.map((column, index) => (
                  <th key={`${column}-${index}`} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      data-null={cell === null || undefined}
                      data-number={typeof cell === 'number' || undefined}
                    >
                      {cell === null ? 'NULL' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="evidence__note">
        <span className="sr-only">{t('dossier.note')}</span>
        <textarea
          rows={2}
          placeholder={t('dossier.notePlaceholder')}
          defaultValue={evidence.note ?? ''}
          onBlur={(event) =>
            gameStore
              .getState()
              .setEvidenceNote(evidence.id, event.target.value)
          }
        />
      </label>
    </article>
  );
}

/**
 * Quadro do caso ativo. Mostra o que foi fixado e as anotações do jogador;
 * nunca indica se uma evidência é a certa.
 */
export function DossierApp() {
  const t = useT();
  const locale = useLocale();
  const cases = useGameState((state) => state.cases);
  const allEvidence = useGameState((state) => state.evidence);
  const [removed, setRemoved] = useState<Evidence | null>(null);
  const [view, setView] = useState<'board' | 'timeline'>('board');
  const undoTimer = useRef<number | undefined>(undefined);

  // O caso em andamento (ou o último resolvido), em ordem de caso.
  const caseId = Object.entries(cases)
    .filter(([, progress]) => progress.status !== 'available')
    .map(([id]) => id)
    .sort()
    .at(-1);
  const bundle = caseId ? caseById.get(caseId) : undefined;

  if (!caseId || !bundle) {
    return (
      <div className="status-page">
        <PushPin weight="duotone" className="status-page__glyph" aria-hidden />
        <h2>{t('app.dossier')}</h2>
        <p>{t('dossier.noCase')}</p>
      </div>
    );
  }

  const evidence = allEvidence.filter((item) => item.caseId === caseId);

  function remove(item: Evidence) {
    gameStore.getState().removeEvidence(item.id);
    setRemoved(item);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setRemoved(null), 6000);
  }

  return (
    <div
      className="dossier"
      tabIndex={0}
      role="region"
      aria-label={t('dossier.region')}
    >
      <header className="dossier__header">
        <div>
          <p className="dossier__client">{bundle.manifest.client}</p>
          <h2>{localized(bundle.manifest.title, locale)}</h2>
        </div>
        <span className="dossier__count">
          {evidence.length === 1
            ? t('dossier.countOne')
            : t('dossier.countMany', { count: evidence.length })}
        </span>
      </header>

      <WindowHeaderItems side="end">
        <div
          className="segmented"
          role="tablist"
          aria-label={t('dossier.view')}
        >
          {(['board', 'timeline'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
            >
              {t(`dossier.view.${value}`)}
            </button>
          ))}
        </div>
      </WindowHeaderItems>

      {view === 'timeline' && evidence.length > 0 ? (
        <Timeline evidence={evidence} />
      ) : evidence.length === 0 ? (
        <div className="status-page status-page--inline">
          <PushPin
            weight="duotone"
            className="status-page__glyph"
            aria-hidden
          />
          <h3>{t('dossier.emptyTitle')}</h3>
          <p>{t('dossier.emptyBody')}</p>
        </div>
      ) : (
        <div className="dossier__board">
          {evidence.map((item, index) => (
            <EvidenceCard
              key={item.id}
              evidence={item}
              position={index + 1}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      {removed ? (
        <div className="toast" role="status">
          <span>{t('dossier.removed')}</span>
          <button
            type="button"
            className="flat-button"
            onClick={() => {
              gameStore.getState().restoreEvidence(removed);
              setRemoved(null);
            }}
          >
            {t('dossier.undo')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
