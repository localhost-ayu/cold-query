import { useEffect } from 'react';

import { brand } from '@/config/brand';
import { configureAudio } from '@/os/audio';
import { Dock } from '@/os/dock/Dock';
import { useT } from '@/os/i18n';
import { ThemeController } from '@/os/theme/ThemeController';
import { TopBar } from '@/os/topbar/TopBar';
import { WindowManager } from '@/os/windows/WindowManager';
import { usePreferences } from '@/store/preferences-store';
import { windowStore } from '@/store/window-store';

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Abre o Terminal na primeira pintura e mantém idioma e som em dia com as preferências. */
function useBoot() {
  const locale = usePreferences((state) => state.locale);
  const soundEnabled = usePreferences((state) => state.soundEnabled);
  const volume = usePreferences((state) => state.volume);

  useEffect(() => {
    if (windowStore.getState().windows.length === 0) {
      windowStore.getState().openApp('terminal', viewport());
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    configureAudio({ enabled: soundEnabled, volume });
  }, [soundEnabled, volume]);
}

export function Desktop() {
  const t = useT();
  useBoot();

  return (
    <main className="desktop">
      <ThemeController />
      <div className="wallpaper" aria-hidden />
      <TopBar />
      <aside className="case-card" aria-label={t('desktop.caseLabel')}>
        <span className="case-card__label">{t('desktop.caseLabel')}</span>
        <strong>{t('desktop.caseTitle')}</strong>
        <p>{t('desktop.caseBody')}</p>
      </aside>
      <WindowManager />
      <Dock />
      <section className="small-screen">
        <span className="small-screen__mark">{brand.osName}</span>
        <h1>{t('desktop.mobileTitle')}</h1>
        <p>{t('desktop.mobileBody')}</p>
      </section>
    </main>
  );
}
