import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  PREFERENCES_STORAGE_KEY,
  createPreferencesStore,
  defaultPreferences,
  resolveTheme,
} from './preferences-store';

beforeEach(() => {
  window.localStorage.clear();
});

describe('preferences store', () => {
  it('restores saved values on creation and ignores invalid ones', () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { locale: 'en', theme: 'neon', volume: 7, soundEnabled: false },
        version: 1,
      }),
    );
    const store = createPreferencesStore();
    expect(store.getState()).toMatchObject({
      locale: 'en',
      theme: defaultPreferences.theme,
      volume: defaultPreferences.volume,
      soundEnabled: false,
    });
  });

  it('saves changes and clamps the volume', () => {
    const store = createPreferencesStore();
    store.getState().setTheme('dark');
    store.getState().setVolume(1.4);
    const saved = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? '{}',
    );
    expect(saved.state).toMatchObject({ theme: 'dark', volume: 1 });
  });
});

describe('theme script in index.html', () => {
  it('reads the same storage key as the store', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain(`'${PREFERENCES_STORAGE_KEY}'`);
  });
});

describe('resolveTheme', () => {
  it('follows the system only when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });
});
