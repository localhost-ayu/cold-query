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

  it('spreads a chain of references over as many columns as it needs', () => {
    const columns = diagramColumns([
      table('employees'),
      table('invoices', ['vendors', 'purchase_orders']),
      table('payments', ['invoices', 'employees']),
      table('purchase_orders', ['employees']),
      table('vendors', ['employees']),
    ]);
    expect(Object.fromEntries(columns)).toEqual({
      payments: 0,
      invoices: 1,
      purchase_orders: 2,
      vendors: 2,
      employees: 3,
    });
  });

  it('survives a table that points to itself and a schema with no links', () => {
    expect(
      Object.fromEntries(diagramColumns([table('people', ['people'])])),
    ).toEqual({ people: 0 });
    expect(
      Object.fromEntries(diagramColumns([table('a'), table('b')])),
    ).toEqual({ a: 0, b: 0 });
  });
});
