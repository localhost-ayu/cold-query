/**
 * Gera o banco do caso 005 (Vantara Logística, de novo) de forma
 * determinística: a mesma semente produz sempre o mesmo SQL. O arquivo
 * gerado é versionado em cases/005-fuso-horario-invasor/db/vantara_incidente.sql.
 *
 * Cada fonte grava com o próprio relógio, como no roteiro: AD, VPN, DHCP,
 * crachás e ponto na hora certa; firewall 7 min 12 s adiantado; EDR em UTC.
 * Os funcionários são os mesmos do caso 001, lidos do banco dele.
 *
 * Uso: bun tools/gen-case-005.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(
  new URL(
    '../cases/005-fuso-horario-invasor/db/vantara_incidente.sql',
    import.meta.url,
  ),
);
const CASE_001 = fileURLToPath(
  new URL(
    '../cases/001-notebook-almoxarifado/db/vantara_acessos.sql',
    import.meta.url,
  ),
);

/** Gerador pseudoaleatório pequeno (mulberry32): rápido e reproduzível. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = random(20260512);
const between = (min: number, max: number) =>
  Math.floor(min + rand() * (max - min + 1));
const pick = <T>(items: readonly T[]) => items[between(0, items.length - 1)];
const chance = (p: number) => rand() < p;

// ── tempo: segundos desde 04/05/2026 00:00 no relógio de referência ────
const BASE = Date.UTC(2026, 4, 4);
const DAY = 86_400;
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (t: number) => {
  const d = new Date(BASE + t * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};
const dateOf = (day: number) => stamp(day * DAY).slice(0, 10);
const at = (day: number, h: number, m: number, s = 0) =>
  day * DAY + h * 3600 + m * 60 + s;
const isWeekend = (day: number) =>
  [0, 6].includes(new Date(BASE + day * DAY * 1000).getUTCDay());

/** Relógios de cada fonte: o firewall adiantado, o EDR em UTC. */
const FW_DRIFT = 432;
const EDR_UTC = 3 * 3600;
const fwStamp = (t: number) => stamp(t + FW_DRIFT);
const edrStamp = (t: number) => stamp(t + EDR_UTC);

const DAYS = 10; // 04/05 a 13/05
const NIGHT = 8; // terça, 12/05
const END = at(9, 6, 0); // dados até 13/05 06:00

// ── funcionários (do caso 001) ─────────────────────────────────────────
interface Employee {
  id: number;
  name: string;
  department: string;
  jobTitle: string;
  badge: number;
  shift: string;
  username: string;
  host: string | null;
}
const source = readFileSync(CASE_001, 'utf8');
const block = source.slice(
  source.indexOf('INSERT INTO employees'),
  source.indexOf('INSERT INTO assets'),
);
const strip = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const deptCode: Record<string, string> = {
  RH: 'RH',
  TI: 'TI',
  Financeiro: 'FIN',
  Comercial: 'COM',
  Operações: 'OPS',
  Jurídico: 'JUR',
  Diretoria: 'DIR',
  Compras: 'CMP',
  Marketing: 'MKT',
  Facilities: 'FAC',
  Atendimento: 'ATD',
};
const counters: Record<string, number> = {};
// Comercial com números fixos: o roteiro precisa de WS-COM-12 e WS-COM-14.
const fixedHost: Record<string, string> = {
  'Gustavo Pires': 'WS-COM-14',
  'Natália Prado': 'WS-COM-12',
  'Camila Rocha': 'WS-COM-11',
  'Felipe Antunes': 'WS-COM-13',
};
const employees: Employee[] = [
  ...block.matchAll(
    /\((\d+), '([^']+)', '([^']+)', '([^']+)', (\d+), '([^']+)'\)/g,
  ),
].map(([, id, name, department, jobTitle, badge, shift]) => {
  const parts = strip(name).split(' ');
  const desk =
    shift === 'COMERCIAL' &&
    !['Segurança', 'Facilities'].includes(department) &&
    jobTitle !== 'Conferente';
  let host: string | null = null;
  if (fixedHost[name]) host = fixedHost[name];
  else if (desk) {
    const code = deptCode[department];
    counters[code] = (counters[code] ?? 0) + 1;
    host = `${department === 'TI' ? 'NB' : 'WS'}-${code}-${pad(counters[code] + (code === 'COM' ? 20 : 0))}`;
  }
  return {
    id: Number(id),
    name,
    department,
    jobTitle,
    badge: Number(badge),
    shift,
    username: `${parts[0][0]}.${parts.at(-1)}`,
    host,
  };
});
const person = (name: string) => employees.find((e) => e.name === name)!;
const gustavo = person('Gustavo Pires');
const natalia = person('Natália Prado');
const henrique = person('Henrique Sato');
const priscila = person('Priscila Andrade');
const diego = person('Diego Lima');
const wagner = person('Wagner Prado');
const denise = person('Denise Rocha');
const onVacation = (e: Employee, day: number) => e === henrique && day >= 7;

