import { X } from '@phosphor-icons/react';
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';

import { AppIcon } from '@/apps/AppIcon';
import { useT } from '@/os/i18n';
import { motionTokens } from '@/os/motion';
import { shellStore, useShell } from '@/store/shell-store';
import { windowStore } from '@/store/window-store';

const BANNER_MS = 6000;

/** Banner de notificação no topo, como o do GNOME. Some sozinho; parar o mouse em cima segura. */
export function NotificationBanner() {
  const t = useT();
  const notification = useShell((state) =>
    state.notifications.find((item) => item.id === state.bannerId),
  );
  const [hovered, setHovered] = useState(false);
  // Nas Atividades o banner sai do caminho da busca; continua na lista do relógio.
  const overviewOpen = useShell((state) => state.overviewOpen);

  useEffect(() => {
    if (!notification || hovered) return;
    const timer = window.setTimeout(
      () => shellStore.getState().dismissBanner(),
      BANNER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [notification, hovered]);

  return (
    <div className="banner-region" role="status" aria-live="polite">
      <AnimatePresence>
        {notification && !overviewOpen ? (
          <m.div
            key={notification.id}
            className="banner"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0, transition: motionTokens.enter }}
            exit={{ opacity: 0, y: -8, transition: motionTokens.exit }}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
          >
            <button
              type="button"
              className="banner__body"
              aria-label={t('notify.open', {
                app: t(`app.${notification.appId}`),
              })}
              onClick={() => {
                windowStore.getState().openApp(notification.appId, {
                  width: window.innerWidth,
                  height: window.innerHeight,
                });
                shellStore.getState().dismissBanner();
              }}
            >
              <AppIcon appId={notification.appId} size={36} />
              <span className="banner__text">
                <strong>{notification.sender}</strong>
                <span>{notification.body}</span>
              </span>
            </button>
            <button
              type="button"
              className="shell-icon-button banner__close"
              aria-label={t('notify.dismiss')}
              onClick={() => shellStore.getState().dismissBanner()}
            >
              <X aria-hidden />
            </button>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
