import { ClockCounterClockwise } from '@phosphor-icons/react';

import type { Evidence } from '@/core/resolution';
import { extractTimeline } from '@/core/timeline';
import { useLocale, useT } from '@/os/i18n';

/** "2026-03-13" → "sexta-feira, 13 de março de 2026", sem fuso para não trocar o dia. */
function dayLabel(day: string, locale: string) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Tudo o que tem data e hora nas evidências, em ordem cronológica e agrupado
 * por dia. Só organiza o que o jogador fixou: não marca nada como importante.
 */
export function Timeline({ evidence }: { evidence: Evidence[] }) {
  const t = useT();
  const locale = useLocale();
  const events = extractTimeline(evidence);
  const order = new Map(evidence.map((item, index) => [item.id, index + 1]));

  if (events.length === 0) {
    return (
      <div className="status-page status-page--inline">
        <ClockCounterClockwise
          weight="duotone"
          className="status-page__glyph"
          aria-hidden
        />
        <h3>{t('dossier.timelineEmptyTitle')}</h3>
        <p>{t('dossier.timelineEmptyBody')}</p>
      </div>
    );
  }

  const days = [...new Set(events.map((event) => event.day))];
  return (
    <div className="timeline">
      {days.map((day) => (
        <section
          key={day}
          className="timeline__day"
          aria-label={dayLabel(day, locale)}
        >
          <h3 className="timeline__date">{dayLabel(day, locale)}</h3>
          <ol className="timeline__events">
            {events
              .filter((event) => event.day === day)
              .map((event) => (
                <li key={event.key} className="timeline__event">
                  <time
                    className="timeline__time"
                    dateTime={event.at.replace(' ', 'T')}
                  >
                    {event.time ?? t('dossier.allDay')}
                  </time>
                  <span className="timeline__dot" aria-hidden />
                  <div className="timeline__body">
                    <ul className="timeline__cells">
                      {event.cells.map((cell, index) => (
                        <li key={index} title={cell.column}>
                          <span className="timeline__column">
                            {cell.column}
                          </span>
                          <span data-null={cell.value === null || undefined}>
                            {cell.value === null ? 'NULL' : String(cell.value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <span className="timeline__source">
                      {event.source} ·{' '}
                      {t('dossier.evidence', {
                        n: order.get(event.evidenceId) ?? 0,
                      })}
                    </span>
                  </div>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
