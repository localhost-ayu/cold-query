import { useT } from '@/os/i18n';

import { AppIcon } from './AppIcon';

type PlaceholderId = 'notes' | 'help';

/** Página de status (padrão Adwaita) dos apps que ainda não existem: diz o que vai morar ali. */
export function PlaceholderApp({ appId }: { appId: PlaceholderId }) {
  const t = useT();

  return (
    <div className="status-page">
      <AppIcon appId={appId} size={96} />
      <h2>{t(`app.${appId}`)}</h2>
      <p>{t(`placeholder.${appId}`)}</p>
      <span className="status-page__tag">{t('placeholder.eyebrow')}</span>
    </div>
  );
}
