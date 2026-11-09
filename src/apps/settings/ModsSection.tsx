import { PuzzlePiece, Trash, UploadSimple } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useStore } from 'zustand';

import { localized } from '@/apps/shared/game';
import {
  installDbcase,
  modsStore,
  uninstallCase,
  type InstallResult,
} from '@/apps/shared/mods';
import type { MessageKey } from '@/core/i18n';
import { play } from '@/os/audio';
import { ConfirmDialog } from '@/os/dialog/ConfirmDialog';
import { useLocale, useT } from '@/os/i18n';

type Failure = Extract<InstallResult, { ok: false }>;

const failureKeys: Record<Failure['reason'], MessageKey> = {
  tooLarge: 'mods.error.tooLarge',
  notZip: 'mods.error.notZip',
  badPath: 'mods.error.badPath',
  unexpectedFile: 'mods.error.unexpectedFile',
  notText: 'mods.error.notText',
  tooManyFiles: 'mods.error.tooManyFiles',
  noCase: 'mods.error.noCase',
  invalid: 'mods.error.invalid',
  official: 'mods.error.official',
  unsolvable: 'mods.error.unsolvable',
  storage: 'mods.error.storage',
};

type Status =
  | { kind: 'working' }
  | { kind: 'ok'; title: string; replaced: boolean }
  | { kind: 'error'; failure: Failure }
  | null;

/** Casos importados (.dbcase): instalar, ver e remover. */
export function ModsSection() {
  const t = useT();
  const locale = useLocale();
  const mods = useStore(modsStore, (state) => state.mods);
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function install(file: File) {
    setStatus({ kind: 'working' });
    const result = await installDbcase(file);
    if (result.ok) {
      setStatus({
        kind: 'ok',
        title: localized(result.bundle.manifest.title, locale),
        replaced: result.replaced,
      });
      play('success');
    } else {
      setStatus({ kind: 'error', failure: result });
      play('error');
    }
  }

  const toRemove = mods.find((mod) => mod.id === removing);

  return (
    <section className="settings__group">
      <h2>{t('mods.title')}</h2>
      <div className="settings__row">
        <div className="settings__label">
          <span>{t('mods.install')}</span>
          <small>{t('mods.installHint')}</small>
        </div>
        <button
          type="button"
          className="pill-button pill-button--small"
          disabled={status?.kind === 'working'}
          onClick={() => input.current?.click()}
        >
          <UploadSimple weight="bold" aria-hidden />
          {t('mods.installAction')}
        </button>
        <input
          ref={input}
          type="file"
          accept=".dbcase,application/zip"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void install(file);
          }}
        />
      </div>
      {mods.map(({ id, bundle }) => (
        <div className="settings__row" key={id}>
          <div className="settings__label">
            <span>
              <PuzzlePiece
                weight="duotone"
                aria-hidden
                className="mods__icon"
              />
              {id} · {localized(bundle.manifest.title, locale)}
            </span>
            <small>
              {t('mods.byline', {
                author: bundle.manifest.author,
                license: bundle.manifest.license,
              })}
            </small>
          </div>
          <button
            type="button"
            className="flat-button flat-button--icon"
            aria-label={t('mods.remove', { id })}
            title={t('mods.remove', { id })}
            onClick={() => setRemoving(id)}
          >
            <Trash aria-hidden />
          </button>
        </div>
      ))}

      {status ? (
        <div
          className={`settings__feedback settings__feedback--${status.kind === 'error' ? 'error' : 'ok'}`}
          role={status.kind === 'error' ? 'alert' : 'status'}
        >
          {status.kind === 'working' ? (
            <>
              <span className="spinner spinner--small" aria-hidden />{' '}
              {t('mods.working')}
            </>
          ) : status.kind === 'ok' ? (
            t(status.replaced ? 'mods.replaced' : 'mods.installed', {
              title: status.title,
            })
          ) : (
            <>
              {t(failureKeys[status.failure.reason], {
                detail: status.failure.detail,
              })}
              {status.failure.reason === 'invalid' ||
              status.failure.reason === 'unsolvable' ? (
                <pre className="mods__detail">{status.failure.detail}</pre>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <p className="mods__note">{t('mods.note')}</p>

      <ConfirmDialog
        open={toRemove !== undefined}
        title={t('mods.removeTitle')}
        body={t('mods.removeBody', {
          title: toRemove
            ? localized(toRemove.bundle.manifest.title, locale)
            : '',
        })}
        confirmLabel={t('mods.removeConfirm')}
        cancelLabel={t('settings.cancel')}
        destructive
        onConfirm={() => {
          const id = removing;
          setRemoving(null);
          if (id) void uninstallCase(id).then(() => setStatus(null));
        }}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
