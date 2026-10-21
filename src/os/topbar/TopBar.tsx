import { SpeakerHigh, SpeakerSlash, WifiHigh } from '@phosphor-icons/react';
import { useCallback, useRef, useSyncExternalStore } from 'react';

import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { usePreferences } from '@/store/preferences-store';
import { shellStore, useShell } from '@/store/shell-store';

import { CalendarMenu } from './CalendarMenu';
import { QuickSettings } from './QuickSettings';
import { ShellPopover } from './ShellPopover';

const CLOCK_STEP = 15_000;

function subscribeClock(onTick: () => void) {
  const timer = window.setInterval(onTick, CLOCK_STEP);
  return () => window.clearInterval(timer);
}

/**
 * Indicador de áreas de trabalho do GNOME: a pílula comprida é a área atual e
 * o ponto é a área vazia seguinte. Clicar abre as Atividades.
 */
function ActivitiesButton() {
  const t = useT();
  const open = useShell((state) => state.overviewOpen);
  return (
    <button
      type="button"
      className="panel-button activities"
      aria-label={t('topbar.activities')}
      aria-pressed={open}
      onClick={() => {
        shellStore.getState().toggleOverview();
        play('click');
      }}
    >
      <span className="activities__dot activities__dot--active" />
      <span className="activities__dot" />
    </button>
  );
}

function ClockButton() {
  const t = useT();
  const locale = useLocale();
  const anchor = useRef<HTMLButtonElement>(null);
  const open = useShell((state) => state.popover === 'calendar');
  const unread = useShell((state) => state.notifications.some((n) => !n.read));
  // O snapshot muda a cada 15 s, e só então o relógio re-renderiza.
  const tick = useSyncExternalStore(subscribeClock, () =>
    Math.floor(Date.now() / CLOCK_STEP),
  );
  const now = new Date(tick * CLOCK_STEP);
  const close = useCallback(() => shellStore.getState().setPopover(null), []);

  return (
    <div className="panel-center">
      <button
        ref={anchor}
        type="button"
        className="panel-button clock"
        aria-label={`${now.toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })}. ${t('topbar.calendar')}`}
        aria-expanded={open}
        onClick={() => {
          shellStore.getState().togglePopover('calendar');
          shellStore.getState().markAllRead();
        }}
      >
        <time dateTime={now.toISOString()}>
          {now.toLocaleString(locale, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
          <span className="clock__gap" />
          {now.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
        {unread ? (
          <span className="clock__unread" title={t('topbar.unread')} />
        ) : null}
      </button>
      <ShellPopover
        open={open}
        onClose={close}
        anchor={anchor}
        label={t('topbar.calendar')}
        align="center"
      >
        <CalendarMenu />
      </ShellPopover>
    </div>
  );
}

function SystemButton() {
  const t = useT();
  const anchor = useRef<HTMLButtonElement>(null);
  const open = useShell((state) => state.popover === 'quickSettings');
  const soundEnabled = usePreferences((state) => state.soundEnabled);
  const close = useCallback(() => shellStore.getState().setPopover(null), []);

  return (
    <div className="panel-end">
      <button
        ref={anchor}
        type="button"
        className="panel-button system"
        aria-label={t('topbar.system')}
        aria-expanded={open}
        onClick={() => shellStore.getState().togglePopover('quickSettings')}
      >
        <WifiHigh weight="bold" aria-hidden />
        {soundEnabled ? (
          <SpeakerHigh weight="fill" aria-hidden />
        ) : (
          <SpeakerSlash weight="fill" aria-hidden />
        )}
      </button>
      <ShellPopover
        open={open}
        onClose={close}
        anchor={anchor}
        label={t('topbar.system')}
        align="end"
      >
        <QuickSettings />
      </ShellPopover>
    </div>
  );
}

/** Barra superior do GNOME Shell: Atividades, relógio e menu do sistema. */
export function TopBar() {
  return (
    <header className="panel">
      <ActivitiesButton />
      <ClockButton />
      <SystemButton />
    </header>
  );
}
