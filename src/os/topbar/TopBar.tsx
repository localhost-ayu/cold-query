import {
  Bell,
  CircleHalf,
  Moon,
  ShieldCheck,
  Sun,
  WifiHigh,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { brand } from '@/config/brand';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import {
  usePreferences,
  type ThemePreference,
} from '@/store/preferences-store';

const themeCycle: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const themeIcons = { system: CircleHalf, light: Sun, dark: Moon };

const CLOCK_STEP = 15_000;

function subscribeClock(onTick: () => void) {
  const timer = window.setInterval(onTick, CLOCK_STEP);
  return () => window.clearInterval(timer);
}

function Clock() {
  const locale = useLocale();
  // O snapshot muda a cada 15 s, e só então o relógio re-renderiza.
  const tick = useSyncExternalStore(subscribeClock, () =>
    Math.floor(Date.now() / CLOCK_STEP),
  );
  const now = new Date(tick * CLOCK_STEP);

  return (
    <time className="topbar__clock" dateTime={now.toISOString()}>
      {now.toLocaleString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </time>
  );
}

function Notifications() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="topbar__popover-anchor" ref={root}>
      <button
        className="icon-button"
        type="button"
        aria-label={t('topbar.notifications')}
        aria-expanded={open}
        aria-controls="notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden />
      </button>
      {open ? (
        <div className="popover" id="notifications" role="status">
          {t('topbar.noNotifications')}
        </div>
      ) : null}
    </div>
  );
}

export function TopBar() {
  const t = useT();
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);
  const ThemeIcon = themeIcons[theme];
  const themeLabel = t('topbar.theme', { theme: t(`settings.theme.${theme}`) });

  return (
    <header className="topbar">
      <span className="topbar__brand">{brand.osName}</span>
      <Clock />
      <div className="topbar__tray">
        <span className="topbar__status" title={t('topbar.secure')}>
          <ShieldCheck weight="fill" aria-hidden />
          <WifiHigh aria-hidden />
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={() => {
            setTheme(themeCycle[theme]);
            play('click');
          }}
        >
          <ThemeIcon aria-hidden />
        </button>
        <Notifications />
      </div>
    </header>
  );
}
