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
  it('starts from the defaults until rehydrated', () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { locale: 'en' }, version: 1 }),
    );
    const store = createPreferencesStore();
    expect(store.getState().locale).toBe(defaultPreferences.locale);
  });

  it('restores saved values and ignores invalid ones', async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { locale: 'en', theme: 'neon', volume: 7, soundEnabled: false },
        version: 1,
      }),
    );
    const store = createPreferencesStore();
    await store.persist.rehydrate();
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

describe('resolveTheme', () => {
  it('follows the system only when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });
});
