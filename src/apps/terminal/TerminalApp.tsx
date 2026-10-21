import { Play, Plus, Stop, Warning, X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';

import { MAX_RESULT_ROWS } from '@/core/sql/types';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { useTerminal, type QueryTab } from '@/store/terminal-store';

import { ResultGrid } from './ResultGrid';
import {
  ensureDatabasesOpen,
  runShortcutLabel,
  terminalDatabases,
  terminalStore,
} from './session';
import { Sidebar } from './Sidebar';
import { SqlEditor, type SqlEditorHandle } from './SqlEditor';

function TabStrip() {
  const t = useT();
  const tabs = useTerminal(terminalStore, (state) => state.tabs);
  const activeTabId = useTerminal(terminalStore, (state) => state.activeTabId);
  const { selectTab, closeTab, addTab } = terminalStore.getState();

  return (
    <div className="query-tabs" role="group" aria-label={t('terminal.tabs')}>
      {tabs.map((tab) => {
        const title = t('terminal.tab', { n: tab.number });
        return (
          <div
            className="query-tabs__tab"
            data-active={tab.id === activeTabId || undefined}
            key={tab.id}
          >
            <button
              type="button"
              aria-pressed={tab.id === activeTabId}
              onClick={() => selectTab(tab.id)}
              // Botão do meio fecha, como em navegador.
              onAuxClick={(event) => event.button === 1 && closeTab(tab.id)}
            >
              {tab.status === 'running' ? (
                <span className="spinner spinner--small" aria-hidden />
              ) : null}
              {title}
            </button>
            {tabs.length > 1 ? (
              <button
                type="button"
                className="query-tabs__close"
                aria-label={t('terminal.closeTab', { tab: title })}
                onClick={() => closeTab(tab.id)}
              >
                <X aria-hidden />
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        className="icon-button"
        aria-label={t('terminal.newTab')}
        title={t('terminal.newTab')}
        onClick={addTab}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}

function ResultArea({ tab }: { tab: QueryTab }) {
  const t = useT();

  if (tab.status === 'running') {
    return (
      <div className="result-empty" role="status">
        <span className="spinner" aria-hidden />
        {t('terminal.running')}
      </div>
    );
  }

  if (tab.status === 'error' && tab.error) {
    const { code, params, raw } = tab.error;
    return (
      <div className="result-error" role="alert">
        <Warning weight="fill" aria-hidden />
        <div>
          <strong>{t('sqlError.title')}</strong>
          <p>{t(`sqlError.${code}`, params)}</p>
          {raw ? (
            <p className="result-error__raw">
              <span>{t('sqlError.detail')}:</span> <code>{raw}</code>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (tab.status === 'done' && tab.result) {
    const { result } = tab;
    const count = result.rows.length;
    if (result.columns.length === 0 || count === 0) {
      return <div className="result-empty">{t('terminal.noRows')}</div>;
    }
    return (
      <div className="result">
        <div className="result__meta" role="status">
          <span>
            {count === 1
              ? t('terminal.rowsOne')
              : t('terminal.rowsMany', { count })}
          </span>
          <span aria-hidden>·</span>
          <span>{t('terminal.elapsed', { ms: result.elapsedMs })}</span>
          {result.truncated ? (
            <span className="result__warning">
              {t('terminal.truncated', { max: MAX_RESULT_ROWS })}
            </span>
          ) : null}
        </div>
        <ResultGrid result={result} label={t('terminal.results')} />
      </div>
    );
  }

  return (
    <div className="result-empty">
      <p className="result-empty__title">
        {t('terminal.emptyTitle', { keys: runShortcutLabel() })}
      </p>
      <p>{t('terminal.emptyHint', { example: 'SELECT * FROM analysts;' })}</p>
    </div>
  );
}

export function TerminalApp() {
  const t = useT();
  const locale = useLocale();
  const editor = useRef<SqlEditorHandle>(null);
  const tab = useTerminal(
    terminalStore,
    (state) => state.tabs.find((item) => item.id === state.activeTabId)!,
  );
  const database = useTerminal(
    terminalStore,
    (state) => state.databases[tab.dbId],
  );
  const history = useTerminal(terminalStore, (state) => state.history);
  const { setSql, setDatabase, run, stop } = terminalStore.getState();
  const running = tab.status === 'running';
  const ready = database?.status === 'ready';

  useEffect(ensureDatabasesOpen, []);

  // Erros soam uma vez por execução, não a cada render.
  const lastStatus = useRef(tab.status);
  useEffect(() => {
    if (lastStatus.current === 'running' && tab.status === 'error')
      play('error');
    lastStatus.current = tab.status;
  }, [tab.status]);

  const execute = () => {
    if (ready && !running) void run(tab.id);
  };

  return (
    <div className="terminal">
      <div className="terminal__toolbar">
        <TabStrip />
        <label className="terminal__db">
          <span>{t('terminal.database')}</span>
          <select
            value={tab.dbId}
            onChange={(event) => setDatabase(tab.id, event.target.value)}
          >
            {terminalDatabases.map(({ source, labelKey }) => (
              <option value={source.id} key={source.id}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Sidebar
        schema={database?.schema ?? []}
        history={history}
        onInsert={(text) => editor.current?.insert(text)}
        onPickHistory={(entry) => {
          setSql(tab.id, entry.sql);
          editor.current?.focus();
        }}
      />

      <div className="terminal__main">
        <div className="terminal__editor">
          <SqlEditor
            key={`${tab.id}:${locale}`}
            ref={editor}
            value={tab.sql}
            schema={database?.schema ?? []}
            label={t('terminal.editor')}
            placeholder={t('terminal.emptyHint', {
              example: 'SELECT * FROM analysts;',
            })}
            onChange={(sql) => setSql(tab.id, sql)}
            onRun={execute}
          />
          <div className="terminal__actions">
            {running ? (
              <button
                type="button"
                className="button button--danger"
                onClick={stop}
              >
                <Stop weight="fill" aria-hidden />
                {t('terminal.stop')}
              </button>
            ) : (
              <button
                type="button"
                className="button button--primary"
                onClick={execute}
                disabled={!ready}
              >
                <Play weight="fill" aria-hidden />
                {t('terminal.run')}
                <kbd>{runShortcutLabel()}</kbd>
              </button>
            )}
          </div>
        </div>
        <section
          className="terminal__results"
          aria-label={t('terminal.results')}
        >
          {database?.status === 'loading' ? (
            <div className="result-empty" role="status">
              <span className="spinner" aria-hidden />
              {t('terminal.booting')}
            </div>
          ) : database?.status === 'error' ? (
            <div className="result-error" role="alert">
              <Warning weight="fill" aria-hidden />
              <div>
                <strong>{t('sqlError.engine')}</strong>
                {database.error?.raw ? (
                  <p className="result-error__raw">
                    <code>{database.error.raw}</code>
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <ResultArea tab={tab} />
          )}
        </section>
      </div>
    </div>
  );
}
