import {
  CheckCircle,
  Play,
  Plus,
  PushPin,
  Stop,
  Warning,
  X,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { gameStore } from '@/apps/shared/game';
import { trainingDatabase } from '@/content/databases/training';
import type { MessageKey } from '@/core/i18n';

import { MAX_RESULT_ROWS, type QueryResult } from '@/core/sql/types';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { WindowHeaderItems } from '@/os/windows/header-slots';
import { useTerminal, type QueryTab } from '@/store/terminal-store';

import { ResultGrid } from './ResultGrid';
import {
  ensureDatabasesOpen,
  nextDatabaseToSelect,
  runShortcutLabel,
  terminalStore,
  useTerminalDatabases,
  type TerminalDatabaseEntry,
} from './session';
import { Sidebar } from './Sidebar';
import { SqlEditor, type SqlEditorHandle } from './SqlEditor';
import { SchemaDiagram } from './SchemaDiagram';
import { TutorialBanner } from './TutorialBanner';

/** Barra de abas no estilo Adwaita: só aparece quando há mais de uma consulta. */
function TabStrip() {
  const t = useT();
  const tabs = useTerminal(terminalStore, (state) => state.tabs);
  const activeTabId = useTerminal(terminalStore, (state) => state.activeTabId);
  const { selectTab, closeTab } = terminalStore.getState();

  if (tabs.length < 2) return null;
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
            <button
              type="button"
              className="query-tabs__close"
              aria-label={t('terminal.closeTab', { tab: title })}
              onClick={() => closeTab(tab.id)}
            >
              <X aria-hidden weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

type PinFeedback = { tone: 'ok' | 'warn'; key: MessageKey } | null;

/** Resultado com seleção de linhas e o botão de fixar no dossiê. */
function ResultView({
  tab,
  result,
  database,
}: {
  tab: QueryTab;
  result: QueryResult;
  database: TerminalDatabaseEntry | undefined;
}) {
  const t = useT();
  // A seleção vale só para o resultado em que foi feita: rodar de novo a zera.
  const [selection, setSelection] = useState<{
    result: QueryResult;
    rows: Set<number>;
    anchor: number | null;
  }>({ result, rows: new Set(), anchor: null });
  const selected =
    selection.result === result ? selection.rows : new Set<number>();
  const [feedback, setFeedback] = useState<PinFeedback>(null);
  const feedbackTimer = useRef<number | undefined>(undefined);
  const count = result.rows.length;

  function toggleRow(index: number, range: boolean) {
    setSelection((current) => {
      const rows = new Set(current.result === result ? current.rows : []);
      const anchor = current.result === result ? current.anchor : null;
      if (range && anchor !== null) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        for (let row = from; row <= to; row += 1) rows.add(row);
      } else if (rows.has(index)) rows.delete(index);
      else rows.add(index);
      return { result, rows, anchor: index };
    });
  }

  function show(next: PinFeedback) {
    window.clearTimeout(feedbackTimer.current);
    setFeedback(next);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 3000);
  }

  function pin() {
    if (!database?.caseId) return;
    const rows = selected.size
      ? [...selected].sort((a, b) => a - b).map((index) => result.rows[index])
      : result.rows;
    const outcome = gameStore.getState().pinEvidence({
      caseId: database.caseId,
      source: 'query',
      dbId: database.id,
      sql: tab.sql.trim(),
      columns: result.columns,
      rows,
    });
    if (!outcome.ok) {
      show({
        tone: 'warn',
        key:
          outcome.reason === 'limit'
            ? 'terminal.pinLimit'
            : 'terminal.pinInactive',
      });
      play('error');
      return;
    }
    show({
      tone: 'ok',
      key: outcome.truncated ? 'terminal.pinnedTruncated' : 'terminal.pinned',
    });
    play('click');
    setSelection({ result, rows: new Set(), anchor: null });
  }

  const canPin = Boolean(database?.caseId);

  return (
    <div className="result">
      <div className="result__meta">
        <span role="status">
          {count === 1
            ? t('terminal.rowsOne')
            : t('terminal.rowsMany', { count })}
          <span aria-hidden> · </span>
          {t('terminal.elapsed', { ms: result.elapsedMs })}
        </span>
        {result.truncated ? (
          <span className="result__warning">
            {t('terminal.truncated', { max: MAX_RESULT_ROWS })}
          </span>
        ) : null}
        <span className="result__actions">
          {feedback ? (
            <span
              className={`result__feedback result__feedback--${feedback.tone}`}
              role="status"
            >
              {feedback.tone === 'ok' ? (
                <CheckCircle weight="fill" aria-hidden />
              ) : (
                <Warning weight="fill" aria-hidden />
              )}
              {t(feedback.key)}
            </span>
          ) : null}
          {selected.size > 0 ? (
            <button
              type="button"
              className="flat-button"
              onClick={() =>
                setSelection({ result, rows: new Set(), anchor: null })
              }
            >
              {t('terminal.clearSelection')}
            </button>
          ) : null}
          <button
            type="button"
            className="pill-button pill-button--small"
            onClick={pin}
            disabled={!canPin}
            title={canPin ? undefined : t('terminal.pinTraining')}
          >
            <PushPin weight="fill" aria-hidden />
            {selected.size > 0
              ? t('terminal.pinSelected', { count: selected.size })
              : t('terminal.pin')}
          </button>
        </span>
      </div>
      <ResultGrid
        result={result}
        label={t('terminal.results')}
        selected={selected}
        onToggleRow={toggleRow}
        selectLabel={(row) => t('terminal.selectRow', { n: row })}
      />
    </div>
  );
}

