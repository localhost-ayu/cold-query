import { useId } from 'react';

import { locales, type Locale } from '@/core/i18n';
import { play } from '@/os/audio';
import { useT } from '@/os/i18n';
import {
  usePreferences,
  type ThemePreference,
} from '@/store/preferences-store';

import { SavesSection } from './SavesSection';

const themes: ThemePreference[] = ['system', 'light', 'dark'];

/** Nome de cada idioma escrito nele mesmo, como em qualquer seletor de idioma. */
const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
};

export function SettingsApp() {
  const t = useT();
  const ids = { volume: useId(), sound: useId() };
  const prefs = usePreferences((state) => state);

  return (
    <div className="settings">
      <section className="settings__group">
        <h2>{t('settings.appearance')}</h2>
        <fieldset className="settings__row">
          <legend>{t('settings.theme')}</legend>
          <div className="segmented">
            {themes.map((theme) => (
              <label key={theme}>
                <input
                  type="radio"
                  name="theme"
                  value={theme}
                  checked={prefs.theme === theme}
                  onChange={() => prefs.setTheme(theme)}
                />
                <span>{t(`settings.theme.${theme}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="settings__row">
          <legend>{t('settings.language')}</legend>
          <div className="segmented">
            {locales.map((locale) => (
              <label key={locale}>
                <input
                  type="radio"
                  name="locale"
                  value={locale}
                  checked={prefs.locale === locale}
                  onChange={() => prefs.setLocale(locale)}
                />
                <span lang={locale}>{localeNames[locale]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="settings__group">
        <h2>{t('settings.sound')}</h2>
        <div className="settings__row">
          <label htmlFor={ids.sound}>{t('settings.soundEnabled')}</label>
          <input
            id={ids.sound}
            className="switch"
            type="checkbox"
            role="switch"
            checked={prefs.soundEnabled}
            onChange={(event) => {
              prefs.setSoundEnabled(event.target.checked);
              if (event.target.checked) play('click');
            }}
          />
        </div>
        <div className="settings__row">
          <label htmlFor={ids.volume}>{t('settings.volume')}</label>
          <input
            id={ids.volume}
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(prefs.volume * 100)}
            disabled={!prefs.soundEnabled}
            onChange={(event) =>
              prefs.setVolume(Number(event.target.value) / 100)
            }
            // Toca ao soltar, para ouvir o volume novo sem metralhar cliques.
            onPointerUp={() => play('click')}
          />
        </div>
      </section>

      <SavesSection />
    </div>
  );
}
