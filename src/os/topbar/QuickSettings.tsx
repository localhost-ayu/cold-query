import {
  Gear,
  ShieldCheck,
  Moon,
  SpeakerHigh,
  SpeakerSlash,
  Translate,
} from '@phosphor-icons/react';
import { useId, type CSSProperties } from 'react';

import { locales, type Locale } from '@/core/i18n';
import { play } from '@/os/audio';
import { useT } from '@/os/i18n';
import { usePreferences } from '@/store/preferences-store';
import { shellStore } from '@/store/shell-store';
import { windowStore } from '@/store/window-store';

const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
};

/** "Sistema" conta como escuro quando o sistema operacional está escuro. */
function systemIsDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Configurações rápidas do GNOME: pílulas de liga/desliga e o volume. */
export function QuickSettings() {
  const t = useT();
  const volumeId = useId();
  const prefs = usePreferences((state) => state);
  const dark =
    prefs.theme === 'dark' || (prefs.theme === 'system' && systemIsDark());

  function openSettings() {
    windowStore.getState().openApp('settings', {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    shellStore.getState().setPopover(null);
    play('open');
  }

  function nextLocale() {
    const index = locales.indexOf(prefs.locale);
    prefs.setLocale(locales[(index + 1) % locales.length]);
    play('click');
  }

  return (
    <div className="quick-settings">
      <div className="quick-settings__top">
        <span className="quick-settings__status">
          <ShieldCheck weight="fill" aria-hidden />
          {t('quick.isolated')}
        </span>
        <button
          type="button"
          className="shell-round-button"
          aria-label={t('quick.settings')}
          title={t('quick.settings')}
          onClick={openSettings}
        >
          <Gear aria-hidden />
        </button>
      </div>

      <div className="quick-settings__slider">
        <button
          type="button"
          className="shell-round-button shell-round-button--flat"
          aria-label={t('quick.sound')}
          aria-pressed={prefs.soundEnabled}
          onClick={() => prefs.setSoundEnabled(!prefs.soundEnabled)}
        >
          {prefs.soundEnabled ? (
            <SpeakerHigh aria-hidden />
          ) : (
            <SpeakerSlash aria-hidden />
          )}
        </button>
        <label htmlFor={volumeId} className="sr-only">
          {t('quick.volume')}
        </label>
        <input
          id={volumeId}
          type="range"
          className="shell-range"
          min={0}
          max={100}
          step={5}
          value={prefs.soundEnabled ? Math.round(prefs.volume * 100) : 0}
          onChange={(event) => {
            const volume = Number(event.target.value) / 100;
            prefs.setVolume(volume);
            prefs.setSoundEnabled(volume > 0);
          }}
          onPointerUp={() => play('click')}
          // Expõe o preenchimento ao CSS para pintar a parte "cheia" da trilha.
          style={
            {
              '--fill': `${prefs.soundEnabled ? prefs.volume * 100 : 0}%`,
            } as CSSProperties
          }
        />
      </div>

      <div className="quick-settings__pills">
        <button
          type="button"
          className="quick-pill"
          aria-pressed={dark}
          onClick={() => {
            prefs.setTheme(dark ? 'light' : 'dark');
            play('click');
          }}
        >
          <Moon weight="fill" aria-hidden />
          <span>{t('quick.darkStyle')}</span>
        </button>
        <button
          type="button"
          className="quick-pill"
          aria-pressed={prefs.soundEnabled}
          onClick={() => {
            prefs.setSoundEnabled(!prefs.soundEnabled);
            if (!prefs.soundEnabled) play('click');
          }}
        >
          <SpeakerHigh weight="fill" aria-hidden />
          <span>{t('quick.sound')}</span>
        </button>
        <button
          type="button"
          className="quick-pill quick-pill--info"
          onClick={nextLocale}
        >
          <Translate weight="bold" aria-hidden />
          <span className="quick-pill__text">
            <span>{t('quick.language')}</span>
            <small lang={prefs.locale}>{localeNames[prefs.locale]}</small>
          </span>
        </button>
      </div>
    </div>
  );
}
