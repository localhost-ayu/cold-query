import { describe, expect, it } from 'vitest';

import type { Evidence } from '@/core/resolution';

import { extractTimeline } from '.';

const pin = (
  id: string,
  columns: string[],
  rows: Evidence['rows'],
): Evidence => ({
  id,
  caseId: '001',
  source: 'query',
  columns,
  rows,
  pinnedAt: '2026-03-16T12:00:00Z',
});

describe('extractTimeline', () => {
  it('turns each datetime cell into an event, in order, with the rest as context', () => {
    const events = extractTimeline([
      pin(
        'a',
        ['id', 'badge_id', 'gate', 'event_time'],
        [
          [2, 9100, 'ALMOX_TI', '2026-03-14 03:10:31'],
          [1, 4471, 'ALMOX_TI', '2026-03-13 22:47:03'],
        ],
      ),
    ]);
    expect(events.map((e) => e.at)).toEqual([
      '2026-03-13 22:47:03',
      '2026-03-14 03:10:31',
    ]);
    expect(events[0]).toMatchObject({
      day: '2026-03-13',
      time: '22:47:03',
      source: 'event_time',
      cells: [
        { column: 'id', value: 1 },
        { column: 'badge_id', value: 4471 },
        { column: 'gate', value: 'ALMOX_TI' },
      ],
    });
  });

  it('combines a date with separate clock-in and clock-out times', () => {
    const events = extractTimeline([
      pin(
        't',
        ['employee_id', 'work_date', 'clock_in', 'clock_out'],
        [[9, '2026-03-13', '08:12:00', '18:04:00']],
      ),
    ]);
    expect(events.map((e) => [e.at, e.source])).toEqual([
      ['2026-03-13 08:12:00', 'clock_in'],
      ['2026-03-13 18:04:00', 'clock_out'],
    ]);
    expect(events[1].cells).toEqual([{ column: 'employee_id', value: 9 }]);
  });

  it('keeps date-only rows, skips rows without dates and site passages', () => {
    const events = extractTimeline([
      pin(
        'c',
        ['client', 'opened_on'],
        [
          ['Vantara', '2026-03-16'],
          ['Sem data', null],
        ],
      ),
      {
        ...pin('s', [], []),
        source: 'site',
        rows: [['intranet', 'texto 2026-03-13 10:00:00']],
      },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ at: '2026-03-16', time: null });
  });

  it('shows a row pinned twice only once', () => {
    const row = [[1, '2026-03-13 22:47:03']];
    const events = extractTimeline([
      pin('a', ['id', 'event_time'], row),
      pin('b', ['id', 'event_time'], row),
    ]);
    expect(events).toHaveLength(1);
  });
});
