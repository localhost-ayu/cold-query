import { MagnifyingGlass } from '@phosphor-icons/react';
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { AppIcon } from '@/apps/AppIcon';
import { apps } from '@/apps/registry';
import { translate } from '@/core/i18n';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { motionTokens } from '@/os/motion';
import { shellStore, useShell } from '@/store/shell-store';
import { windowStore, useWindowStore, type AppId } from '@/store/window-store';

function launch(appId: AppId) {
  const existed = windowStore.getState().windows.some((w) => w.id === appId);
  windowStore
    .getState()
    .openApp(appId, { width: window.innerWidth, height: window.innerHeight });
  shellStore.getState().setOverview(false);
  play(existed ? 'click' : 'open');
}

/** Remove acentos e caixa para "notas" achar "Notas" e "ajuda" achar "Ajuda". */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function Dash() {
  const t = useT();
  const windows = useWindowStore((state) => state.windows);
  return (
    <nav className="dash" aria-label={t('overview.dash')}>
      {apps.map(({ id }) => {
        const running = windows.some((w) => w.id === id);
        const name = t(`app.${id}`);
        return (
          <button
            key={id}
            type="button"
            className="dash__item"
            aria-label={running ? t('overview.running', { app: name }) : name}
            onClick={() => launch(id)}
          >
            <AppIcon appId={id} size={52} />
            <span className="dash__tooltip" aria-hidden>
              {name}
            </span>
            {running ? <span className="dash__running" aria-hidden /> : null}
          </button>
        );
      })}
    </nav>
  );
}

function SearchResults({ query }: { query: string }) {
  const t = useT();
  const locale = useLocale();
  const needle = normalize(query);
  // Procura no nome do app nos dois idiomas: quem digita "terminal" ou "notes" acha.
  const results = apps.filter(({ id }) =>
    [translate(`app.${id}`, locale), translate(`app.${id}`, 'en'), id].some(
      (name) => normalize(name).includes(needle),
    ),
  );

  if (results.length === 0) {
    return <p className="search-results__empty">{t('overview.noResults')}</p>;
  }
  return (
    <ul className="search-results">
      {results.map(({ id }) => (
        <li key={id}>
          <button
            type="button"
            className="search-results__item"
            onClick={() => launch(id)}
          >
            <AppIcon appId={id} size={72} />
            <span>{t(`app.${id}`)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Atividades: busca no topo, janelas organizadas no meio (o WindowManager
 * cuida delas) e o dash embaixo. Esc ou clique no fundo voltam ao desktop.
 */
export function Overview() {
  const t = useT();
  const open = useShell((state) => state.overviewOpen);
  const hasWindows = useWindowStore((state) => state.windows.length > 0);
  const query = useShell((state) => state.overviewQuery);
  const search = useRef<HTMLInputElement>(null);

  // Ao abrir, o foco vai para a busca: é só começar a digitar.
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') shellStore.getState().setOverview(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        // O contêiner não anima nem cria camada própria: se criasse, busca e dash
        // ficariam atrás das janelas. A animação fica nos filhos.
        <m.div key="overview" className="overview" exit={{}}>
          <m.button
            type="button"
            className="overview__backdrop"
            tabIndex={-1}
            aria-hidden
            onClick={() => shellStore.getState().setOverview(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: motionTokens.spatial }}
            exit={{ opacity: 0, transition: motionTokens.exit }}
          />
          <m.div
            className="overview__search"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: motionTokens.enter }}
            exit={{ opacity: 0, transition: motionTokens.exit }}
          >
            <MagnifyingGlass aria-hidden />
            <input
              ref={search}
              type="search"
              value={query}
              placeholder={t('overview.search')}
              aria-label={t('overview.search')}
              onChange={(event) =>
                shellStore.getState().setOverviewQuery(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !query.trim()) return;
                const first = document.querySelector<HTMLButtonElement>(
                  '.search-results__item',
                );
                first?.click();
              }}
            />
          </m.div>
          {query.trim() ? (
            <SearchResults query={query} />
          ) : !hasWindows ? (
            <p className="overview__empty">{t('overview.empty')}</p>
          ) : null}
          <Dash />
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
