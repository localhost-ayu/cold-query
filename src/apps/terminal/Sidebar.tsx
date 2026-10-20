'use client';

import {
  CaretRight,
  ClockCounterClockwise,
  Key,
  Table,
} from '@phosphor-icons/react';
import { useState } from 'react';

import type { SchemaTable } from '@/core/sql/types';
import { useT } from '@/os/i18n';
import type { HistoryEntry } from '@/store/terminal-store';

interface SidebarProps {
  schema: SchemaTable[];
  history: HistoryEntry[];
  onInsert: (text: string) => void;
  onPickHistory: (entry: HistoryEntry) => void;
}

type Panel = 'schema' | 'history';

export function Sidebar({
  schema,
  history,
  onInsert,
  onPickHistory,
}: SidebarProps) {
  const t = useT();
  const [panel, setPanel] = useState<Panel>('schema');
  // Tabelas começam abertas; o jogador fecha as que não interessam.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside className="terminal__sidebar">
      <div
        className="segmented segmented--compact"
        role="tablist"
        aria-label={t('terminal.schema')}
      >
        {(['schema', 'history'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`terminal-tab-${id}`}
            aria-selected={panel === id}
            aria-controls={`terminal-panel-${id}`}
            onClick={() => setPanel(id)}
          >
            {t(`terminal.${id}`)}
          </button>
        ))}
      </div>

      {panel === 'schema' ? (
        <div
          className="sidebar-panel"
          role="tabpanel"
          id="terminal-panel-schema"
          aria-labelledby="terminal-tab-schema"
        >
          <ul className="schema">
            {schema.map((table) => {
              const open = !collapsed[table.name];
              return (
                <li key={table.name}>
                  <div className="schema__table">
                    <button
                      type="button"
                      className="schema__toggle"
                      aria-expanded={open}
                      aria-label={table.name}
                      onClick={() =>
                        setCollapsed((state) => ({
                          ...state,
                          [table.name]: open,
                        }))
                      }
                    >
                      <CaretRight aria-hidden className="schema__caret" />
                    </button>
                    <button
                      type="button"
                      className="schema__name"
                      title={t('terminal.insert', { name: table.name })}
                      onClick={() => onInsert(table.name)}
                    >
                      <Table aria-hidden />
                      {table.name}
                    </button>
                  </div>
                  {open ? (
                    <ul className="schema__columns">
                      {table.columns.map((column) => (
                        <li key={column.name}>
                          <button
                            type="button"
                            className="schema__column"
                            title={t('terminal.insert', { name: column.name })}
                            onClick={() => onInsert(column.name)}
                          >
                            <span>{column.name}</span>
                            {column.primaryKey ? (
                              <Key
                                aria-label={t('terminal.primaryKey')}
                                className="schema__pk"
                              />
                            ) : null}
                            <span className="schema__type">
                              {column.type.toLowerCase()}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div
          className="sidebar-panel"
          role="tabpanel"
          id="terminal-panel-history"
          aria-labelledby="terminal-tab-history"
        >
          {history.length === 0 ? (
            <p className="sidebar-panel__empty">
              <ClockCounterClockwise aria-hidden />
              {t('terminal.historyEmpty')}
            </p>
          ) : (
            <ul className="history">
              {history.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="history__entry"
                    data-failed={!entry.ok || undefined}
                    onClick={() => onPickHistory(entry)}
                  >
                    <code>{entry.sql}</code>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
