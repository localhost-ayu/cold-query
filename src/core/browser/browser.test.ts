import { describe, expect, it } from 'vitest';

import { createBrowserStore, START_PAGE } from '@/store/browser-store';

import { isInternalUrl, normalizeUrl, resolveLink } from '.';

describe('browser addresses', () => {
  it('normalizes scheme, case and trailing slashes', () => {
    expect(
      normalizeUrl('https://Intranet.Vantara.example/politica-acesso/'),
    ).toBe('intranet.vantara.example/politica-acesso');
    expect(normalizeUrl('  intranet.vantara.example/ ')).toBe(
      'intranet.vantara.example',
    );
  });

  it('only accepts .example hosts', () => {
    expect(isInternalUrl('intranet.vantara.example/x')).toBe(true);
    expect(isInternalUrl('https://github.com')).toBe(false);
    expect(isInternalUrl('example.com')).toBe(false);
  });

  it('resolves relative, root and absolute links', () => {
    const home = 'intranet.vantara.example';
    expect(resolveLink(home, 'politica-acesso')).toBe(
      'intranet.vantara.example/politica-acesso',
    );
    expect(resolveLink(`${home}/rh/ferias`, 'ponto')).toBe(
      'intranet.vantara.example/rh/ponto',
    );
    expect(resolveLink(`${home}/rh/ferias`, '/')).toBe(home);
    expect(resolveLink(home, 'https://wiki.vantara.example/a')).toBe(
      'wiki.vantara.example/a',
    );
  });
});

describe('browser history', () => {
  it('goes back and forward, and a new visit drops the forward stack', () => {
    const store = createBrowserStore();
    const { navigate } = store.getState();
    navigate('a.example');
    navigate('a.example/b');
    store.getState().back();
    expect(store.getState().entries[store.getState().index]).toBe('a.example');
    store.getState().forward();
    expect(store.getState().entries[store.getState().index]).toBe(
      'a.example/b',
    );
    store.getState().back();
    navigate('a.example/c');
    expect(store.getState().entries).toEqual([
      START_PAGE,
      'a.example',
      'a.example/c',
    ]);
  });

  it('ignores visiting the page already open', () => {
    const store = createBrowserStore();
    store.getState().navigate('a.example');
    store.getState().navigate('https://a.example/');
    expect(store.getState().entries).toHaveLength(2);
  });
});
