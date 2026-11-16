import { describe, expect, it } from 'vitest';

import type { Evidence } from '@/core/resolution';

import { extractTimeline, formatOffset, parseOffset } from '.';

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

describe('clock adjustments', () => {
  it('moves the times of an evidence by its offset and keeps the original', () => {
    const firewall = {
      ...pin(
        'fw',
        ['src_ip', 'event_time'],
        [['10.30.2.57', '2026-05-12 22:58:12']],
      ),
      clockOffset: -432,
    };
    const edr = {
      ...pin(
        'edr',
        ['process', 'event_time'],
        [['rclone.exe', '2026-05-13 01:47:30']],
      ),
      clockOffset: -3 * 3600,
    };
    const events = extractTimeline([firewall, edr]);
    expect(events.map((e) => [e.at, e.original, e.offset])).toEqual([
      ['2026-05-12 22:47:30', '2026-05-13 01:47:30', -10800],
      ['2026-05-12 22:51:00', '2026-05-12 22:58:12', -432],
    ]);
    expect(events[0].day).toBe('2026-05-12');
  });

  it('reads offsets the way people write them', () => {
    expect(parseOffset('-432')).toBe(-432);
    expect(parseOffset('-432s')).toBe(-432);
    expect(parseOffset('-7:12')).toBe(-432);
    expect(parseOffset(' -0:07:12 ')).toBe(-432);
    expect(parseOffset('−3h')).toBe(-10800);
    expect(parseOffset('+90min')).toBe(5400);
    expect(parseOffset('7:75')).toBeNull();
    expect(parseOffset('ontem')).toBeNull();
    expect(parseOffset('')).toBeNull();
    expect(formatOffset(-432)).toBe('-0:07:12');
    expect(formatOffset(10800)).toBe('+3:00:00');
  });
});