// ── eventos ────────────────────────────────────────────────────────────
type Gate =
  | 'PORTARIA'
  | 'ANDAR_2'
  | 'ANDAR_3'
  | 'ANDAR_4'
  | 'ALMOX_TI'
  | 'REFEITORIO';
const badges: Array<{
  badge: number;
  gate: Gate;
  direction: 'IN' | 'OUT';
  t: number;
}> = [];
const timesheet: Array<{
  employee: number;
  day: number;
  clockIn: string;
  clockOut: string;
}> = [];
const leases: Array<{ ip: string; host: string; start: number; end: number }> =
  [];
const fw: Array<{
  src: string;
  dst: string;
  scope: 'INTERNO' | 'EXTERNO';
  bytes: number;
  t: number;
}> = [];
const edr: Array<{ host: string; user: string; process: string; t: number }> =
  [];
const ad: Array<{
  username: string;
  host: string;
  type: string;
  src: string;
  t: number;
}> = [];
const vpn: Array<{ username: string; ip: string; start: number; end: number }> =
  [];

const floorOf: Record<string, Gate> = {
  RH: 'ANDAR_2',
  Comercial: 'ANDAR_2',
  Marketing: 'ANDAR_2',
  Atendimento: 'ANDAR_2',
  TI: 'ANDAR_3',
  Operações: 'ANDAR_3',
  Compras: 'ANDAR_3',
  Facilities: 'ANDAR_3',
  Financeiro: 'ANDAR_4',
  Jurídico: 'ANDAR_4',
  Diretoria: 'ANDAR_4',
};
const hhmm = (t: number) => stamp(t).slice(11, 16) + ':00';

// IPs do DHCP: o mesmo IP passa de máquina em máquina; nunca dois ao mesmo tempo.
const POOL = Array.from({ length: 160 }, (_, i) => `10.30.2.${i + 20}`);
const busy = new Map<string, Array<[number, number]>>();
function lease(host: string, start: number, end: number, ip?: string) {
  const free = (candidate: string) =>
    (busy.get(candidate) ?? []).every(([s, e]) => end <= s || start >= e);
  const chosen =
    ip ?? POOL.filter((c) => c !== '10.30.2.57' && free(c))[between(0, 30)];
  if (!free(chosen)) throw new Error(`IP ${chosen} ocupado`);
  busy.set(chosen, [...(busy.get(chosen) ?? []), [start, end]]);
  leases.push({ ip: chosen, host, start, end });
  return chosen;
}
const webHosts = [
  '142.250.79.46',
  '151.101.1.69',
  '104.18.32.47',
  '13.107.42.14',
  '200.147.67.142',
  '52.97.183.18',
];

