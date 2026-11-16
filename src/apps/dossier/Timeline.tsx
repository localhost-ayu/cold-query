import { ClockClockwise, ClockCounterClockwise } from '@phosphor-icons/react';
import { useId, useState } from 'react';

import { gameStore } from '@/apps/shared/game';
import type { Evidence } from '@/core/resolution';
import { extractTimeline, formatOffset, parseOffset } from '@/core/timeline';
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

/** Tabela principal da consulta ("FROM fw_events ..."), para dar nome à evidência. */
function tableOf(sql: string | undefined) {
  return sql?.match(/\bfrom\s+([\w.]+)/i)?.[1] ?? null;
}

/** Campo de ajuste de relógio de uma evidência. Confirma com Enter ou ao sair do campo. */
function OffsetField({ item, label }: { item: Evidence; label: string }) {
  const t = useT();
  const id = useId();
  const saved = item.clockOffset ? formatOffset(item.clockOffset) : '';
  const [text, setText] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  // O ajuste mudou por fora (save carregado, caso reaberto): o campo acompanha.
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setText(saved);
  }
  const invalid = text.trim() !== '' && parseOffset(text) === null;

  function commit() {
    if (invalid) return;
    const seconds = text.trim() ? parseOffset(text) : null;
    gameStore.getState().setClockOffset(item.id, seconds || null);
    setText(seconds ? formatOffset(seconds) : '');
  }

  return (
    <li className="clocks__row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="clocks__input"
        value={text}
        placeholder="0:00:00"
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-hint`}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
      />
      <span
        id={`${id}-hint`}
        className="clocks__hint"
        data-invalid={invalid || undefined}
      >
        {invalid ? t('dossier.clockInvalid') : t('dossier.clockHint')}
      </span>
    </li>
  );
}

/**
 * Tudo o que tem data e hora nas evidências, em ordem cronológica e agrupado
 * por dia. Só organiza o que o jogador fixou: não marca nada como importante.
 * Fontes com relógio errado podem receber um ajuste, anotado pelo jogador.
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
  // Só evidências com hora (não só data) podem ter o relógio ajustado.
  const timed = evidence.filter((item) =>
    events.some((event) => event.evidenceId === item.id && event.time),
  );
  return (
    <div className="timeline">
      {timed.length > 0 ? (
        <details
          className="clocks"
          open={timed.some((item) => item.clockOffset) || undefined}
        >
          <summary>
            <ClockClockwise aria-hidden />
            {t('dossier.clocks')}
          </summary>
          <p className="clocks__intro">{t('dossier.clocksIntro')}</p>
          <ul className="clocks__list">
            {timed.map((item) => {
              const table = tableOf(item.sql);
              const label = t('dossier.evidence', {
                n: order.get(item.id) ?? 0,
              });
              return (
                <OffsetField
                  key={item.id}
                  item={item}
                  label={table ? `${label} · ${table}` : label}
                />
              );
            })}
          </ul>
        </details>
      ) : null}
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
                    data-adjusted={event.original ? true : undefined}
                    title={
                      event.original
                        ? t('dossier.clockOriginal', {
                            time: event.original,
                            offset: formatOffset(event.offset),
                          })
                        : undefined
                    }
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
                      {event.original
                        ? ` · ${t('dossier.clockOriginal', {
                            time: event.original,
                            offset: formatOffset(event.offset),
                          })}`
                        : ''}
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
