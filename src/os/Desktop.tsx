import { useEffect, useRef } from 'react';

import { gameStore } from '@/apps/shared/game';
import {
  deliverImportedContracts,
  loadInstalledCases,
} from '@/apps/shared/mods';
import { currentViewport, persistence } from '@/apps/shared/persistence';
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

/**
 * Primeira pintura: restaura o save (ou abre o Mail e entrega o primeiro
 * contrato) e liga o autosave.
 * Depois, mantém idioma e som em dia com as preferências.
 */
function useBoot() {
  const locale = usePreferences((state) => state.locale);
  const soundEnabled = usePreferences((state) => state.soundEnabled);
  const volume = usePreferences((state) => state.volume);

  useEffect(() => {
    // Em dev o StrictMode monta duas vezes: só a montagem que sobrevive liga o autosave.
    let cancelled = false;
    let stopAutosave: (() => void) | undefined;
    let timer: number | undefined;

    // Casos importados entram antes do save, para o progresso deles ser reconhecido.
    void loadInstalledCases()
      .then(() => persistence.load(currentViewport()))
      .then((result) => {
        if (cancelled) return;
        if (windowStore.getState().windows.length === 0) {
          windowStore.getState().openApp('mail', currentViewport());
        }
        stopAutosave = persistence.startAutosave();
        // Jogo novo: um respiro antes do primeiro e-mail, para ele chegar depois
        // da janela. Num save restaurado, start() não faz nada.
        if (result !== 'restored') {
          timer = window.setTimeout(() => {
            gameStore.getState().start();
            deliverImportedContracts();
          }, 900);
        }
      });

    // Fechar ou esconder a aba grava o que estiver pendente.
    const flush = () => void persistence.flush();
    const onVisibility = () => document.hidden && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      stopAutosave?.();
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
