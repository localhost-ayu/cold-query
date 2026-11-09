import { describe, expect, it } from 'vitest';

import type { SchemaTable } from '@/core/sql/types';

import { diagramColumns } from '.';

const table = (name: string, references: string[] = []): SchemaTable => ({
  name,
  columns: [],
  foreignKeys: references.map((target) => ({
    column: `${target}_id`,
    table: target,
    refColumn: 'id',
  })),
});

describe('diagramColumns', () => {
  it('puts referencing tables left, referenced in the middle, loose ones right', () => {
    const columns = diagramColumns([
      table('assets', ['employees']),
      table('badge_events'),
      table('employees'),
      table('timesheet', ['employees']),
    ]);
    expect(Object.fromEntries(columns)).toEqual({
      assets: 0,
      badge_events: 2,
      employees: 1,
      timesheet: 0,
    });
  });
});
