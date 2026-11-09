import type { Evidence } from '@/core/resolution';
import type { SqlValue } from '@/core/sql/types';

/** Um momento tirado de uma linha fixada no dossiê. */
export interface TimelineEvent {
  key: string;
  evidenceId: string;
  /** Data e hora ordenáveis como texto: "AAAA-MM-DD HH:MM:SS" (ou só a data). */
  at: string;
  day: string;
  time: string | null;
  /** Coluna de onde veio o horário (event_time, clock_out...). */
  source: string;
  /** As outras células da linha, para dar contexto. */
  cells: Array<{ column: string; value: SqlValue }>;
}

const DATETIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(?::\d{2})?$/;

const withSeconds = (time: string) => (time.length === 5 ? `${time}:00` : time);

/**
 * Linha do tempo das evidências de consulta. Para cada linha:
 * - cada célula com data e hora vira um evento;
 * - sem isso, data + horas separadas (como no ponto) viram um evento por hora;
 * - só com data, vira um evento do dia inteiro.
 * Linhas iguais fixadas mais de uma vez aparecem uma vez só.
 */
export function extractTimeline(evidence: Evidence[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const seen = new Set<string>();

  for (const item of evidence) {
    if (item.source !== 'query') continue;
    item.rows.forEach((row, rowIndex) => {
      const text = row.map((cell) =>
        typeof cell === 'string' ? cell.trim() : null,
      );
      const datetimes = text.flatMap((cell, i) =>
        cell && DATETIME.test(cell) ? [i] : [],
      );
      const dates = text.flatMap((cell, i) =>
        cell && DATE.test(cell) ? [i] : [],
      );
      const times = text.flatMap((cell, i) =>
        cell && TIME.test(cell) ? [i] : [],
      );

      const moments: Array<{
        day: string;
        time: string | null;
        used: number[];
        source: number;
      }> =
        datetimes.length > 0
          ? datetimes.map((i) => {
              const [, day, time] = text[i]!.match(DATETIME)!;
              return { day, time: withSeconds(time), used: [i], source: i };
            })
          : dates.length > 0 && times.length > 0
            ? times.map((i) => ({
                day: text[dates[0]]!,
                time: withSeconds(text[i]!),
                used: [dates[0], i],
                source: i,
              }))
            : dates.map((i) => ({
                day: text[i]!,
                time: null,
                used: [i],
                source: i,
              }));

      for (const moment of moments) {
        // Contexto: as células que não viraram data/hora deste momento.
        const cells = row
          .map((value, i) => ({ column: item.columns[i] ?? '', value, i }))
          .filter(
            ({ i }) =>
              !moment.used.includes(i) &&
              !datetimes.includes(i) &&
              !times.includes(i),
          )
          .map(({ column, value }) => ({ column, value }));
        const at = moment.time ? `${moment.day} ${moment.time}` : moment.day;
        const fingerprint = `${at}|${item.columns[moment.source]}|${JSON.stringify(cells.map((c) => c.value))}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        events.push({
          key: `${item.id}:${rowIndex}:${moment.source}`,
          evidenceId: item.id,
          at,
          day: moment.day,
          time: moment.time,
          source: item.columns[moment.source] ?? '',
          cells,
        });
      }
    });
  }

  return events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
