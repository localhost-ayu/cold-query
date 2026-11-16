// @vitest-environment node
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { describe, expect, it } from 'vitest';

import { createDatabase, runQuery } from '@/core/sql/database';

import { trainingDatabase } from './databases/training';
import { helpTopics } from './help';

describe('help topics', () => {
  it('run every example on the training database and get rows back', async () => {
    (globalThis as { sqlite3ApiConfig?: object }).sqlite3ApiConfig = {
      warn: () => {},
    };
    const sqlite3 = await sqlite3InitModule();
    const db = createDatabase(sqlite3, trainingDatabase.sql);
    for (const topic of helpTopics) {
      if (!topic.example) continue;
      const result = runQuery(db, topic.example, 1000);
      expect(result.rows.length, topic.concept).toBeGreaterThan(0);
    }
    db.close();
  });

  it('cover every concept the cases teach', async () => {
    const { cases } = await import('virtual:cases');
    const concepts = new Set(helpTopics.map((topic) => topic.concept));
    for (const bundle of cases)
      for (const concept of bundle.manifest.sqlConcepts)
        expect(concepts.has(concept), `${bundle.manifest.id}: ${concept}`).toBe(
          true,
        );
  });
});
