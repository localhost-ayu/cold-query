import type { SchemaTable } from '@/core/sql/types';

/**
 * Coluna de cada tabela no diagrama, para as setas correrem da esquerda para
 * a direita. Cada tabela fica uma coluna à esquerda da tabela mais "funda"
 * para onde aponta (pagamentos → faturas → fornecedores → funcionários);
 * tabelas sem nenhuma ligação vão para uma coluna própria, no fim.
 */
export function diagramColumns(schema: SchemaTable[]): Map<string, number> {
  const byName = new Map(schema.map((table) => [table.name, table]));
  const referenced = new Set(
    schema.flatMap((table) => table.foreignKeys.map((key) => key.table)),
  );

  // Profundidade: 0 para quem não aponta para ninguém; senão 1 + a maior
  // profundidade dos alvos. `visiting` corta ciclos (tabela que aponta para si).
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (name: string): number => {
    const known = depth.get(name);
    if (known !== undefined) return known;
    if (visiting.has(name)) return 0;
    visiting.add(name);
    const targets = (byName.get(name)?.foreignKeys ?? [])
      .map((key) => key.table)
      .filter((target) => target !== name && byName.has(target));
    const value =
      targets.length === 0 ? 0 : 1 + Math.max(...targets.map(depthOf));
    visiting.delete(name);
    depth.set(name, value);
    return value;
  };

  const linked = schema.filter(
    (table) => table.foreignKeys.length > 0 || referenced.has(table.name),
  );
  const deepest = Math.max(0, ...linked.map((table) => depthOf(table.name)));
  const loose = linked.length > 0 ? deepest + 1 : 0;
  return new Map(
    schema.map((table) => [
      table.name,
      linked.includes(table) ? deepest - depthOf(table.name) : loose,
    ]),
  );
}