/** Um dia de trabalho de quem tem mesa: crachá, ponto, DHCP, AD, EDR e tráfego. */
function workday(e: Employee, day: number, arrive: number, leave: number) {
  const floor = floorOf[e.department] ?? 'ANDAR_3';
  badges.push({ badge: e.badge, gate: 'PORTARIA', direction: 'IN', t: arrive });
  badges.push({
    badge: e.badge,
    gate: floor,
    direction: 'IN',
    t: arrive + between(60, 240),
  });
  const lunch = at(day, 12, between(0, 50), between(0, 59));
  badges.push({
    badge: e.badge,
    gate: 'REFEITORIO',
    direction: 'IN',
    t: lunch,
  });
  badges.push({
    badge: e.badge,
    gate: floor,
    direction: 'IN',
    t: lunch + between(1800, 3300),
  });
  badges.push({ badge: e.badge, gate: 'PORTARIA', direction: 'OUT', t: leave });
  timesheet.push({
    employee: e.id,
    day,
    clockIn: hhmm(arrive + between(120, 420)),
    clockOut: hhmm(leave - between(60, 300)),
  });
  if (!e.host) return;
  const on = arrive + between(300, 900);
  const off = leave - between(60, 240);
  const ip = lease(e.host, on, off);
  ad.push({
    username: e.username,
    host: e.host,
    type: 'INTERACTIVE',
    src: e.host,
    t: on + between(30, 120),
  });
  if (chance(0.5))
    ad.push({
      username: e.username,
      host: e.host,
      type: 'UNLOCK',
      src: e.host,
      t: lunch + between(1900, 3400),
    });
  for (const process of [
    'outlook.exe',
    'chrome.exe',
    'teams.exe',
    pick(['excel.exe', 'winword.exe', 'acrord32.exe']),
  ])
    edr.push({
      host: e.host,
      user: e.username,
      process,
      t: on + between(60, 5400),
    });
  for (let t = on + between(300, 1800); t < off; t += between(900, 3000)) {
    fw.push({
      src: ip,
      dst: pick(webHosts),
      scope: 'EXTERNO',
      bytes: between(8_000, 4_800_000),
      t,
    });
    if (chance(0.3))
      fw.push({
        src: ip,
        dst: '10.30.1.10',
        scope: 'INTERNO',
        bytes: between(20_000, 9_000_000),
        t: t + between(10, 300),
      });
  }
}

for (let day = 0; day < DAYS; day += 1) {
  if (isWeekend(day)) continue;
  for (const e of employees) {
    if (onVacation(e, day) || e.shift !== 'COMERCIAL') continue;
    if (day === 9) continue; // 13/05: dados acabam às 06:00
    const arrive =
      at(day, 7, between(25, 59), between(0, 59)) +
      (chance(0.6) ? between(0, 3000) : 0);
    let leave = at(day, 17, 0) + between(0, 5400);
    if (e === gustavo && day === NIGHT) leave = at(day, 18, 12, 40);
    if (e === natalia && day === NIGHT) leave = at(day, 17, 48, 5);
    workday(e, day, arrive, leave);
  }
  // O ponto do Gustavo na terça fecha às 18:12, como no roteiro.
  if (day === NIGHT) {
    const row = timesheet.find(
      (r) => r.employee === gustavo.id && r.day === NIGHT,
    );
    if (row) row.clockOut = '18:12:00';
  }
  // Limpeza (Denise) à noite e ronda do vigilante noturno (Wagner).
  if (day < 9) {
    const in1 = at(day, 19, between(2, 8), between(0, 59));
    badges.push({
      badge: denise.badge,
      gate: 'PORTARIA',
      direction: 'IN',
      t: in1 - 600,
    });
    badges.push({
      badge: denise.badge,
      gate: 'ALMOX_TI',
      direction: 'IN',
      t: in1,
    });
    badges.push({
      badge: denise.badge,
      gate: 'ALMOX_TI',
      direction: 'OUT',
      t: in1 + between(700, 1000),
    });
    badges.push({
      badge: denise.badge,
      gate: 'PORTARIA',
      direction: 'OUT',
      t: at(day, 21, between(5, 25)),
    });
  }
  badges.push({
    badge: wagner.badge,
    gate: 'PORTARIA',
    direction: 'IN',
    t: at(day, 21, 40) + between(0, 600),
  });
  const round = at(day + 1, 3, 10) + between(0, 240);
  badges.push({
    badge: wagner.badge,
    gate: 'ALMOX_TI',
    direction: 'IN',
    t: round,
  });
  badges.push({
    badge: wagner.badge,
    gate: 'ALMOX_TI',
    direction: 'OUT',
    t: round + between(180, 300),
  });
  badges.push({
    badge: wagner.badge,
    gate: 'PORTARIA',
    direction: 'OUT',
    t: at(day + 1, 5, 55) + between(0, 300),
  });
}

