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
  /** Com ajuste de relógio: o horário como a fonte gravou. */
  original: string | null;
  offset: number;
  /** As outras células da linha, para dar contexto. */
  cells: Array<{ column: string; value: SqlValue }>;
}

const DATETIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(?::\d{2})?$/;

const withSeconds = (time: string) => (time.length === 5 ? `${time}:00` : time);

/** Soma segundos a "AAAA-MM-DD HH:MM:SS" sem passar por fuso horário. */
function shift(day: string, time: string, seconds: number) {
  const moved = new Date(Date.parse(`${day}T${time}Z`) + seconds * 1000)
    .toISOString()
    .slice(0, 19);
  return { day: moved.slice(0, 10), time: moved.slice(11) };
}

/**
 * Lê um ajuste de relógio do jeito que uma pessoa escreveria: "-432",
 * "-432s", "-7:12" (minutos e segundos), "-1:07:12", "-3h", "+90min".
 * Devolve segundos, ou null se não entender.
 */
export function parseOffset(text: string): number | null {
  const clean = text.trim().replace(/\s+/g, '').replace('−', '-').toLowerCase();
  if (!clean) return null;
  const match = clean.match(/^([+-]?)(.+)$/)!;
  const sign = match[1] === '-' ? -1 : 1;
  const body = match[2];
  let seconds: number | null = null;
  if (/^\d+s?$/.test(body)) seconds = Number.parseInt(body, 10);
  else if (/^\d+min$/.test(body)) seconds = Number.parseInt(body, 10) * 60;
  else if (/^\d+h$/.test(body)) seconds = Number.parseInt(body, 10) * 3600;
  else if (/^\d+:\d{2}$/.test(body)) {
    const [m, s] = body.split(':').map(Number);
    seconds = s < 60 ? m * 60 + s : null;
  } else if (/^\d+:\d{2}:\d{2}$/.test(body)) {
    const [h, m, s] = body.split(':').map(Number);
    seconds = m < 60 && s < 60 ? h * 3600 + m * 60 + s : null;
  }
  if (seconds === null || seconds > 48 * 3600) return null;
  return sign * seconds;
}

/** O inverso de parseOffset, para mostrar: -432 → "-0:07:12". */
export function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
        // Ajuste de relógio anotado pelo jogador: vale só para horários, não para dias inteiros.
        const offset = moment.time ? (item.clockOffset ?? 0) : 0;
        const original = offset ? `${moment.day} ${moment.time}` : null;
        if (offset && moment.time)
          Object.assign(moment, shift(moment.day, moment.time, offset));
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
          original,
          offset,
          cells,
        });
      }
    });
  }

  return events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