function ResultArea({
  tab,
  database,
  example,
}: {
  tab: QueryTab;
  database: TerminalDatabaseEntry | undefined;
  example: string;
}) {
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
    if (tab.result.columns.length === 0 || tab.result.rows.length === 0) {
      return <div className="result-empty">{t('terminal.noRows')}</div>;
    }
    return <ResultView tab={tab} result={tab.result} database={database} />;
  }

  return (
    <div className="result-empty">
      <p className="result-empty__title">
        {t('terminal.emptyTitle', { keys: runShortcutLabel() })}
      </p>
      <p>{t('terminal.emptyHint', { example })}</p>
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
  const saved = useTerminal(terminalStore, (state) => state.saved);
  const entries = useTerminalDatabases();
  const [view, setView] = useState<'queries' | 'diagram'>('queries');
  const entry = entries.find((item) => item.id === tab.dbId);
  // Exemplo da dica com uma tabela que existe no banco escolhido.
  const example = `SELECT * FROM ${database?.schema[0]?.name ?? 'analysts'} LIMIT 10;`;
  const {
    setSql,
    setDatabase,
    run,
    stop,
    addTab,
    saveQuery,
    renameSaved,
    deleteSaved,
  } = terminalStore.getState();
  const running = tab.status === 'running';
  const ready = database?.status === 'ready';

  useEffect(() => ensureDatabasesOpen(entries), [entries]);

  // Quando um caso é aceito, a aba ativa passa para o banco dele (uma vez por banco).
  useEffect(() => {
    const fresh = nextDatabaseToSelect(entries);
    if (fresh) setDatabase(tab.id, fresh);
  }, [entries, setDatabase, tab.id]);

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
      <WindowHeaderItems side="start">
        <button
          type="button"
          className="flat-button flat-button--icon"
          aria-label={t('terminal.newTab')}
          title={t('terminal.newTab')}
          onClick={addTab}
        >
          <Plus aria-hidden weight="bold" />
        </button>
        <select
          className="dropdown"
          aria-label={t('terminal.database')}
          title={t('terminal.database')}
          value={tab.dbId}
          onChange={(event) => setDatabase(tab.id, event.target.value)}
        >
          {entries.map((item) => (
            <option value={item.id} key={item.id}>
              {item.label(locale)}
            </option>
          ))}
        </select>
      </WindowHeaderItems>
      <WindowHeaderItems side="end">
        <div
          className="segmented"
          role="tablist"
          aria-label={t('terminal.view')}
        >
          {(['queries', 'diagram'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
            >
              {t(`terminal.view.${value}`)}
            </button>
          ))}
        </div>
        {view === 'diagram' ? null : running ? (
          <button
            type="button"
            className="pill-button pill-button--destructive"
            onClick={stop}
          >
            <Stop weight="fill" aria-hidden />
            {t('terminal.stop')}
          </button>
        ) : (
          <button
            type="button"
            className="pill-button pill-button--suggested"
            onClick={execute}
            disabled={!ready}
            title={`${t('terminal.run')} (${runShortcutLabel()})`}
          >
            <Play weight="fill" aria-hidden />
            {t('terminal.run')}
          </button>
        )}
      </WindowHeaderItems>

      <TabStrip />

      <Sidebar
        schema={database?.schema ?? []}
        history={history}
        saved={saved}
        currentSql={tab.sql}
        onInsert={(text) => editor.current?.insert(text)}
        onPickHistory={(entry) => {
          setSql(tab.id, entry.sql);
          editor.current?.focus();
        }}
        onSave={(name) => saveQuery(name, tab.sql, tab.dbId)}
        onRename={renameSaved}
        onDelete={deleteSaved}
        onPickSaved={(entry) => {
          setSql(tab.id, entry.sql);
          editor.current?.focus();
        }}
      />

      <div className="terminal__main">
        <TutorialBanner
          dbId={tab.dbId}
          result={tab.status === 'done' ? tab.result : null}
          onUseTraining={() => setDatabase(tab.id, trainingDatabase.id)}
        />
        {view === 'diagram' ? (
          <div className="terminal__diagram">
            <SchemaDiagram schema={database?.schema ?? []} />
          </div>
        ) : null}
        {/* O editor fica montado no diagrama (só escondido) para não perder cursor nem desfazer. */}
        <div className="terminal__editor" hidden={view === 'diagram'}>
          <SqlEditor
            key={`${tab.id}:${locale}`}
            ref={editor}
            value={tab.sql}
            schema={database?.schema ?? []}
            label={t('terminal.editor')}
            placeholder={t('terminal.emptyHint', {
              example,
            })}
            onChange={(sql) => setSql(tab.id, sql)}
            onRun={execute}
          />
        </div>
        <div className="terminal__results" hidden={view === 'diagram'}>
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
            <ResultArea tab={tab} database={entry} example={example} />
          )}
        </div>
      </div>
    </div>
  );
}