// TI: acessos remotos a servidores de dia, e sessões de VPN de noite.
const servers = ['SRV-RH-01', 'SRV-ERP-01', 'SRV-FS-01', 'SRV-BKP-01'];
for (let day = 0; day < 9; day += 1) {
  if (isWeekend(day)) continue;
  for (const e of [priscila, diego, person('Caio Mendes'), henrique]) {
    if (onVacation(e, day)) continue;
    for (let n = 0; n < between(1, 3); n += 1)
      ad.push({
        username: e.username,
        host: pick(servers),
        type: 'REMOTE_INTERACTIVE',
        src: e.host!,
        t: at(day, between(9, 16), between(0, 59)),
      });
  }
  if (chance(0.5)) {
    const start = at(day, between(19, 21), between(0, 59));
    vpn.push({
      username: pick([priscila, diego, person('Caio Mendes')]).username,
      ip: `177.${between(10, 99)}.${between(0, 255)}.${between(1, 254)}`,
      start,
      end: start + between(900, 5400),
    });
  }
}
// Henrique antes das férias: último logon na sexta, 08/05.
ad.push({
  username: henrique.username,
  host: 'SRV-RH-01',
  type: 'REMOTE_INTERACTIVE',
  src: henrique.host!,
  t: at(4, 17, 21, 9),
});

// Backup noturno: 3 GB por noite para o storage interno, às 23:00.
for (let day = 0; day < 9; day += 1) {
  fw.push({
    src: '10.30.1.20',
    dst: '10.30.9.5',
    scope: 'INTERNO',
    bytes:
      3_221_225_472 +
      between(-50_000_000, 50_000_000) * (day === NIGHT ? 0 : 1),
    t: at(day, 23, 0, between(0, 30)),
  });
}

// ── a noite de 12/05 (relógio de referência) ───────────────────────────
// Priscila: manutenção agendada, pela VPN, 22:12 às 23:15.
vpn.push({
  username: priscila.username,
  ip: '189.44.120.7',
  start: at(NIGHT, 22, 12, 4),
  end: at(NIGHT, 23, 15, 37),
});
// Diego: plantão, VPN e logon no SRV-RH-01 às 22:05 para um patch.
vpn.push({
  username: diego.username,
  ip: '177.81.33.210',
  start: at(NIGHT, 21, 52, 18),
  end: at(NIGHT, 22, 31, 2),
});
ad.push({
  username: diego.username,
  host: 'SRV-RH-01',
  type: 'REMOTE_INTERACTIVE',
  src: 'VPN-GW',
  t: at(NIGHT, 22, 5, 10),
});
// Gustavo volta: portaria 21:58, andar 22:03, liga a estação (DHCP .57).
badges.push({
  badge: gustavo.badge,
  gate: 'PORTARIA',
  direction: 'IN',
  t: at(NIGHT, 21, 58, 26),
});
badges.push({
  badge: gustavo.badge,
  gate: 'ANDAR_2',
  direction: 'IN',
  t: at(NIGHT, 22, 3, 51),
});
lease('WS-COM-14', at(NIGHT, 22, 4, 0), at(NIGHT, 22, 54, 0), '10.30.2.57');
// Credencial do Henrique, de férias, usada a partir da estação do Gustavo.
ad.push({
  username: henrique.username,
  host: 'SRV-RH-01',
  type: 'REMOTE_INTERACTIVE',
  src: 'WS-COM-14',
  t: at(NIGHT, 22, 44, 5),
});
edr.push({
  host: 'WS-COM-14',
  user: henrique.username,
  process: '7z.exe',
  t: at(NIGHT, 22, 46, 40),
});
edr.push({
  host: 'WS-COM-14',
  user: henrique.username,
  process: 'rclone.exe',
  t: at(NIGHT, 22, 47, 30),
});
const EXFIL_BYTES = 1_874_329_600;
fw.push({
  src: '10.30.2.57',
  dst: '91.208.44.17',
  scope: 'EXTERNO',
  bytes: 12_400,
  t: at(NIGHT, 22, 47, 52),
});
fw.push({
  src: '10.30.2.57',
  dst: '91.208.44.17',
  scope: 'EXTERNO',
  bytes: EXFIL_BYTES,
  t: at(NIGHT, 22, 51, 0),
});
// Gustavo desliga e sai; o IP .57 vai para a estação da Natália, acordada para atualizar.
badges.push({
  badge: gustavo.badge,
  gate: 'PORTARIA',
  direction: 'OUT',
  t: at(NIGHT, 23, 2, 13),
});
lease('WS-COM-12', at(NIGHT, 22, 54, 0), at(NIGHT, 23, 40, 0), '10.30.2.57');
edr.push({
  host: 'WS-COM-12',
  user: 'SYSTEM',
  process: 'wuauclt.exe',
  t: at(NIGHT, 22, 55, 20),
});
for (const [m, s, bytes] of [
  [55, 41, 2_100_000],
  [58, 3, 48_300_000],
  [3, 10, 31_000_000],
] as const) {
  const hour = m < 30 ? 23 : 22;
  fw.push({
    src: '10.30.2.57',
    dst: '13.107.4.50',
    scope: 'EXTERNO',
    bytes,
    t: at(NIGHT, hour, m, s),
  });
}

