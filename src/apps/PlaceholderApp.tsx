import { useT } from '@/os/i18n';

import { appIcons } from './icons';

type PlaceholderId = 'mail' | 'dossier' | 'notes' | 'help';

/** Tela dos apps que ainda não existem: diz o que vai morar ali. */
export function PlaceholderApp({ appId }: { appId: PlaceholderId }) {
  const t = useT();
  const AppIcon = appIcons[appId];

  return (
    <div className="placeholder">
      <span className={`placeholder__icon dock__icon--${appId}`}>
        <AppIcon weight="duotone" aria-hidden />
      </span>
      <p className="eyebrow">{t('placeholder.eyebrow')}</p>
      <h2>{t(`app.${appId}`)}</h2>
      <p>{t(`placeholder.${appId}`)}</p>
    </div>
  );
}
