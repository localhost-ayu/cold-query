import { describe, expect, it } from 'vitest';

import type { Fact, Resolution } from '@/core/case-schema';

import {
  answerHash,
  completeness,
  discoverFacts,
  isSatisfied,
  judge,
  matches,
  rowHasValues,
  stars,
  unlockOptions,
  type Evidence,
} from '.';

const evidence = (rows: Evidence['rows'], extra: Partial<Evidence> = {}) =>
  ({
    id: 'e1',
    caseId: '001',
    source: 'query',
    columns: [],
    rows,
    pinnedAt: '2026-03-16T09:00:00Z',
    ...extra,
  }) as Evidence;

describe('matchers', () => {
  it('finds all values in a row, in any column, comparing as text', () => {
    expect(rowHasValues([7, 4471, 'ALMOX_TI', 'IN'], ['4471', 'IN'])).toBe(
      true,
    );
    expect(rowHasValues([7, 4471, 'ANDAR_4'], [4471, 'ALMOX_TI'])).toBe(false);
  });

  it('matches NULL only with null', () => {
    expect(rowHasValues(['NB-0417', null], [null])).toBe(true);
    expect(rowHasValues(['null'], [null])).toBe(false);
    expect(rowHasValues([null], ['null'])).toBe(false);
  });

  it('counts rows inside a single pin for rowsHaveValues', () => {
    const matcher = {
      type: 'rowsHaveValues' as const,
      values: [9002, 'ALMOX_TI'],
      min: 3,
    };
    const two = evidence([
      [9002, 'ALMOX_TI'],
      [9002, 'ALMOX_TI'],
    ]);
    expect(matches(matcher, two)).toBe(false);
    expect(
      matches(matcher, evidence([...two.rows, [9002, 'ALMOX_TI', 'IN']])),
    ).toBe(true);
  });

  it('matches site snippets by page and anchor only', () => {
    const matcher = {
      type: 'snippet' as const,
      pageId: 'politica',
      anchor: 'p-almox',
    };
    expect(
      matches(
        matcher,
        evidence([], { source: 'site', pageId: 'politica', anchor: 'p-almox' }),
      ),
    ).toBe(true);
    expect(matches(matcher, evidence([['politica', 'p-almox']]))).toBe(false);
  });
});

const facts: Fact[] = [
  {
    id: 'f_a',
    bonus: false,
    matcher: { type: 'rowHasValues', values: ['A'] },
  },
  {
    id: 'f_b',
    bonus: false,
    matcher: { type: 'rowHasValues', values: ['B'] },
  },
  { id: 'f_c', bonus: true, matcher: { type: 'rowHasValues', values: ['C'] } },
];

const report: Resolution['report'] = {
  slots: [
    {
      id: 'who',
      label: { 'pt-BR': 'Quem' },
      options: [
        {
          id: 'w1',
          label: { 'pt-BR': 'A' },
          requires: { all: ['f_a', 'f_b'] },
        },
        {
          id: 'w2',
          label: { 'pt-BR': 'B' },
          requires: { any: ['f_b', 'f_c'] },
        },
        { id: 'w3', label: { 'pt-BR': '?' }, requires: { minFacts: 3 } },
      ],
    },
  ],
};

describe('facts and options', () => {
  it('discovers facts from the current evidence', () => {
    expect(
      discoverFacts(facts, [evidence([['A', 1]]), evidence([['C']])]),
    ).toEqual(['f_a', 'f_c']);
  });

  it('evaluates all, any and minFacts', () => {
    const found = new Set(['f_b']);
    expect(isSatisfied({ all: ['f_a', 'f_b'] }, found)).toBe(false);
    expect(isSatisfied({ any: ['f_a', 'f_b'] }, found)).toBe(true);
    expect(isSatisfied({ minFacts: 2 }, found)).toBe(false);
  });

  it('keeps unlocked options even after their evidence is gone', () => {
    const first = unlockOptions(report, ['f_b']);
    expect(first.who).toEqual(['w2']);
    const later = unlockOptions(report, [], first);
    expect(later.who).toEqual(['w2']);
    expect(unlockOptions(report, ['f_a', 'f_b', 'f_c'], later).who).toEqual([
      'w1',
      'w2',
      'w3',
    ]);
  });
});

describe('verdict', () => {
  it('hashes caseId|slot|option with sha256', async () => {
    expect(await answerHash('001', 'who', 'w1')).toMatch(/^[0-9a-f]{64}$/);
    expect(await answerHash('001', 'who', 'w1')).not.toBe(
      await answerHash('001', 'who', 'w2'),
    );
  });

  it('returns correct, partial or wrong without naming the slot', async () => {
    const answers = {
      who: await answerHash('001', 'who', 'w1'),
      when: await answerHash('001', 'when', 't2'),
    };
    expect(await judge('001', answers, { who: 'w1', when: 't2' })).toBe(
      'correct',
    );
    expect(await judge('001', answers, { who: 'w1', when: 't1' })).toBe(
      'partial',
    );
    expect(await judge('001', answers, { who: 'w2', when: 't1' })).toBe(
      'wrong',
    );
    expect(await judge('002', answers, { who: 'w1', when: 't2' })).toBe(
      'wrong',
    );
  });

  it('gives stars by penalties and measures completeness', () => {
    expect(stars(0, 0)).toBe(3);
    expect(stars(1, 0)).toBe(2);
    expect(stars(0, 1)).toBe(2);
    expect(stars(1, 1)).toBe(1);
    expect(completeness(facts, ['f_a', 'f_a', 'f_c'])).toBe(67);
  });
});