// ── afastamentos, ativos e pulsos ──────────────────────────────────────
const absences = [
  {
    employee: henrique.id,
    kind: 'FERIAS',
    start: '2026-05-11',
    end: '2026-05-22',
  },
  {
    employee: person('Eduarda Matos').id,
    kind: 'LICENCA_MEDICA',
    start: '2026-04-27',
    end: '2026-05-06',
  },
  {
    employee: person('Sofia Mendonça').id,
    kind: 'FERIAS',
    start: '2026-05-18',
    end: '2026-06-01',
  },
];
for (const absence of absences) {
  // Quem está afastado no começo da janela não trabalha: tira os dias dela.
  const e = employees.find((x) => x.id === absence.employee)!;
  if (absence.kind !== 'LICENCA_MEDICA') continue;
  for (let i = timesheet.length - 1; i >= 0; i -= 1) {
    const row = timesheet[i];
    if (row.employee === e.id && dateOf(row.day) <= absence.end)
      timesheet.splice(i, 1);
  }
}

const serial = () =>
  Array.from(
    { length: 8 },
    () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[between(0, 31)],
  ).join('');
const assets = [
  ...employees
    .filter((e) => e.host)
    .map((e) => ({
      tag: e.host!,
      type: e.host!.startsWith('NB') ? 'NOTEBOOK' : 'DESKTOP',
      model: e.host!.startsWith('NB')
        ? 'Dell Latitude 5440'
        : pick(['Dell OptiPlex 7010', 'Lenovo ThinkCentre M70q']),
      serial: serial(),
      status: 'EM_USO',
      location: e.host!.startsWith('NB') ? 'BANCADA_TI' : 'ESTACAO',
      assignedTo: e.id as number | null,
    })),
  ...servers.map((tag) => ({
    tag,
    type: 'SERVIDOR',
    model: 'Dell PowerEdge R660',
    serial: serial(),
    status: 'EM_USO',
    location: 'DATACENTER',
    assignedTo: null as number | null,
  })),
];

// Pulsos de hora em hora: cada fonte grava a mesma batida com o próprio relógio.
const sources = [
  ['AD', 0],
  ['FW', FW_DRIFT],
  ['EDR', EDR_UTC],
  ['VPN', 0],
  ['DHCP', 0],
] as const;
const heartbeats: Array<{ source: string; seq: number; time: string }> = [];
for (let seq = 1; seq * 3600 <= END; seq += 1)
  for (const [name, offset] of sources)
    heartbeats.push({ source: name, seq, time: stamp(seq * 3600 + offset) });

// ── ordem e cortes ─────────────────────────────────────────────────────
const within = <T extends { t: number }>(rows: T[]) =>
  rows.filter((row) => row.t <= END).sort((a, b) => a.t - b.t);
const badgeRows = within(badges);
const adRows = within(ad);
const edrRows = within(edr);
const fwRows = within(fw);
leases.sort((a, b) => a.start - b.start);
vpn.sort((a, b) => a.start - b.start);
timesheet.sort((a, b) => a.day - b.day || a.employee - b.employee);

