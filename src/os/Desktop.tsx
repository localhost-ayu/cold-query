import { useEffect, useRef } from 'react';

import { brand } from '@/config/brand';
import { configureAudio } from '@/os/audio';
import { AutoHideDock } from '@/os/dash/AutoHideDock';
import { useT } from '@/os/i18n';
import { NotificationBanner } from '@/os/notifications/NotificationBanner';
import { Overview } from '@/os/overview/Overview';
import { ThemeController } from '@/os/theme/ThemeController';
import { TopBar } from '@/os/topbar/TopBar';
import { Wallpaper } from '@/os/wallpaper/Wallpaper';
import { WindowManager } from '@/os/windows/WindowManager';
import { usePreferences } from '@/store/preferences-store';
import { shellStore } from '@/store/shell-store';
import { windowStore } from '@/store/window-store';

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Primeira pintura: abre o Terminal e a Helena dá as boas-vindas.
 * Depois, mantém idioma e som em dia com as preferências.
 */
function useBoot() {
  const locale = usePreferences((state) => state.locale);
  const soundEnabled = usePreferences((state) => state.soundEnabled);
  const volume = usePreferences((state) => state.volume);

  useEffect(() => {
    if (windowStore.getState().windows.length === 0) {
      windowStore.getState().openApp('terminal', viewport());
    }
    // Um respiro antes do banner, para ele chegar depois da janela. Em dev, o
    // StrictMode roda o efeito duas vezes: a limpeza cancela o primeiro timer.
    const timer = window.setTimeout(() => {
      if (shellStore.getState().notifications.length > 0) return;
      shellStore.getState().notify({
        appId: 'mail',
        sender: 'Helena Duarte',
        bodyKey: 'notify.trainingBody',
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    configureAudio({ enabled: soundEnabled, volume });
  }, [soundEnabled, volume]);
}

/** Canto ativo do GNOME: encostar o ponteiro no canto superior esquerdo abre as Atividades. */
function HotCorner() {
  const last = useRef(0);
  return (
    <div
      className="hot-corner"
      aria-hidden
      onPointerEnter={(event) => {
        // Só mouse, e no máximo uma vez por segundo, para não piscar.
        if (event.pointerType !== 'mouse' || Date.now() - last.current < 1000)
          return;
        last.current = Date.now();
        shellStore.getState().toggleOverview();
      }}
    />
  );
}

export function Desktop() {
  const t = useT();
  useBoot();

  return (
    <main className="desktop">
      <ThemeController />
      <Wallpaper />
      <TopBar />
      <HotCorner />
      <Overview />
      <WindowManager />
      <AutoHideDock />
      <NotificationBanner />
      <section className="small-screen">
        <span className="small-screen__mark">{brand.osName}</span>
        <h1>{t('desktop.mobileTitle')}</h1>
        <p>{t('desktop.mobileBody')}</p>
      </section>
    </main>
  );
}
