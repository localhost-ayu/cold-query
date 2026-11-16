import { ArrowRight, Key, Table } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { diagramColumns } from '@/core/diagram';
import type { SchemaTable } from '@/core/sql/types';
import { useT } from '@/os/i18n';

interface Link {
  id: string;
  from: string;
  to: string;
  d: string;
}

/** Curva de Bézier horizontal entre dois pontos: sai e chega na lateral dos cartões. */
function curve(x1: number, y1: number, x2: number, y2: number) {
  const bend = Math.max(40, Math.abs(x2 - x1) / 2);
  const direction = x2 >= x1 ? 1 : -1;
  return `M${x1} ${y1} C${x1 + bend * direction} ${y1} ${x2 - bend * direction} ${y2} ${x2} ${y2}`;
}

/**
 * Diagrama do banco: um cartão por tabela e uma linha para cada chave
 * estrangeira (coluna REFERENCES outra tabela). Os cartões ficam numa grade
 * do CSS; as linhas são medidas depois do layout e redesenhadas quando o
 * tamanho muda.
 */
export function SchemaDiagram({ schema }: { schema: SchemaTable[] }) {
  const t = useT();
  const canvas = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      const row = (table: string, column: string) =>
        element
          .querySelector(`[data-column="${CSS.escape(`${table}.${column}`)}"]`)
          ?.getBoundingClientRect();
      const next: Link[] = [];
      for (const table of schema) {
        for (const key of table.foreignKeys) {
          const from = row(table.name, key.column);
          const to = row(key.table, key.refColumn);
          if (!from || !to) continue;
          // Sai pelo lado do cartão que fica de frente para o destino.
          const toRight = to.left >= from.right;
          const x1 =
            (toRight ? from.right : from.left) - box.left + element.scrollLeft;
          const x2 =
            (toRight ? to.left : to.right) - box.left + element.scrollLeft;
          const y1 = from.top + from.height / 2 - box.top + element.scrollTop;
          const y2 = to.top + to.height / 2 - box.top + element.scrollTop;
          next.push({
            id: `${table.name}.${key.column}->${key.table}.${key.refColumn}`,
            from: table.name,
            to: key.table,
            d: curve(x1, y1, x2, y2),
          });
        }
      }
      setLinks(next);
    };
    // O ResizeObserver chama measure já na primeira observação e a cada mudança de tamanho.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [schema]);

  if (schema.length === 0) return null;
  const columns = diagramColumns(schema);
  const columnCount = Math.max(...columns.values()) + 1;
  const related = (name: string) =>
    focused !== null &&
    (focused === name ||
      links.some(
        (link) =>
          (link.from === focused && link.to === name) ||
          (link.to === focused && link.from === name),
      ));

  return (
    <div className="diagram" ref={canvas}>
      <svg className="diagram__links" aria-hidden>
        <defs>
          <marker
            id="diagram-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" />
          </marker>
        </defs>
        {links.map((link) => (
          <path
            key={link.id}
            d={link.d}
            markerEnd="url(#diagram-arrow)"
            data-active={
              focused !== null && (focused === link.from || focused === link.to)
                ? true
                : undefined
            }
          />
        ))}
      </svg>
      <ul
        className="diagram__grid"
        aria-label={t('terminal.diagram')}
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(220px, 260px))`,
        }}
      >
        {schema.map((table) => (
          <li
            key={table.name}
            className="diagram__table"
            style={{ gridColumn: (columns.get(table.name) ?? 0) + 1 }}
            data-related={related(table.name) || undefined}
            onPointerEnter={() => setFocused(table.name)}
            onPointerLeave={() => setFocused(null)}
          >
            <h3 className="diagram__title">
              <Table weight="duotone" aria-hidden />
              {table.name}
            </h3>
            <ul className="diagram__columns">
              {table.columns.map((column) => {
                const key = table.foreignKeys.find(
                  (fk) => fk.column === column.name,
                );
                return (
                  <li
                    key={column.name}
                    data-column={`${table.name}.${column.name}`}
                  >
                    <span className="diagram__name">
                      {column.primaryKey ? (
                        <Key
                          aria-label={t('terminal.primaryKey')}
                          className="diagram__pk"
                        />
                      ) : null}
                      {column.name}
                    </span>
                    {key ? (
                      <span
                        className="diagram__ref"
                        title={`${key.table}.${key.refColumn}`}
                      >
                        <ArrowRight aria-hidden />
                        <span className="diagram__ref-text">
                          {key.table}.{key.refColumn}
                        </span>
                      </span>
                    ) : (
                      <span className="diagram__type">
                        {column.type.toLowerCase()}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {schema.every((table) => table.foreignKeys.length === 0) ? null : (
        <p className="diagram__legend">{t('terminal.diagramLegend')}</p>
      )}
    </div>
  );
}
