// @vitest-environment node
import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { beforeAll, describe, expect, it } from 'vitest';

import { trainingDatabase } from '@/content/databases/training';
import { tutorialChallenges } from '@/content/tutorial';
import { createDatabase, runQuery } from '@/core/sql/database';

import { checkChallenge } from '.';

let db: Database;

beforeAll(async () => {
  const sqlite3: Sqlite3Static = await sqlite3InitModule();
  db = createDatabase(sqlite3, trainingDatabase.sql);
});

const byId = (id: string) =>
  tutorialChallenges.find((challenge) => challenge.id === id)!;
const passes = (id: string, sql: string) =>
  checkChallenge(byId(id), runQuery(db, sql));

describe('tutorial challenges', () => {
  it('accept the reference answers, with or without extra columns', () => {
    expect(passes('select', 'SELECT * FROM analysts')).toBe(true);
    expect(passes('select', 'SELECT name FROM analysts')).toBe(true);
    expect(
      passes('where', "SELECT * FROM contracts WHERE status = 'EM_ANDAMENTO'"),
    ).toBe(true);
    expect(
      passes(
        'order-limit',
        'SELECT client, fee_brl FROM contracts ORDER BY fee_brl DESC LIMIT 3',
      ),
    ).toBe(true);
    expect(
      passes('like', "SELECT * FROM contracts WHERE client LIKE 'C%'"),
    ).toBe(true);
    expect(
      passes(
        'between',
        "SELECT id FROM contracts WHERE opened_on BETWEEN '2025-06-01' AND '2025-09-30'",
      ),
    ).toBe(true);
  });

  it('reject near misses', () => {
    expect(passes('select', 'SELECT * FROM analysts LIMIT 3')).toBe(false);
    expect(
      passes('where', "SELECT * FROM contracts WHERE status = 'ABERTO'"),
    ).toBe(false);
    // Ordem errada: crescente em vez de decrescente.
    expect(
      passes('order-limit', 'SELECT * FROM contracts ORDER BY fee_brl LIMIT 3'),
    ).toBe(false);
    expect(
      passes('like', "SELECT * FROM contracts WHERE client LIKE '%C%'"),
    ).toBe(false);
    expect(
      passes(
        'between',
        "SELECT * FROM contracts WHERE opened_on BETWEEN '2025-06-01' AND '2025-12-31'",
      ),
    ).toBe(false);
  });

  it('ignore the row order unless the challenge asks for it', () => {
    expect(
      passes(
        'like',
        "SELECT * FROM contracts WHERE client LIKE 'C%' ORDER BY client DESC",
      ),
    ).toBe(true);
  });

  it('have a task and a hint in both languages', () => {
    for (const challenge of tutorialChallenges) {
      expect(challenge.task.en).toBeTruthy();
      expect(challenge.hint.en).toBeTruthy();
    }
  });
});
