/**
 * Gera o banco do caso 001 (Vantara Logística) de forma determinística: a mesma
 * semente produz sempre o mesmo SQL. O arquivo gerado é versionado em
 * cases/001-notebook-almoxarifado/db/vantara_acessos.sql.
 *
 * Uso: bun tools/gen-case-001.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(
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

const rand = random(20260316);
const between = (min: number, max: number) =>
  Math.floor(min + rand() * (max - min + 1));
const chance = (p: number) => rand() < p;

// ── datas e horas ──────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
/** Dia de março de 2026 + segundos desde a meia-noite → "2026-03-DD HH:MM:SS". */
function stamp(day: number, seconds: number): string {
  const d = new Date(Date.UTC(2026, 2, day, 0, 0, 0) + seconds * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
const at = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;
const date = (day: number) => `2026-03-${pad(day)}`;
const isWeekend = (day: number) =>
  [0, 6].includes(new Date(2026, 2, day).getDay());

const FIRST_DAY = 2;
const LAST_DAY = 16; // dados até 16/03 09:00
const CUTOFF = '2026-03-16 09:00:00';

// ── pessoas ────────────────────────────────────────────────────────────
type Shift = 'COMERCIAL' | 'NOTURNO' | 'LIMPEZA';
interface Employee {
  id: number;
  name: string;
  department: string;
  jobTitle: string;
  badge: number;
  shift: Shift;
  floor: 'ANDAR_2' | 'ANDAR_3' | 'ANDAR_4' | null;
}

const people: Array<Omit<Employee, 'id'>> = [
  {
    name: 'Marta Vidal',
    department: 'RH',
    jobTitle: 'Gerente de RH',
    badge: 1001,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Priscila Andrade',
    department: 'TI',
    jobTitle: 'Coordenadora de TI',
    badge: 2201,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Caio Mendes',
    department: 'TI',
    jobTitle: 'Analista de suporte',
    badge: 2210,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Diego Lima',
    department: 'TI',
    jobTitle: 'Técnico de suporte',
    badge: 2215,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Henrique Sato',
    department: 'TI',
    jobTitle: 'Analista de infraestrutura',
    badge: 2220,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Larissa Couto',
    department: 'RH',
    jobTitle: 'Analista de RH',
    badge: 1004,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Otávio Reis',
    department: 'Financeiro',
    jobTitle: 'Gerente financeiro',
    badge: 4401,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'Juliana Freitas',
    department: 'Financeiro',
    jobTitle: 'Controller',
    badge: 4420,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'Rafael Tavares',
    department: 'Financeiro',
    jobTitle: 'Analista financeiro',
    badge: 4471,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'Beatriz Nunes',
    department: 'Financeiro',
    jobTitle: 'Assistente financeira',
    badge: 4433,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'Gustavo Pires',
    department: 'Comercial',
    jobTitle: 'Executivo de contas',
    badge: 3105,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Camila Rocha',
    department: 'Comercial',
    jobTitle: 'Executiva de contas',
    badge: 3112,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Felipe Antunes',
    department: 'Comercial',
    jobTitle: 'Coordenador comercial',
    badge: 3101,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Natália Prado',
    department: 'Comercial',
    jobTitle: 'Assistente comercial',
    badge: 3120,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Roberto Kenji',
    department: 'Operações',
    jobTitle: 'Gerente de operações',
    badge: 5501,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Aline Barros',
    department: 'Operações',
    jobTitle: 'Analista de logística',
    badge: 5512,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Thiago Melo',
    department: 'Operações',
    jobTitle: 'Analista de logística',
    badge: 5518,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Patrícia Lemos',
    department: 'Operações',
    jobTitle: 'Planejadora de rotas',
    badge: 5524,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Vinícius Araújo',
    department: 'Operações',
    jobTitle: 'Analista de frota',
    badge: 5530,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Eduarda Matos',
    department: 'Operações',
    jobTitle: 'Assistente de operações',
    badge: 5536,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
  {
    name: 'Leonardo Cruz',
    department: 'Jurídico',
    jobTitle: 'Advogado',
    badge: 6601,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'Sofia Mendonça',
    department: 'Jurídico',
    jobTitle: 'Paralegal',
    badge: 6608,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'André Moura',
    department: 'Diretoria',
    jobTitle: 'Diretor geral',
    badge: 7001,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'Helena Brito',
    department: 'Diretoria',
    jobTitle: 'Secretária executiva',
    badge: 7004,
    shift: 'COMERCIAL',
    floor: 'ANDAR_4',
  },
  {
    name: 'Marcelo Duarte',
    department: 'Compras',
    jobTitle: 'Comprador',
    badge: 8102,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Renata Gomes',
    department: 'Compras',
    jobTitle: 'Analista de compras',
    badge: 8109,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Igor Fontes',
    department: 'Marketing',
    jobTitle: 'Designer',
    badge: 3301,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Lívia Castro',
    department: 'Marketing',
    jobTitle: 'Analista de marketing',
    badge: 3305,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Paulo Ferraz',
    department: 'Facilities',
    jobTitle: 'Supervisor de facilities',
    badge: 9001,
    shift: 'COMERCIAL',
    floor: 'ANDAR_2',
  },
  {
    name: 'Denise Rocha',
    department: 'Facilities',
    jobTitle: 'Auxiliar de limpeza',
    badge: 9002,
    shift: 'LIMPEZA',
    floor: null,
  },
  {
    name: 'Wagner Prado',
    department: 'Segurança',
    jobTitle: 'Vigilante',
    badge: 9100,
    shift: 'NOTURNO',
    floor: null,
  },
  {
    name: 'Cláudio Assis',
    department: 'Segurança',
    jobTitle: 'Vigilante',
    badge: 9101,
    shift: 'COMERCIAL',
    floor: null,
  },
  {
    name: 'Mariana Lopes',
    department: 'Atendimento',
    jobTitle: 'Recepcionista',
    badge: 1201,
    shift: 'COMERCIAL',
    floor: null,
  },
  {
    name: 'Fábio Teixeira',
    department: 'Operações',
    jobTitle: 'Conferente',
    badge: 5541,
    shift: 'COMERCIAL',
    floor: 'ANDAR_3',
  },
];

// IDs na ordem da lista, mas com Rafael fixo no 9 (o roteiro usa employee 9).
const employees: Employee[] = people.map((person, index) => ({
  ...person,
  id: index + 1,
}));
const byName = (name: string) => employees.find((e) => e.name === name)!;
if (byName('Rafael Tavares').id !== 9)
  throw new Error('Rafael precisa ser o id 9');

// ── eventos de catraca ─────────────────────────────────────────────────
interface BadgeEvent {
  badge: number;
  gate: string;
  direction: 'IN' | 'OUT';
  time: string;
}
const events: BadgeEvent[] = [];
const timesheet: Array<{
  employee: number;
  day: number;
  clockIn: string;
  clockOut: string;
}> = [];
const add = (
  badge: number,
  gate: string,
  direction: 'IN' | 'OUT',
  day: number,
  seconds: number,
) => events.push({ badge, gate, direction, time: stamp(day, seconds) });
const hhmm = (seconds: number) => {
  const h = Math.floor(seconds / 3600) % 24;
  const m = Math.floor((seconds % 3600) / 60);
  return `${pad(h)}:${pad(m)}:00`;
};

const caio = byName('Caio Mendes');
const rafael = byName('Rafael Tavares');
const juliana = byName('Juliana Freitas');
const denise = byName('Denise Rocha');
const wagner = byName('Wagner Prado');
const diego = byName('Diego Lima');

/** Dias e horários com roteiro fixo: a rotina gerada não pode passar por cima. */
const FRIDAY = 13;
const SATURDAY = 14;
const MONDAY = 16;

for (let day = FIRST_DAY; day <= LAST_DAY; day += 1) {
  if (isWeekend(day)) continue;
  for (const person of employees) {
    if (person.shift !== 'COMERCIAL') continue;

    let arrive = at(7, 25) + between(0, 85 * 60);
    // Segunda, 16/03: Caio chega cedo e é quem nota o sumiço.
    if (day === MONDAY && person === caio) arrive = at(7, 58, 31);
    add(person.badge, 'PORTARIA', 'IN', day, arrive);
    if (person.floor)
      add(person.badge, person.floor, 'IN', day, arrive + between(60, 240));
    if (day === MONDAY) continue; // os dados param às 09:00

    if (chance(0.65)) {
      const lunch = at(11, 45) + between(0, 75 * 60);
      add(person.badge, 'REFEITORIO', 'IN', day, lunch);
      if (person.floor)
        add(
          person.badge,
          person.floor,
          'IN',
          day,
          lunch + between(30, 55) * 60,
        );
    }

    // TI passa no almoxarifado 1 ou 2 vezes por dia, sempre no horário comercial.
    if (person.department === 'TI') {
      const visits = between(1, 2);
      for (let visit = 0; visit < visits; visit += 1) {
        const enter = at(9, 0) + between(0, 7 * 3600 + 30 * 60);
        add(person.badge, 'ALMOX_TI', 'IN', day, enter);
        add(
          person.badge,
          'ALMOX_TI',
          'OUT',
          day,
          enter + between(2, 12) * 60 + between(0, 59),
        );
      }
    }

    let leave = at(17, 0) + between(0, 90 * 60);
    if (day === FRIDAY && person === rafael) leave = at(18, 4, 17);
    if (day === FRIDAY && person === caio) leave = at(17, 51, 48);
    if (day === FRIDAY && person === juliana) leave = at(21, 34, 10);
    add(person.badge, 'PORTARIA', 'OUT', day, leave);
    timesheet.push({
      employee: person.id,
      day,
      clockIn: hhmm(arrive),
      clockOut: hhmm(leave),
    });
  }

  // Denise: limpeza a partir das 18:50, almoxarifado por volta das 19:05.
  const shiftStart = at(18, 50) + between(-180, 240);
  add(denise.badge, 'PORTARIA', 'IN', day, shiftStart);
  let almoxIn = at(19, 5) + between(-240, 240);
  let almoxOut = almoxIn + between(12, 16) * 60 + between(0, 59);
  if (day === FRIDAY) {
    almoxIn = at(19, 5, 22);
    almoxOut = at(19, 19, 47);
  }
  add(denise.badge, 'ALMOX_TI', 'IN', day, almoxIn);
  add(denise.badge, 'ALMOX_TI', 'OUT', day, almoxOut);
  for (const [index, floor] of ['ANDAR_2', 'ANDAR_3', 'ANDAR_4'].entries()) {
    // Na sexta, o 4º andar fica para depois que a Juliana sai.
    const floorTime =
      day === FRIDAY && floor === 'ANDAR_4'
        ? at(21, 38, 2)
        : at(19, 30) + index * 25 * 60 + between(0, 600);
    add(denise.badge, floor, 'IN', day, floorTime);
  }
  const shiftEnd = at(21, 30) + between(0, 900) + (day === FRIDAY ? 1800 : 0);
  add(denise.badge, 'PORTARIA', 'OUT', day, shiftEnd);
  timesheet.push({
    employee: denise.id,
    day,
    clockIn: hhmm(shiftStart),
    clockOut: hhmm(shiftEnd),
  });
}

// Wagner: ronda noturna todos os dias, almoxarifado por volta das 03:10.
for (let day = FIRST_DAY; day <= LAST_DAY; day += 1) {
  let rondaIn = at(3, 10) + between(-180, 180);
  let rondaOut = rondaIn + between(180, 260);
  if (day === SATURDAY) {
    rondaIn = at(3, 10, 31);
    rondaOut = at(3, 14, 2);
  }
  add(wagner.badge, 'ALMOX_TI', 'IN', day, rondaIn);
  add(wagner.badge, 'ALMOX_TI', 'OUT', day, rondaOut);
  add(wagner.badge, 'PORTARIA', 'OUT', day, at(6, 5) + between(0, 300));
  if (day < LAST_DAY) {
    const start = at(21, 55) + between(-120, 180);
    add(wagner.badge, 'PORTARIA', 'IN', day, start);
    timesheet.push({
      employee: wagner.id,
      day,
      clockIn: hhmm(start),
      clockOut: '06:05:00',
    });
  }
}
// O turno que termina na madrugada de 02/03 começou em 01/03, antes do recorte.

// ── roteiro fixo de sexta, 13/03 ───────────────────────────────────────
// Caio audita o almoxarifado no fim do dia.
add(caio.badge, 'ALMOX_TI', 'IN', FRIDAY, at(17, 12, 40));
add(caio.badge, 'ALMOX_TI', 'OUT', FRIDAY, at(17, 36, 5));
// Juliana fica até tarde no 4º andar.
add(juliana.badge, 'ANDAR_4', 'IN', FRIDAY, at(19, 48, 12));
// Rafael sai às 18:04 e volta à noite: as únicas passagens dele no almoxarifado.
add(rafael.badge, 'PORTARIA', 'IN', FRIDAY, at(22, 41, 12));
add(rafael.badge, 'ANDAR_4', 'IN', FRIDAY, at(22, 44, 30));
add(rafael.badge, 'ALMOX_TI', 'IN', FRIDAY, at(22, 47, 3));
add(rafael.badge, 'ALMOX_TI', 'OUT', FRIDAY, at(22, 52, 41));
add(rafael.badge, 'PORTARIA', 'OUT', FRIDAY, at(22, 58, 9));

// Sábado, 14/03: Diego passa rápido no prédio, sem ir ao almoxarifado.
add(diego.badge, 'PORTARIA', 'IN', SATURDAY, at(10, 5, 9));
add(diego.badge, 'ANDAR_3', 'IN', SATURDAY, at(10, 7, 44));
add(diego.badge, 'PORTARIA', 'OUT', SATURDAY, at(10, 50, 27));
timesheet.push({
  employee: diego.id,
  day: SATURDAY,
  clockIn: '10:05:00',
  clockOut: '10:50:00',
});

// Segunda, 16/03: Caio entra no almoxarifado e dá falta do NB-0417 às 08:10.
add(caio.badge, 'ALMOX_TI', 'IN', MONDAY, at(8, 5, 14));
add(caio.badge, 'ALMOX_TI', 'OUT', MONDAY, at(8, 14, 37));

// ── checagens do roteiro ───────────────────────────────────────────────
const visible = events.filter(
  (e) => e.time <= CUTOFF && e.time >= '2026-03-02 00:00:00',
);
const fridayNightAlmox = visible.filter(
  (e) =>
    e.gate === 'ALMOX_TI' &&
    e.time > '2026-03-13 17:36:05' &&
    e.time < '2026-03-16 08:05:14' &&
    e.direction === 'IN',
);
const expected = [
  '9002@2026-03-13 19:05:22',
  '4471@2026-03-13 22:47:03',
  '9100@2026-03-14 03:10:31',
  '9100@2026-03-15 ',
];
for (const want of expected) {
  if (!fridayNightAlmox.some((e) => `${e.badge}@${e.time}`.startsWith(want)))
    throw new Error(`roteiro quebrado: falta ${want}`);
}
if (fridayNightAlmox.length !== 5) {
  // Denise sexta, Rafael, Wagner sábado, Wagner domingo, Wagner segunda madrugada.
  throw new Error(
    `entradas inesperadas no almoxarifado: ${fridayNightAlmox.length}`,
  );
}
if (
  visible.filter((e) => e.badge === rafael.badge && e.gate === 'ALMOX_TI')
    .length !== 2
)
  throw new Error('Rafael só pode aparecer no almoxarifado na noite de sexta');

// ── ativos ─────────────────────────────────────────────────────────────
interface Asset {
  tag: string;
  type: string;
  model: string;
  serial: string;
  status: 'EM_USO' | 'DISPONIVEL' | 'MANUTENCAO' | 'BAIXADO';
  location: string;
  assignedTo: number | null;
  auditedAt: string;
  auditedBy: string;
}
const assets: Asset[] = [];
const serialChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const serial = (prefix: string) =>
  `${prefix}-${Array.from({ length: 6 }, () => serialChars[between(0, serialChars.length - 1)]).join('')}`;
const office = employees.filter((e) => e.shift === 'COMERCIAL' && e.floor);
const auditors = ['Priscila Andrade', 'Henrique Sato', 'Diego Lima'];
const olderAudit = () =>
  `2026-0${between(1, 2)}-${pad(between(3, 27))} ${pad(between(9, 16))}:${pad(between(0, 59))}:00`;

const models = [
  { type: 'NOTEBOOK', model: 'Dell Latitude 5440', prefix: 'DL5440' },
  { type: 'NOTEBOOK', model: 'Lenovo ThinkPad T14', prefix: 'LT14' },
  { type: 'NOTEBOOK', model: 'Dell Latitude 5430', prefix: 'DL5430' },
];
for (let n = 1; n <= 30; n += 1) {
  const tag = `NB-04${pad(n)}`;
  const kind = models[n % 3];
  assets.push({
    tag,
    type: kind.type,
    model: kind.model,
    serial: serial(kind.prefix),
    status: 'EM_USO',
    location: 'ESTACAO',
    assignedTo: null,
    auditedAt: olderAudit(),
    auditedBy: auditors[between(0, 2)],
  });
}
const extras = [
  ...Array.from({ length: 14 }, (_, i) => ({
    tag: `MON-02${pad(i + 1)}`,
    type: 'MONITOR',
    model: 'Dell P2423',
    prefix: 'P2423',
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    tag: `DOC-01${pad(i + 1)}`,
    type: 'DOCK',
    model: 'Dell WD19S',
    prefix: 'WD19',
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    tag: `CEL-03${pad(i + 1)}`,
    type: 'CELULAR',
    model: 'Moto G54',
    prefix: 'MG54',
  })),
];
for (const item of extras) {
  assets.push({
    tag: item.tag,
    type: item.type,
    model: item.model,
    serial: serial(item.prefix),
    status: 'EM_USO',
    location: 'ESTACAO',
    assignedTo: null,
    auditedAt: olderAudit(),
    auditedBy: auditors[between(0, 2)],
  });
}
// Distribui os itens em uso entre o pessoal de escritório.
for (const asset of assets)
  asset.assignedTo = office[between(0, office.length - 1)].id;

// Estoque do almoxarifado: alguns DISPONIVEL; 8 deles auditados por Caio na sexta.
const stockTags = [
  'NB-0412',
  'NB-0417',
  'NB-0423',
  'NB-0428',
  'MON-0211',
  'MON-0213',
  'DOC-0107',
  'CEL-0306',
  'CEL-0308',
];
const auditTimes = [
  '17:14:20',
  '17:30:00',
  '17:16:45',
  '17:21:10',
  '17:24:30',
  '17:26:05',
  '17:33:40',
  '17:35:10',
];
stockTags.forEach((tag, index) => {
  const asset = assets.find((a) => a.tag === tag)!;
  asset.status = 'DISPONIVEL';
  asset.location = 'ALMOX_TI';
  asset.assignedTo = null;
  if (index < 8) {
    asset.auditedAt = `2026-03-13 ${auditTimes[index]}`;
    asset.auditedBy = 'Caio Mendes';
  }
});
const nb0417 = assets.find((a) => a.tag === 'NB-0417')!;
nb0417.model = 'Dell Latitude 5440';
nb0417.serial = 'DL5440-7Q2K9X';
if (nb0417.auditedAt !== '2026-03-13 17:30:00')
  throw new Error('auditoria do NB-0417 fora do roteiro');

// O notebook do Rafael está na bancada de manutenção: o motivo.
const nb0409 = assets.find((a) => a.tag === 'NB-0409')!;
Object.assign(nb0409, {
  status: 'MANUTENCAO',
  location: 'BANCADA_TI',
  assignedTo: rafael.id,
  model: 'Dell Latitude 5440',
});
// Dois itens baixados, para o status não ter só três valores.
for (const tag of ['MON-0214', 'CEL-0302'])
  Object.assign(assets.find((a) => a.tag === tag)!, {
    status: 'BAIXADO',
    location: 'DESCARTE',
    assignedTo: null,
  });

// ── SQL ────────────────────────────────────────────────────────────────
const quote = (value: string | number | null) =>
  value === null
    ? 'NULL'
    : typeof value === 'number'
      ? String(value)
      : `'${value.replace(/'/g, "''")}'`;
const rows = (values: Array<Array<string | number | null>>) =>
  values.map((row) => `  (${row.map(quote).join(', ')})`).join(',\n');

visible.sort((a, b) =>
  a.time < b.time ? -1 : a.time > b.time ? 1 : a.badge - b.badge,
);
timesheet.sort((a, b) => a.day - b.day || a.employee - b.employee);

const sql = `-- Vantara Logística — registros de acesso e patrimônio (02/03/2026 a 16/03/2026 09:00).
-- Gerado por tools/gen-case-001.ts. Não edite à mão: rode o gerador de novo.

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  badge_id INTEGER NOT NULL UNIQUE,
  shift TEXT NOT NULL
);

CREATE TABLE assets (
  asset_tag TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  assigned_to INTEGER REFERENCES employees(id),
  last_audit_at TEXT NOT NULL,
  last_audit_by TEXT NOT NULL
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

INSERT INTO employees (id, name, department, job_title, badge_id, shift) VALUES
${rows(employees.map((e) => [e.id, e.name, e.department, e.jobTitle, e.badge, e.shift]))};

INSERT INTO assets (asset_tag, type, model, serial_number, status, location, assigned_to, last_audit_at, last_audit_by) VALUES
${rows(assets.map((a) => [a.tag, a.type, a.model, a.serial, a.status, a.location, a.assignedTo, a.auditedAt, a.auditedBy]))};

INSERT INTO badge_events (id, badge_id, gate, direction, event_time) VALUES
${rows(visible.map((e, i) => [i + 1, e.badge, e.gate, e.direction, e.time]))};

INSERT INTO timesheet (id, employee_id, work_date, clock_in, clock_out) VALUES
${rows(timesheet.map((t, i) => [i + 1, t.employee, date(t.day), t.clockIn, t.clockOut]))};
`;

writeFileSync(OUTPUT, sql);
console.log(
  `vantara_acessos.sql: ${employees.length} funcionários, ${assets.length} ativos, ${visible.length} eventos, ${timesheet.length} registros de ponto`,
);
