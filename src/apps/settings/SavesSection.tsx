import { DownloadSimple, Trash, UploadSimple } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useStore } from 'zustand';

import { gameStore } from '@/apps/shared/game';
import { deliverImportedContracts } from '@/apps/shared/mods';
import { currentViewport, persistence } from '@/apps/shared/persistence';
import type { MessageKey } from '@/core/i18n';
import { play } from '@/os/audio';
import { ConfirmDialog } from '@/os/dialog/ConfirmDialog';
import { useLocale, useT } from '@/os/i18n';

type Pending = { kind: 'import'; text: string } | { kind: 'reset' } | null;
type Feedback = { tone: 'ok' | 'error'; key: MessageKey } | null;

const importErrors: Record<'invalid' | 'newer' | 'tooLarge', MessageKey> = {
  invalid: 'settings.importInvalid',
  newer: 'settings.importNewer',
  tooLarge: 'settings.importTooLarge',
};

/** Baixa um texto como arquivo: cria um link temporário e clica nele. */
function download(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function SavesSection() {
  const t = useT();
  const locale = useLocale();
  const status = useStore(persistence.status);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const autosaveText = !status.available
    ? t('settings.saveUnavailable')
    : status.lastSavedAt
      ? t('settings.savedAt', {
          time: new Date(status.lastSavedAt).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      : t('settings.notSaved');

  async function confirm() {
    const action = pending;
    setPending(null);
    if (action?.kind === 'import') {
      const result = await persistence.importText(
        action.text,
        currentViewport(),
      );
      setFeedback(
        result.ok
          ? { tone: 'ok', key: 'settings.imported' }
          : { tone: 'error', key: importErrors[result.reason] },
      );
      play(result.ok ? 'success' : 'error');
    }
    if (action?.kind === 'reset') {
      await persistence.reset();
      setFeedback({ tone: 'ok', key: 'settings.resetDone' });
      // Jogo novo: o primeiro contrato (e os de casos importados) chega de novo.
      gameStore.getState().start();
      deliverImportedContracts();
    }
  }

  return (
    <section className="settings__group">
      <h2>{t('settings.saves')}</h2>
      <div className="settings__row">
        <div className="settings__label">
          <span>{t('settings.autosave')}</span>
          <small data-warning={!status.available || undefined}>
            {autosaveText}
          </small>
        </div>
      </div>
      <div className="settings__row">
        <div className="settings__label">
          <span>{t('settings.export')}</span>
          <small>{t('settings.exportHint')}</small>
        </div>
        <button
          type="button"
          className="pill-button pill-button--small"
          onClick={() =>
            download(
              persistence.exportText(),
              `cold-query-save-${new Date().toISOString().slice(0, 10)}.json`,
            )
          }
        >
          <DownloadSimple weight="bold" aria-hidden />
          {t('settings.exportAction')}
        </button>
      </div>
      <div className="settings__row">
        <div className="settings__label">
          <span>{t('settings.import')}</span>
          <small>{t('settings.importHint')}</small>
        </div>
        <button
          type="button"
          className="pill-button pill-button--small"
          onClick={() => fileInput.current?.click()}
        >
          <UploadSimple weight="bold" aria-hidden />
          {t('settings.importAction')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) setPending({ kind: 'import', text: await file.text() });
          }}
        />
      </div>
      <div className="settings__row">
        <div className="settings__label">
          <span>{t('settings.reset')}</span>
          <small>{t('settings.resetHint')}</small>
        </div>
        <button
          type="button"
          className="pill-button pill-button--small pill-button--destructive"
          onClick={() => setPending({ kind: 'reset' })}
        >
          <Trash weight="bold" aria-hidden />
          {t('settings.resetAction')}
        </button>
      </div>

      {feedback ? (
        <p
          className={`settings__feedback settings__feedback--${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {t(feedback.key)}
        </p>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={t(
          pending?.kind === 'import'
            ? 'settings.importTitle'
            : 'settings.resetTitle',
        )}
        body={t(
          pending?.kind === 'import'
            ? 'settings.importBody'
            : 'settings.resetBody',
        )}
        confirmLabel={t(
          pending?.kind === 'import'
            ? 'settings.importConfirm'
            : 'settings.resetConfirm',
        )}
        cancelLabel={t('settings.cancel')}
        destructive
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
