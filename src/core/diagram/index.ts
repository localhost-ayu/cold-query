import type { SchemaTable } from '@/core/sql/types';

/**
 * Coluna de cada tabela no diagrama, para as setas correrem da esquerda para
 * a direita sem atravessar cartões:
 * 0 = aponta para outras tabelas, 1 = só é apontada, 2 = sem ligações.
 * Uma tabela que aponta e é apontada fica na coluna 0.
 */
export function diagramColumns(schema: SchemaTable[]): Map<string, number> {
  const referenced = new Set(
    schema.flatMap((table) => table.foreignKeys.map((key) => key.table)),
  );
  return new Map(
    schema.map((table) => [
      table.name,
      table.foreignKeys.length > 0 ? 0 : referenced.has(table.name) ? 1 : 2,
    ]),
  );
}