// ── checagens do roteiro ───────────────────────────────────────────────
function check(ok: boolean, message: string) {
  if (!ok) throw new Error(`roteiro quebrado: ${message}`);
}
const exfil = fwRows.find((row) => row.bytes === EXFIL_BYTES)!;
check(
  fwStamp(exfil.t) === '2026-05-12 22:58:12',
  `firewall cru: ${fwStamp(exfil.t)}`,
);
const ownerAt = (ip: string, t: number) =>
  leases.find((l) => l.ip === ip && l.start <= t && t <= l.end)?.host;
check(
  ownerAt('10.30.2.57', exfil.t) === 'WS-COM-14',
  'na hora real o IP é da WS-COM-14',
);
check(
  ownerAt('10.30.2.57', exfil.t + FW_DRIFT) === 'WS-COM-12',
  'na hora crua o IP é da WS-COM-12',
);
check(
  fwRows.filter((row) => row.scope === 'EXTERNO' && row.bytes > 1_000_000_000)
    .length === 1,
  'uma saída grande só',
);
check(
  !timesheet.some((row) => row.employee === henrique.id && row.day >= 7) &&
    !badgeRows.some(
      (row) => row.badge === henrique.badge && row.t >= at(7, 0, 0),
    ),
  'Henrique sem ponto nem crachá nas férias',
);
check(
  timesheet.some(
    (row) =>
      row.employee === gustavo.id &&
      row.day === NIGHT &&
      row.clockOut === '18:12:00',
  ),
  'ponto do Gustavo às 18h',
);
const lastGate = (badge: number, t: number) =>
  badgeRows
    .filter(
      (row) => row.badge === badge && row.gate === 'PORTARIA' && row.t <= t,
    )
    .at(-1);
check(
  lastGate(gustavo.badge, exfil.t)?.direction === 'IN',
  'Gustavo dentro do prédio às 22:51',
);
check(
  lastGate(natalia.badge, exfil.t)?.direction === 'OUT',
  'Natália fora do prédio às 22:51',
);
const pulses = (name: string) =>
  heartbeats
    .filter((h) => h.source === name)
    .map((h) => Date.parse(`${h.time.replace(' ', 'T')}Z`));
const adPulses = pulses('AD');
check(
  new Set(pulses('FW').map((time, i) => time - adPulses[i])).size === 1,
  'deriva do firewall constante',
);
const usernames = employees.map((e) => e.username);
check(
  new Set(usernames).size === usernames.length,
  `usernames repetidos: ${usernames.join()}`,
);
check(
  new Set(assets.map((a) => a.tag)).size === assets.length,
  'hosts repetidos',
);

// ── SQL ────────────────────────────────────────────────────────────────
const quote = (value: string | number | null) =>
  value === null
    ? 'NULL'
    : typeof value === 'number'
      ? String(value)
      : `'${value.replace(/'/g, "''")}'`;
const rows = (values: Array<Array<string | number | null>>) =>
  values.map((row) => `  (${row.map(quote).join(', ')})`).join(',\n');

