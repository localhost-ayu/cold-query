import { describe, expect, it } from 'vitest';

import { NOTIFICATION_LIMIT, createShellStore } from './shell-store';

const note = {
  appId: 'mail' as const,
  sender: 'Helena Duarte',
  body: 'Contrato 112: notebook sumido na Vantara Logística',
};

describe('shell store', () => {
  it('starts locked, and locking clears the overview, menus and banner', () => {
    const store = createShellStore();
    expect(store.getState().locked).toBe(true);
    store.getState().unlock();
    store.getState().notify(note);
    store.getState().togglePopover('calendar');
    store.getState().setOverview(true);
    store.getState().lock();
    expect(store.getState()).toMatchObject({
      locked: true,
      overviewOpen: false,
      popover: null,
      bannerId: null,
    });
    // As notificações continuam na lista; só o banner sai.
    expect(store.getState().notifications).toHaveLength(1);
  });

  it('opening the overview closes any top bar menu', () => {
    const store = createShellStore();
    store.getState().togglePopover('quickSettings');
    expect(store.getState().popover).toBe('quickSettings');
    store.getState().toggleOverview();
    expect(store.getState()).toMatchObject({
      overviewOpen: true,
      popover: null,
    });
  });

  it('opening a menu leaves the overview, and toggling twice closes it', () => {
    const store = createShellStore();
    store.getState().setOverview(true);
    store.getState().togglePopover('calendar');
    expect(store.getState()).toMatchObject({
      overviewOpen: false,
      popover: 'calendar',
    });
    store.getState().togglePopover('calendar');
    expect(store.getState().popover).toBeNull();
  });

  it('shows new notifications as a banner and keeps the newest first', () => {
    const store = createShellStore();
    store.getState().notify(note);
    store.getState().notify({ ...note, sender: 'Marta Vidal' });
    const [newest] = store.getState().notifications;
    expect(newest.sender).toBe('Marta Vidal');
    expect(store.getState().bannerId).toBe(newest.id);
    store.getState().dismissBanner();
    expect(store.getState().bannerId).toBeNull();
    expect(store.getState().notifications).toHaveLength(2);
  });

  it('caps the list and marks everything as read', () => {
    const store = createShellStore();
    for (let i = 0; i < NOTIFICATION_LIMIT + 3; i += 1) {
      store.getState().notify(note);
    }
    expect(store.getState().notifications).toHaveLength(NOTIFICATION_LIMIT);
    store.getState().markAllRead();
    expect(store.getState().notifications.every((item) => item.read)).toBe(
      true,
    );
  });
});
