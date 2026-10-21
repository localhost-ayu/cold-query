import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';

import type { QueryResult, SqlValue } from '@/core/sql/types';

const ROW_HEIGHT = 28;
const CHAR_WIDTH = 7.8;
const MIN_COLUMN = 72;
const MAX_COLUMN = 340;

/** Largura de cada coluna estimada pelo maior texto entre o cabeçalho e as primeiras linhas. */
function columnWidths(result: QueryResult): number[] {
  const sample = result.rows.slice(0, 200);
  return result.columns.map((name, index) => {
    const longest = sample.reduce(
      (max, row) => Math.max(max, String(row[index] ?? 'NULL').length),
      name.length,
    );
    return Math.min(
      MAX_COLUMN,
      Math.max(MIN_COLUMN, Math.ceil(longest * CHAR_WIDTH) + 24),
    );
  });
}

function Cell({ value }: { value: SqlValue }) {
  if (value === null)
    return (
      <span className="grid__cell grid__cell--null" role="cell">
        NULL
      </span>
    );
  return (
    <span
      className={`grid__cell${typeof value === 'number' ? ' grid__cell--number' : ''}`}
      role="cell"
      title={String(value)}
    >
      {String(value)}
    </span>
  );
}

interface ResultGridProps {
  result: QueryResult;
  label: string;
  /** Linhas marcadas para fixar no dossiê (índices). */
  selected: ReadonlySet<number>;
  /** `range`: Shift pressionado, marca do último clique até aqui. */
  onToggleRow: (index: number, range: boolean) => void;
  selectLabel: (row: number) => string;
}

const INDEX_COLUMN = 72;

/** Tabela virtualizada: só as linhas visíveis existem no DOM, então 1000 linhas rolam liso. */
export function ResultGrid({
  result,
  label,
  selected,
  onToggleRow,
  selectLabel,
}: ResultGridProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const widths = useMemo(() => columnWidths(result), [result]);
  // Coluna numérica (primeiro valor não nulo é número) alinha o cabeçalho à direita, junto dos valores.
  const numeric = useMemo(
    () =>
      result.columns.map(
        (_, index) =>
          typeof result.rows.find((row) => row[index] !== null)?.[index] ===
          'number',
      ),
    [result],
  );
  const template = `${INDEX_COLUMN}px ${widths.map((width) => `${width}px`).join(' ')}`;
  const totalWidth =
    INDEX_COLUMN + widths.reduce((sum, width) => sum + width, 0);

  // eslint-disable-next-line react-hooks/incompatible-library -- o virtualizador é a fonte das medidas, não precisa de memo do compilador
  const virtualizer = useVirtualizer({
    count: result.rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <div
      className="grid"
      ref={scroller}
      role="table"
      aria-label={label}
      aria-rowcount={result.rows.length + 1}
      tabIndex={0}
    >
      <div className="grid__inner" style={{ width: totalWidth }}>
        <div
          className="grid__row grid__row--head"
          role="row"
          aria-rowindex={1}
          style={{ gridTemplateColumns: template }}
        >
          <span className="grid__cell grid__cell--index" role="columnheader">
            #
          </span>
          {result.columns.map((column, index) => (
            <span
              className={`grid__cell${numeric[index] ? ' grid__cell--number' : ''}`}
              role="columnheader"
              key={`${column}-${index}`}
            >
              {column}
            </span>
          ))}
        </div>
        <div
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => (
            // O clique na linha é atalho de mouse; pelo teclado, a caixa de seleção faz o mesmo.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
            <div
              key={virtualRow.key}
              className="grid__row"
              role="row"
              aria-rowindex={virtualRow.index + 2}
              data-selected={selected.has(virtualRow.index) || undefined}
              style={{
                gridTemplateColumns: template,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              // Clicar na linha também marca; a caixa é o caminho pelo teclado.
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('input')) return;
                onToggleRow(virtualRow.index, event.shiftKey);
              }}
            >
              <span className="grid__cell grid__cell--index" role="cell">
                <input
                  type="checkbox"
                  className="grid__check"
                  checked={selected.has(virtualRow.index)}
                  aria-label={selectLabel(virtualRow.index + 1)}
                  onChange={(event) =>
                    onToggleRow(
                      virtualRow.index,
                      (event.nativeEvent as MouseEvent).shiftKey ?? false,
                    )
                  }
                />
                {virtualRow.index + 1}
              </span>
              {result.rows[virtualRow.index].map((value, index) => (
                <Cell value={value} key={index} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
