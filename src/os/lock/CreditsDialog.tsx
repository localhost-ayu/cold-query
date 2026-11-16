import { useEffect, useId, useRef } from 'react';

import { brand } from '@/config/brand';
import { thirdPartyCredits } from '@/content/credits';
import { useT } from '@/os/i18n';

/** Quem fez o jogo e o que ele usa de terceiros. Diálogo nativo: prende o foco e fecha com Esc. */
export function CreditsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="adw-dialog credits"
      aria-labelledby={titleId}
      onClose={() => open && onClose()}
    >
      <header className="adw-dialog__header">
        <span />
        <h2 id={titleId}>{t('lock.credits')}</h2>
        <button type="button" className="flat-button" onClick={onClose}>
          {t('lock.close')}
        </button>
      </header>
      <div className="adw-dialog__body credits__body">
        <section className="credits__game">
          <p className="credits__name">{brand.gameName}</p>
          <p className="credits__tagline">{brand.tagline}</p>
          <p>
            {t('lock.createdBy', { author: brand.author })}
            <br />
            {t('lock.license', { license: brand.license })}
          </p>
          <a href={brand.links.repository} target="_blank" rel="noreferrer">
            {t('lock.repository')}
          </a>
        </section>

        <section>
          <h3>{t('lock.thirdParty')}</h3>
          <ul className="credits__list">
            {thirdPartyCredits.map((entry) => (
              <li key={entry.name}>
                <a href={entry.url} target="_blank" rel="noreferrer">
                  {entry.name}
                </a>
                <span>
                  {entry.author} · {entry.license}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="credits__note">{t('lock.creditsNote')}</p>
      </div>
    </dialog>
  );
}
