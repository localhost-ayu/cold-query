import { apps } from '@/apps/registry';
import { play } from '@/os/audio';
import { useT } from '@/os/i18n';
import { useWindowStore, windowStore } from '@/store/window-store';

export function Dock() {
  const t = useT();
  const windows = useWindowStore((state) => state.windows);
  const activeId = useWindowStore((state) => state.activeId);

  return (
    <nav className="dock" aria-label={t('dock.label')}>
      {apps.map(({ id, icon: AppIcon }) => {
        const item = windows.find((window) => window.id === id);
        const name = t(`app.${id}`);
        return (
          <button
            className="dock__item"
            data-active={
              (item && !item.minimized && activeId === id) || undefined
            }
            key={id}
            type="button"
            aria-label={item ? t('dock.running', { app: name }) : name}
            onClick={() => {
              const state = windowStore.getState();
              // Clicar no app que já está na frente minimiza, como nos docks de verdade.
              if (item && !item.minimized && state.activeId === id) {
                state.minimizeWindow(id);
                play('minimize');
                return;
              }
              state.openApp(id, {
                width: window.innerWidth,
                height: window.innerHeight,
              });
              play(item ? 'click' : 'open');
            }}
          >
            <span className={`dock__icon dock__icon--${id}`}>
              <AppIcon weight="duotone" aria-hidden />
            </span>
            <span className="dock__tooltip" aria-hidden>
              {name}
            </span>
            {item ? <span className="dock__indicator" aria-hidden /> : null}
          </button>
        );
      })}
    </nav>
  );
}
