import { Lightbulb } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';

import {
  caseById,
  gameStore,
  localized,
  useGameState,
} from '@/apps/shared/game';
import { availableHints } from '@/core/resolution';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';

interface ReportDialogProps {
  caseId: string;
  open: boolean;
  onClose: (sent: boolean) => void;
}

/**
 * Relatório do caso, num diálogo modal (o <dialog> nativo já prende o foco e
 * fecha com Esc). Mostra só as opções que o dossiê liberou, sem dizer quantas
 * faltam.
 */
export function ReportDialog({ caseId, open, onClose }: ReportDialogProps) {
  const t = useT();
  const locale = useLocale();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [sending, setSending] = useState(false);
  const bundle = caseById.get(caseId);
  const progress = useGameState((state) => state.cases[caseId]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  if (!bundle || !progress) return null;
  const { manifest, resolution } = bundle;
  const complete = resolution.report.slots.every(
    (slot) => progress.selection[slot.id],
  );
  const hints = manifest.hints.slice(0, progress.hintsRevealed);
  const available = availableHints(manifest.hints, progress.wrongAttempts);
  const moreHints = progress.hintsRevealed < available;
  // Há dica guardada para depois de um erro: avisa, sem dizer o que ela diz.
  const lockedHint = available < manifest.hints.length;

  async function submit() {
    setSending(true);
    const verdict = await gameStore.getState().submitReport(caseId);
    setSending(false);
    play(verdict === 'correct' ? 'success' : 'failure');
    onClose(true);
  }

  return (
    <dialog
      ref={dialog}
      className="adw-dialog"
      aria-labelledby={titleId}
      onClose={() => open && onClose(false)}
    >
      <header className="adw-dialog__header">
        <button
          type="button"
          className="flat-button"
          onClick={() => onClose(false)}
        >
          {t('report.cancel')}
        </button>
        <h2 id={titleId}>{t('report.title', { client: manifest.client })}</h2>
        <button
          type="button"
          className="pill-button pill-button--suggested pill-button--small"
          disabled={!complete || sending}
          onClick={() => void submit()}
        >
          {t('report.submit')}
        </button>
      </header>

      <div className="adw-dialog__body">
        <p className="report__intro">
          {t('report.intro')}{' '}
          <strong>
            {t('report.attempt', {
              current: progress.attempts + 1,
              max: manifest.maxAttempts,
            })}
          </strong>
        </p>

        {resolution.report.slots.map((slot) => {
          const unlocked = slot.options.filter((option) =>
            progress.unlockedOptions[slot.id]?.includes(option.id),
          );
          return (
            <fieldset key={slot.id} className="report__slot">
              <legend>{localized(slot.label, locale)}</legend>
              {unlocked.length === 0 ? (
                <p className="report__empty">{t('report.noOptions')}</p>
              ) : (
                <div className="boxed-list">
                  {unlocked.map((option) => (
                    <label key={option.id} className="boxed-list__row">
                      <input
                        type="radio"
                        name={`${caseId}-${slot.id}`}
                        checked={progress.selection[slot.id] === option.id}
                        onChange={() =>
                          gameStore
                            .getState()
                            .selectOption(caseId, slot.id, option.id)
                        }
                      />
                      <span>{localized(option.label, locale)}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          );
        })}

        <section className="report__hints" aria-label={t('report.hints')}>
          <h3>{t('report.hints')}</h3>
          {hints.length > 0 ? (
            <ol>
              {hints.map((hint) => (
                <li key={hint.id}>{localized(hint.text, locale)}</li>
              ))}
            </ol>
          ) : null}
          {moreHints ? (
            <div className="report__hint-action">
              <button
                type="button"
                className="pill-button pill-button--small"
                onClick={() => gameStore.getState().revealHint(caseId)}
              >
                <Lightbulb weight="fill" aria-hidden />
                {t('report.hint')}
              </button>
              <span>{t('report.hintCost')}</span>
            </div>
          ) : lockedHint ? (
            <p className="report__empty">{t('report.hintAfterAttempt')}</p>
          ) : (
            <p className="report__empty">{t('report.noMoreHints')}</p>
          )}
        </section>
      </div>
    </dialog>
  );
}
