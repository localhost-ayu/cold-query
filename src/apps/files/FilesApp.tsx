import { Database, FileHtml, FolderOpen } from '@phosphor-icons/react';
import { useState } from 'react';

import {
  caseById,
  caseDatabaseId,
  localized,
  sitesFor,
  useGameState,
} from '@/apps/shared/game';
import { terminalStore } from '@/apps/terminal/session';
import { trainingDatabase } from '@/content/databases/training';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { browserStore } from '@/store/browser-store';
import { windowStore, type AppId } from '@/store/window-store';

type Place = 'databases' | 'pages';

interface FileItem {
  key: string;
  name: string;
  detail: string;
  kind: 'database' | 'page';
  open: () => void;
}

function openApp(id: AppId) {
  windowStore
    .getState()
    .openApp(id, { width: window.innerWidth, height: window.innerHeight });
  play('open');
}

/** Arquivos no jeito do GNOME Files: lugares à esquerda, lista à direita. */
export function FilesApp() {
  const t = useT();
  const locale = useLocale();
  const cases = useGameState((state) => state.cases);
  const [place, setPlace] = useState<Place>('databases');
  const accepted = Object.entries(cases)
    .filter(([, progress]) => progress.status !== 'available')
    .map(([id]) => id)
    .sort();

  /** Abre o banco na aba ativa do Terminal. */
  function openDatabase(dbId: string) {
    const { activeTabId, setDatabase } = terminalStore.getState();
    setDatabase(activeTabId, dbId);
    openApp('terminal');
  }

  const databases: FileItem[] = [
    {
      key: trainingDatabase.id,
      name: 'nova_pericia_treino.sql',
      detail: t('terminal.db.training'),
      kind: 'database',
      open: () => openDatabase(trainingDatabase.id),
    },
    ...accepted.flatMap((caseId) => {
      const bundle = caseById.get(caseId);
      if (!bundle) return [];
      return bundle.manifest.databases.map(
        (database): FileItem => ({
          key: caseDatabaseId(caseId, database.id),
          name: database.file.split('/').pop() ?? database.file,
          detail: `${bundle.manifest.client} · ${localized(database.label, locale)}`,
          kind: 'database',
          open: () => openDatabase(caseDatabaseId(caseId, database.id)),
        }),
      );
    }),
  ];

  const pages: FileItem[] = sitesFor(accepted, locale).map(
    ({ caseId, site }) => ({
      key: `${caseId}-${site.id}`,
      name: site.title,
      detail: site.url,
      kind: 'page',
      open: () => {
        browserStore.getState().navigate(site.url);
        openApp('browser');
      },
    }),
  );

  const items = place === 'databases' ? databases : pages;
  const places: Array<{ id: Place; count: number }> = [
    { id: 'databases', count: databases.length },
    { id: 'pages', count: pages.length },
  ];

  return (
    <div className="files">
      <nav className="files__places" aria-label={t('files.places')}>
        {places.map(({ id, count }) => (
          <button
            key={id}
            type="button"
            className="files__place"
            aria-current={place === id || undefined}
            onClick={() => setPlace(id)}
          >
            {id === 'databases' ? (
              <Database weight="duotone" aria-hidden />
            ) : (
              <FileHtml weight="duotone" aria-hidden />
            )}
            <span>{t(`files.${id}`)}</span>
            <span className="files__count">{count}</span>
          </button>
        ))}
      </nav>
      <section className="files__list" aria-label={t(`files.${place}`)}>
        {items.length === 0 ? (
          <div className="status-page status-page--inline">
            <FolderOpen
              weight="duotone"
              className="status-page__glyph"
              aria-hidden
            />
            <h3>{t('files.emptyTitle')}</h3>
            <p>{t('files.emptyBody')}</p>
          </div>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="files__item"
                  title={t(
                    item.kind === 'database'
                      ? 'files.openTerminal'
                      : 'files.openBrowser',
                  )}
                  onClick={item.open}
                >
                  <span
                    className={`files__icon files__icon--${item.kind}`}
                    aria-hidden
                  >
                    {item.kind === 'database' ? (
                      <Database weight="fill" />
                    ) : (
                      <FileHtml weight="fill" />
                    )}
                  </span>
                  <span className="files__name">{item.name}</span>
                  <span className="files__detail">{item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
