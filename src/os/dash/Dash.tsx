import { AppIcon } from '@/apps/AppIcon';
import { apps } from '@/apps/registry';
import { play } from '@/os/audio';
import { useT } from '@/os/i18n';
import { shellStore } from '@/store/shell-store';
import { useWindowStore, windowStore, type AppId } from '@/store/window-store';

/** Abre (ou traz para a frente) um app e sai das Atividades. */
export function launchApp(appId: AppId) {
  const existed = windowStore.getState().windows.some((w) => w.id === appId);
  windowStore
    .getState()
    .openApp(appId, { width: window.innerWidth, height: window.innerHeight });
  shellStore.getState().setOverview(false);
  play(existed ? 'click' : 'open');
}

interface DashProps {
  className: string;
  /** No dock, clicar no app que já está na frente minimiza, como no Dash to Dock. */
  minimizeFocused?: boolean;
}

/** Fileira de apps: usada no overview e no dock que aparece pela borda de baixo. */
export function Dash({ className, minimizeFocused = false }: DashProps) {
  const t = useT();
  const windows = useWindowStore((state) => state.windows);
  const activeId = useWindowStore((state) => state.activeId);

  return (
    <nav className={className} aria-label={t('overview.dash')}>
      {apps.map(({ id }) => {
        const window = windows.find((w) => w.id === id);
        const name = t(`app.${id}`);
        return (
          <button
            key={id}
            type="button"
            className="dash__item"
            aria-label={window ? t('overview.running', { app: name }) : name}
            onClick={() => {
              if (
                minimizeFocused &&
                window &&
                !window.minimized &&
                activeId === id
              ) {
                windowStore.getState().minimizeWindow(id);
                play('minimize');
                return;
              }
              launchApp(id);
            }}
          >
            <AppIcon appId={id} size={52} />
            <span className="dash__tooltip" aria-hidden>
              {name}
            </span>
            {window ? <span className="dash__running" aria-hidden /> : null}
          </button>
        );
      })}
    </nav>
  );
}