const sql = `-- Vantara Logística — incidente de 12/05/2026 (dados de 04/05 a 13/05 06:00).
-- Gerado por tools/gen-case-005.ts. Não edite à mão: rode o gerador de novo.
-- Cada fonte grava com o próprio relógio.

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  badge_id INTEGER NOT NULL UNIQUE,
  shift TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE
);

CREATE TABLE absences (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  kind TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

CREATE TABLE assets (
  asset_tag TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  assigned_to INTEGER REFERENCES employees(id)
);

CREATE TABLE badge_events (
  id INTEGER PRIMARY KEY,
  badge_id INTEGER NOT NULL,
  gate TEXT NOT NULL,
  direction TEXT NOT NULL,
  event_time TEXT NOT NULL
);

CREATE TABLE timesheet (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  work_date TEXT NOT NULL,
  clock_in TEXT NOT NULL,
  clock_out TEXT NOT NULL
);

CREATE TABLE ad_logons (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  host TEXT NOT NULL,
  logon_type TEXT NOT NULL,
  src_host TEXT NOT NULL,
  event_time TEXT NOT NULL
);

CREATE TABLE vpn_sessions (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  src_ip TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL
);

CREATE TABLE dhcp_leases (
  id INTEGER PRIMARY KEY,
  ip TEXT NOT NULL,
  host TEXT NOT NULL,
  lease_start TEXT NOT NULL,
  lease_end TEXT NOT NULL
);

CREATE TABLE fw_events (
  id INTEGER PRIMARY KEY,
  src_ip TEXT NOT NULL,
  dst_ip TEXT NOT NULL,
  dst_scope TEXT NOT NULL,
  bytes_out INTEGER NOT NULL,
  event_time TEXT NOT NULL
);

CREATE TABLE edr_events (
  id INTEGER PRIMARY KEY,
  host TEXT NOT NULL,
  user TEXT NOT NULL,
  process TEXT NOT NULL,
  event_time TEXT NOT NULL
);

CREATE TABLE heartbeats (
  source TEXT NOT NULL,
  seq INTEGER NOT NULL,
  event_time TEXT NOT NULL,
  PRIMARY KEY (source, seq)
);

INSERT INTO employees (id, name, department, job_title, badge_id, shift, username) VALUES
${rows(employees.map((e) => [e.id, e.name, e.department, e.jobTitle, e.badge, e.shift, e.username]))};

INSERT INTO absences (id, employee_id, kind, start_date, end_date) VALUES
${rows(absences.map((a, i) => [i + 1, a.employee, a.kind, a.start, a.end]))};

INSERT INTO assets (asset_tag, type, model, serial_number, status, location, assigned_to) VALUES
${rows(assets.map((a) => [a.tag, a.type, a.model, a.serial, a.status, a.location, a.assignedTo]))};

INSERT INTO badge_events (id, badge_id, gate, direction, event_time) VALUES
${rows(badgeRows.map((b, i) => [i + 1, b.badge, b.gate, b.direction, stamp(b.t)]))};

INSERT INTO timesheet (id, employee_id, work_date, clock_in, clock_out) VALUES
${rows(timesheet.map((t, i) => [i + 1, t.employee, dateOf(t.day), t.clockIn, t.clockOut]))};

INSERT INTO ad_logons (id, username, host, logon_type, src_host, event_time) VALUES
${rows(adRows.map((a, i) => [i + 1, a.username, a.host, a.type, a.src, stamp(a.t)]))};

INSERT INTO vpn_sessions (id, username, src_ip, started_at, ended_at) VALUES
${rows(vpn.map((v, i) => [i + 1, v.username, v.ip, stamp(v.start), stamp(v.end)]))};

INSERT INTO dhcp_leases (id, ip, host, lease_start, lease_end) VALUES
${rows(leases.map((l, i) => [i + 1, l.ip, l.host, stamp(l.start), stamp(l.end)]))};

INSERT INTO fw_events (id, src_ip, dst_ip, dst_scope, bytes_out, event_time) VALUES
${rows(fwRows.map((f, i) => [i + 1, f.src, f.dst, f.scope, f.bytes, fwStamp(f.t)]))};

INSERT INTO edr_events (id, host, user, process, event_time) VALUES
${rows(edrRows.map((e, i) => [i + 1, e.host, e.user, e.process, edrStamp(e.t)]))};

INSERT INTO heartbeats (source, seq, event_time) VALUES
${rows(heartbeats.map((h) => [h.source, h.seq, h.time]))};
`;

writeFileSync(OUTPUT, sql);
const total =
  employees.length +
  absences.length +
  assets.length +
  badgeRows.length +
  timesheet.length +
  adRows.length +
  vpn.length +
  leases.length +
  fwRows.length +
  edrRows.length +
  heartbeats.length;
console.log(
  `vantara_incidente.sql: ${total} linhas (${badgeRows.length} crachás, ${adRows.length} logons, ${leases.length} leases, ${fwRows.length} firewall, ${edrRows.length} EDR, ${heartbeats.length} pulsos)`,
);
console.log(
  `  Gustavo ${gustavo.id} ${gustavo.username} · Henrique ${henrique.username} · Natália ${natalia.username} · Diego ${diego.username} · Priscila ${priscila.username}`,
);
