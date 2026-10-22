import { describe, expect, it } from 'vitest';

import {
  MIN_HEIGHT,
  MIN_WIDTH,
  TOP_BAR_HEIGHT,
  createWindowStore,
  type AppId,
} from './window-store';

const viewport = { width: 1200, height: 800 };

function storeWith(...ids: AppId[]) {
  const store = createWindowStore();
  for (const id of ids) store.getState().openApp(id, viewport);
  return store;
}

const find = (store: ReturnType<typeof createWindowStore>, id: AppId) =>
  store.getState().windows.find((item) => item.id === id);

describe('window store', () => {
  it('opens one window per app and brings an open one to the front', () => {
    const store = storeWith('mail', 'terminal', 'mail');
    expect(store.getState().windows).toHaveLength(2);
    expect(store.getState().activeId).toBe('mail');
    expect(find(store, 'mail')?.zIndex).toBe(3);
  });

  it('fits new windows inside a small viewport', () => {
    const store = createWindowStore();
    store.getState().openApp('terminal', { width: 900, height: 600 });
    const item = find(store, 'terminal')!;
    expect(item.x + item.width).toBeLessThanOrEqual(900);
    expect(item.y + item.height).toBeLessThanOrEqual(600 - 92);
  });

  it('minimizes the active window and focuses the next visible one', () => {
    const store = storeWith('mail', 'terminal');
    store.getState().minimizeWindow('terminal');
    expect(store.getState().activeId).toBe('mail');
    expect(find(store, 'terminal')?.minimized).toBe(true);
  });

  it('maximizes and restores the exact previous geometry', () => {
    const store = storeWith('mail');
    const before = { ...find(store, 'mail')! };
    store.getState().toggleMaximize('mail', viewport);
    expect(find(store, 'mail')).toMatchObject({
      x: 0,
      y: TOP_BAR_HEIGHT,
      width: 1200,
      maximized: true,
    });
    store.getState().toggleMaximize('mail', viewport);
    expect(find(store, 'mail')).toMatchObject({
      x: before.x,
      y: before.y,
      width: before.width,
      height: before.height,
      maximized: false,
    });
  });

  it('snaps to either half and gets its size back when dragged away', () => {
    const store = storeWith('mail');
    const before = { ...find(store, 'mail')! };
    store.getState().snapWindow('mail', 'right', viewport);
    expect(find(store, 'mail')).toMatchObject({
      x: 600,
      width: 600,
      snap: 'right',
    });

    store.getState().moveWindow('mail', 100, 40, viewport);
    expect(find(store, 'mail')).toMatchObject({
      x: 100,
      y: 40,
      width: before.width,
      height: before.height,
      snap: null,
    });
  });

  it('constrains resizing to minimums and the usable area', () => {
    const store = storeWith('mail');
    store
      .getState()
      .resizeWindow('mail', { x: -40, y: 0, width: 10, height: 10 }, viewport);
    expect(find(store, 'mail')).toMatchObject({
      x: 0,
      y: TOP_BAR_HEIGHT,
      width: MIN_WIDTH,
      height: MIN_HEIGHT,
    });
  });

  it('cycles focus through every visible window', () => {
    const store = storeWith('mail', 'terminal', 'notes');
    const order: Array<AppId | null> = [];
    for (let i = 0; i < 3; i += 1) {
      store.getState().cycleFocus();
      order.push(store.getState().activeId);
    }
    expect(order).toEqual(['mail', 'terminal', 'notes']);
  });

  it('closes a window and focuses what is left', () => {
    const store = storeWith('mail', 'terminal');
    store.getState().closeWindow('terminal');
    expect(store.getState().windows.map((item) => item.id)).toEqual(['mail']);
    expect(store.getState().activeId).toBe('mail');
  });
});
