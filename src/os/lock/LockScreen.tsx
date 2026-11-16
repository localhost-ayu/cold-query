import {
  ArrowRight,
  CaretUp,
  GearSix,
  Info,
  SpeakerHigh,
  SpeakerSlash,
  User,
  WifiHigh,
} from '@phosphor-icons/react';
import { m } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';

import { brand } from '@/config/brand';
import { locales, type Locale } from '@/core/i18n';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { motionTokens } from '@/os/motion';
import { ShellPopover } from '@/os/topbar/ShellPopover';
import { Wallpaper } from '@/os/wallpaper/Wallpaper';
import {
  usePreferences,
  type ThemePreference,
} from '@/store/preferences-store';
import { shellStore } from '@/store/shell-store';

import { CreditsDialog } from './CreditsDialog';

/** Senha de mentira: o campo já chega com ela, ponto a ponto. */
const FAKE_PASSWORD = 'coldquery';
const TYPE_STEP = 45;

const themes: ThemePreference[] = ['system', 'light', 'dark'];
const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
};

function subscribeClock(onTick: () => void) {
  const timer = window.setInterval(onTick, 15_000);
  return () => window.clearInterval(timer);
}

/** Relógio grande do escudo, atualizado a cada 15 s. */
function useNow() {
  const tick = useSyncExternalStore(subscribeClock, () =>
    Math.floor(Date.now() / 15_000),
  );
  return new Date(tick * 15_000);
}

/** Idioma, tema e som, sem precisar entrar no sistema. */
function LockOptions() {
  const t = useT();
  const prefs = usePreferences((state) => state);
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const soundId = useId();
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="lock__menu">
      <button
        ref={anchor}
        type="button"
        className="lock__chip"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GearSix weight="bold" aria-hidden />
        {t('lock.options')}
      </button>
      <ShellPopover
        open={open}
        onClose={close}
        anchor={anchor}
        label={t('lock.options')}
        align="center"
        className="lock__popover"
      >
        <fieldset className="lock__field">
          <legend>{t('settings.language')}</legend>
          <div className="lock__segmented">
            {locales.map((locale) => (
              <label key={locale}>
                <input
                  type="radio"
                  name="lock-locale"
                  checked={prefs.locale === locale}
                  onChange={() => prefs.setLocale(locale)}
                />
                <span lang={locale}>{localeNames[locale]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="lock__field">
          <legend>{t('settings.theme')}</legend>
          <div className="lock__segmented">
            {themes.map((theme) => (
              <label key={theme}>
                <input
                  type="radio"
                  name="lock-theme"
                  checked={prefs.theme === theme}
                  onChange={() => prefs.setTheme(theme)}
                />
                <span>{t(`settings.theme.${theme}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="lock__field lock__field--row">
          <label htmlFor={soundId}>{t('settings.soundEnabled')}</label>
          <input
            id={soundId}
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
      </ShellPopover>
    </div>
  );
}

/**
 * Tela de bloqueio do TraceOS, que também é o menu do jogo. Como no GNOME:
 * primeiro o escudo com o relógio; qualquer clique ou tecla o levanta e
 * mostra o login. A senha é cenográfica: qualquer coisa desbloqueia.
 */
export function LockScreen() {
  const t = useT();
  const locale = useLocale();
  const now = useNow();
  const soundEnabled = usePreferences((state) => state.soundEnabled);
  const [stage, setStage] = useState<'shield' | 'login'>('shield');
  const [password, setPassword] = useState('');
  const [credits, setCredits] = useState(false);
  const submit = useRef<HTMLButtonElement>(null);
  const shield = useRef<HTMLButtonElement>(null);

  // A senha zera aqui, e não no efeito, para digitar de novo a cada subida do escudo.
  const showLogin = useCallback(() => {
    setPassword('');
    setStage('login');
  }, []);

  // Escudo: qualquer tecla (menos modificadores sozinhos) levanta.
  useEffect(() => {
    if (stage !== 'shield') return;
    shield.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key))
        return;
      event.preventDefault();
      showLogin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, showLogin]);

  // Login: a senha se digita sozinha; Esc volta para o escudo, como no GNOME.
  useEffect(() => {
    if (stage !== 'login') return;
    submit.current?.focus();
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setPassword(FAKE_PASSWORD.slice(0, index));
      if (index >= FAKE_PASSWORD.length) window.clearInterval(timer);
    }, TYPE_STEP);
    const onKey = (event: KeyboardEvent) => {
      // Esc dentro de um menu ou diálogo fecha só ele.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('.lock__popover, .credits[open]')) return;
      setStage('shield');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [stage]);

  function unlock(event: FormEvent) {
    event.preventDefault();
    play('open');
    shellStore.getState().unlock();
  }

  const time = now.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <m.div
      className="lock"
      data-stage={stage}
      role="dialog"
      aria-modal="true"
      aria-label={t('lock.title')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: motionTokens.spatial }}
      transition={motionTokens.enter}
    >
      <Wallpaper className="lock__wallpaper" idPrefix="lock-" />
      <div className="lock__veil" aria-hidden />

      <div className="lock__bar">
        <span className="lock__brand">{brand.gameName}</span>
        <span className="lock__indicators" aria-hidden>
          <WifiHigh weight="bold" />
          {soundEnabled ? (
            <SpeakerHigh weight="fill" />
          ) : (
            <SpeakerSlash weight="fill" />
          )}
        </span>
      </div>

      <m.button
        ref={shield}
        type="button"
        className="lock__shield"
        aria-label={`${time}, ${date}. ${t('lock.hint')}`}
        tabIndex={stage === 'shield' ? 0 : -1}
        aria-hidden={stage !== 'shield'}
        onClick={showLogin}
        onWheel={showLogin}
        animate={
          stage === 'shield' ? { y: 0, opacity: 1 } : { y: '-100%', opacity: 0 }
        }
        transition={motionTokens.spatial}
      >
        <time className="lock__time" dateTime={now.toISOString()}>
          {time}
        </time>
        <span className="lock__date">{date}</span>
        <span className="lock__hint">
          <CaretUp weight="bold" aria-hidden />
          {t('lock.hint')}
        </span>
      </m.button>

      {stage === 'login' ? (
        <m.form
          className="lock__login"
          onSubmit={unlock}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...motionTokens.enter, delay: 0.08 }}
        >
          <span className="lock__avatar" aria-hidden>
            <User weight="fill" />
          </span>
          <h1 className="lock__user">{t('lock.user')}</h1>
          <p className="lock__company">{brand.companyName}</p>
          <div className="lock__entry">
            <input
              type="password"
              className="lock__password"
              aria-label={t('lock.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
            />
            <button
              ref={submit}
              type="submit"
              className="lock__submit"
              aria-label={t('lock.unlock')}
              title={t('lock.unlock')}
            >
              <ArrowRight weight="bold" aria-hidden />
            </button>
          </div>
          <p className="lock__note">{t('lock.passwordNote')}</p>

          <div className="lock__actions">
            <LockOptions />
            <button
              type="button"
              className="lock__chip"
              onClick={() => setCredits(true)}
            >
              <Info weight="bold" aria-hidden />
              {t('lock.credits')}
            </button>
          </div>
        </m.form>
      ) : null}

      <CreditsDialog open={credits} onClose={() => setCredits(false)} />
    </m.div>
  );
}
