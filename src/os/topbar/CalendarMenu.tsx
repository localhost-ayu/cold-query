import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { appIcons } from '@/apps/icons';
import { useLocale, useT } from '@/os/i18n';
import { shellStore, useShell } from '@/store/shell-store';
import { windowStore } from '@/store/window-store';

/** Dias do mês em semanas, começando no domingo; dias de fora ficam null. */
function monthGrid(year: number, month: number): Array<number | null> {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = Array(first).fill(null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function Calendar() {
  const t = useT();
  const locale = useLocale();
  const today = new Date();
  // Mês mostrado, guardado como deslocamento a partir do mês atual.
  const [offset, setOffset] = useState(0);
  const shown = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const cells = monthGrid(shown.getFullYear(), shown.getMonth());

  // Iniciais dos dias da semana no idioma do jogador (2026-03-01 foi um domingo).
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Date(2026, 2, 1 + index).toLocaleDateString(locale, {
          weekday: 'narrow',
        }),
      ),
    [locale],
  );

  return (
    <div className="calendar">
      <p className="calendar__weekday">
        {today.toLocaleDateString(locale, { weekday: 'long' })}
      </p>
      <p className="calendar__date">
        {today.toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <div className="calendar__month">
        <button
          type="button"
          className="shell-icon-button"
          aria-label={t('calendar.previous')}
          onClick={() => setOffset((value) => value - 1)}
        >
          <CaretLeft aria-hidden />
        </button>
        <span>
          {shown.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          className="shell-icon-button"
          aria-label={t('calendar.next')}
          onClick={() => setOffset((value) => value + 1)}
        >
          <CaretRight aria-hidden />
        </button>
      </div>
      <div className="calendar__grid" aria-hidden>
        {weekdays.map((day, index) => (
          <span key={`w${index}`} className="calendar__head">
            {day}
          </span>
        ))}
        {cells.map((day, index) => (
          <span
            key={index}
            className="calendar__day"
            data-today={(offset === 0 && day === today.getDate()) || undefined}
          >
            {day ?? ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function NotificationList() {
  const t = useT();
  const locale = useLocale();
  const notifications = useShell((state) => state.notifications);

  if (notifications.length === 0) {
    return (
      <p className="notifications__empty">{t('calendar.noNotifications')}</p>
    );
  }

  return (
    <div className="notifications">
      <ul>
        {notifications.map((item) => {
          const Icon = appIcons[item.appId];
          return (
            <li key={item.id}>
              <button
                type="button"
                className="notification-card"
                onClick={() => {
                  windowStore.getState().openApp(item.appId, {
                    width: window.innerWidth,
                    height: window.innerHeight,
                  });
                  shellStore.getState().setPopover(null);
                }}
              >
                <Icon
                  weight="fill"
                  aria-hidden
                  className="notification-card__icon"
                />
                <span className="notification-card__text">
                  <span className="notification-card__head">
                    <strong>{item.sender}</strong>
                    <time dateTime={new Date(item.createdAt).toISOString()}>
                      {new Date(item.createdAt).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </span>
                  <span>{item.body}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="shell-button notifications__clear"
        onClick={() => shellStore.getState().clearNotifications()}
      >
        <X aria-hidden />
        {t('calendar.clear')}
      </button>
    </div>
  );
}

/** Menu do relógio: notificações à esquerda e calendário à direita, como no GNOME. */
export function CalendarMenu() {
  return (
    <div className="calendar-menu">
      <NotificationList />
      <Calendar />
    </div>
  );
}
