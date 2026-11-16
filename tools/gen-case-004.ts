/**
 * Gera o banco do caso 004 (Borges & Lacerda Advogados) de forma
 * determinística: a mesma semente produz sempre o mesmo SQL. O arquivo
 * gerado é versionado em cases/004-download-seis-da-manha/db/borges_dms.sql.
 *
 * Uso: bun tools/gen-case-004.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(
  new URL(
    '../cases/004-download-seis-da-manha/db/borges_dms.sql',
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

const rand = random(20260427);
const between = (min: number, max: number) =>
  Math.floor(min + rand() * (max - min + 1));
const pick = <T>(items: readonly T[]) => items[between(0, items.length - 1)];
const chance = (p: number) => rand() < p;

// ── datas ──────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const FIRST = Date.UTC(2026, 0, 5); // segunda, 05/01/2026
const LAST_DAY = 108; // quinta, 23/04/2026
const dayDate = (day: number) => new Date(FIRST + day * 86_400_000);
const dateOf = (day: number) => dayDate(day).toISOString().slice(0, 10);
const dayOf = (date: string) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - FIRST) / 86_400_000);
const stamp = (day: number, seconds: number) =>
  `${dateOf(day)} ${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
const at = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;
const isWeekend = (day: number) => [0, 6].includes(dayDate(day).getUTCDay());

// ── pessoas e contas ───────────────────────────────────────────────────
interface Person {
  username: string;
  name: string;
  role: string;
  status: 'ATIVO' | 'DESLIGADO';
  terminatedAt: string | null;
  active: 0 | 1;
  /** Downloads por dia útil e se trabalha de casa às vezes. */
  perDay: number;
  vpn: boolean;
}

const people: Person[] = [
  ['augusto.borges', 'Augusto Borges', 'Sócio', 4, true],
  ['rita.lacerda', 'Rita Lacerda', 'Sócia', 4, true],
  ['otavio.pinheiro', 'Otávio Pinheiro', 'Sócio', 3, false],
  ['m.quintana', 'Marina Quintana', 'Associada sênior', 6, true],
  ['p.gusmao', 'Pedro Gusmão', 'Associado sênior', 6, true],
  ['l.tavares', 'Lívia Tavares', 'Associada', 5, true],
  ['r.moura', 'Ricardo Moura', 'Associado', 5, false],
  ['b.saldanha', 'Bianca Saldanha', 'Associada', 5, true],
  ['g.azevedo', 'Gustavo Azevedo', 'Associado', 4, true],
  ['t.carvalho', 'Thaís Carvalho', 'Associada', 4, false],
  ['v.lima', 'Vitor Lima', 'Associado', 4, true],
  ['f.matos', 'Fernanda Matos', 'Estagiária', 30, false],
  ['j.bastos', 'Júlia Bastos', 'Estagiária', 9, false],
  ['k.ramos', 'Kauã Ramos', 'Estagiário', 8, false],
  ['e.siqueira', 'Elaine Siqueira', 'Secretária', 3, false],
  ['n.prado', 'Nair Prado', 'Secretária', 3, false],
  ['a.teixeira', 'André Teixeira', 'Analista de TI', 2, true],
  ['c.dias', 'Camila Dias', 'Paralegal', 7, false],
  ['h.fontes', 'Heitor Fontes', 'Paralegal', 6, false],
  ['s.melo', 'Sandra Melo', 'Gerente administrativa', 2, false],
  ['d.rezende', 'Daniel Rezende', 'Associado', 4, true],
  ['i.barros', 'Isabela Barros', 'Associada', 4, true],
  ['o.leite', 'Otto Leite', 'Associado', 3, false],
  ['y.nakamura', 'Yuri Nakamura', 'Associado', 4, true],
  ['w.campos', 'Wanda Campos', 'Paralegal', 5, false],
  ['l.antunes', 'Lucas Antunes', 'Estagiário', 7, false],
  ['p.rocha', 'Paula Rocha', 'Associada', 4, true],
  ['r.salgado', 'Renato Salgado', 'Associado', 3, true],
].map(([username, name, role, perDay, vpn]) => ({
  username: username as string,
  name: name as string,
  role: role as string,
  status: 'ATIVO' as const,
  terminatedAt: null,
  active: 1 as const,
  perDay: perDay as number,
  vpn: vpn as boolean,
}));

// Ex-funcionários: Caetano (conta esquecida ativa), Luana (idem, sem uso) e
// Júlio (desativado direito, para a subconsulta sem filtro mostrar três).
people.push(
  {
    username: 'c.brito',
    name: 'Caetano Brito',
    role: 'Associado',
    status: 'DESLIGADO',
    terminatedAt: '2026-02-20',
    active: 1,
    perDay: 4,
    vpn: true,
  },
  {
    username: 'luana.prates',
    name: 'Luana Prates',
    role: 'Associada',
    status: 'DESLIGADO',
    terminatedAt: '2025-08-20',
    active: 1,
    perDay: 0,
    vpn: false,
  },
  {
    username: 'j.moreira',
    name: 'Júlio Moreira',
    role: 'Associado',
    status: 'DESLIGADO',
    terminatedAt: '2025-11-03',
    active: 0,
    perDay: 0,
    vpn: false,
  },
);

interface User {
  id: number;
  username: string;
  displayName: string;
  hrId: number | null;
  active: 0 | 1;
}

// Ids de RH embaralhados, para não coincidirem com os ids das contas.
const hrIds = people.map((_, index) => 301 + index * 7);
const hrRecords = people.map((person, index) => ({
  id: hrIds[index],
  name: person.name,
  status: person.status,
  terminatedAt: person.terminatedAt,
}));
const users: User[] = people.map((person, index) => ({
  id: index + 1,
  username: person.username,
  displayName: person.name,
  hrId: hrIds[index],
  active: person.active,
}));
users.push(
  {
    id: users.length + 1,
    username: 'svc_backup',
    displayName: 'Backup noturno',
    hrId: null,
    active: 1,
  },
  {
    id: users.length + 2,
    username: 'svc_scanner',
    displayName: 'Digitalização',
    hrId: null,
    active: 1,
  },
);
const user = (username: string) => users.find((u) => u.username === username)!;

// ── matérias e equipes ─────────────────────────────────────────────────
const matterNames: Array<[string, string, string[]]> = [
  [
    'Recuperação judicial Tecelagem Serrana',
    'otavio.pinheiro',
    ['r.moura', 't.carvalho', 'k.ramos', 'c.dias'],
  ],
  [
    'Contencioso trabalhista Rede Sol',
    'rita.lacerda',
    ['l.tavares', 'o.leite', 'j.bastos', 'w.campos'],
  ],
  [
    'Fusão Altamira',
    'augusto.borges',
    ['m.quintana', 'p.gusmao', 'f.matos', 'h.fontes'],
  ],
  [
    'Arbitragem Porto Seco',
    'rita.lacerda',
    ['b.saldanha', 'g.azevedo', 'l.antunes'],
  ],
  [
    'Due diligence Agro Vale',
    'augusto.borges',
    ['v.lima', 'd.rezende', 'f.matos', 'c.dias'],
  ],
  [
    'Reestruturação societária Grupo Ipê',
    'otavio.pinheiro',
    ['i.barros', 'y.nakamura', 'k.ramos'],
  ],
  [
    'Tributário Metalúrgica Forte',
    'rita.lacerda',
    ['p.rocha', 'r.salgado', 'j.bastos'],
  ],
  [
    'Contratos Rede Farol',
    'augusto.borges',
    ['g.azevedo', 'i.barros', 'f.matos', 'w.campos'],
  ],
  [
    'Ambiental Mineradora Sete Lagos',
    'otavio.pinheiro',
    ['d.rezende', 'o.leite', 'h.fontes'],
  ],
  [
    'Propriedade intelectual Editora Lume',
    'rita.lacerda',
    ['t.carvalho', 'p.rocha', 'l.antunes'],
  ],
  [
    'Contencioso cível Construtora Pedra Lisa',
    'otavio.pinheiro',
    ['c.brito', 'r.moura', 'y.nakamura', 'k.ramos'],
  ],
  [
    'Societário Cooperativa Vale Verde',
    'augusto.borges',
    ['c.brito', 'b.saldanha', 'l.tavares'],
  ],
];
const matters = matterNames.map(([name, lead, team], index) => ({
  id: index + 1,
  name,
  lead,
  team: [lead, ...team],
}));
const ALTAMIRA = matters[2];

// ── documentos ─────────────────────────────────────────────────────────
interface Doc {
  id: number;
  matter: number;
  title: string;
  classification: 'PUBLICO' | 'INTERNO' | 'CONFIDENCIAL';
  day: number;
  seconds: number;
}
const docs: Doc[] = [];
const kinds = [
  ['peticao_inicial', 'INTERNO'],
  ['parecer', 'CONFIDENCIAL'],
  ['ata_reuniao', 'INTERNO'],
  ['procuracao', 'PUBLICO'],
  ['contrato_social', 'PUBLICO'],
  ['memorando', 'INTERNO'],
  ['planilha_calculos', 'INTERNO'],
  ['minuta_acordo', 'CONFIDENCIAL'],
  ['laudo_pericial', 'INTERNO'],
  ['notificacao', 'PUBLICO'],
  ['relatorio_cliente', 'CONFIDENCIAL'],
] as const;
for (const matter of matters) {
  if (matter === ALTAMIRA) continue;
  const count = between(22, 34);
  for (let n = 0; n < count; n += 1) {
    const [kind, classification] = pick(kinds);
    docs.push({
      id: 0,
      matter: matter.id,
      title: `${kind}_${matter.id}_${String(n + 1).padStart(2, '0')}`,
      classification,
      day: between(-40, LAST_DAY - 3),
      seconds: between(at(8, 30), at(19, 0)),
    });
  }
}
// Fusão Altamira: due diligence e sete versões da minuta, a última na madrugada.
const altamiraDocs: Array<[string, Doc['classification'], string, number]> = [
  ['termo_confidencialidade_altamira', 'CONFIDENCIAL', '2026-01-12', at(10, 4)],
  [
    'due_diligence_altamira_financeiro',
    'CONFIDENCIAL',
    '2026-01-26',
    at(16, 30),
  ],
  [
    'due_diligence_altamira_trabalhista',
    'CONFIDENCIAL',
    '2026-02-09',
    at(11, 12),
  ],
  ['ata_reuniao_altamira_03', 'INTERNO', '2026-03-03', at(18, 2)],
  ['minuta_fusao_v1', 'CONFIDENCIAL', '2026-02-16', at(15, 40)],
  ['minuta_fusao_v2', 'CONFIDENCIAL', '2026-02-27', at(17, 15)],
  ['minuta_fusao_v3', 'CONFIDENCIAL', '2026-03-10', at(14, 5)],
  ['minuta_fusao_v4', 'CONFIDENCIAL', '2026-03-24', at(19, 22)],
  ['minuta_fusao_v5', 'CONFIDENCIAL', '2026-04-06', at(16, 48)],
  ['minuta_fusao_v6', 'CONFIDENCIAL', '2026-04-15', at(20, 11)],
  ['minuta_fusao_v7', 'CONFIDENCIAL', '2026-04-22', at(5, 20)],
];
for (const [title, classification, date, seconds] of altamiraDocs) {
  docs.push({
    id: 0,
    matter: ALTAMIRA.id,
    title,
    classification,
    day: dayOf(date),
    seconds,
  });
}
docs.sort((a, b) => a.day - b.day || a.seconds - b.seconds);
docs.forEach((doc, index) => (doc.id = 501 + index));
const doc = (title: string) => docs.find((d) => d.title === title)!;
const v6 = doc('minuta_fusao_v6');
const v7 = doc('minuta_fusao_v7');

// ── downloads ──────────────────────────────────────────────────────────
interface Download {
  user: number;
  doc: number;
  day: number;
  seconds: number;
  ip: string;
  channel: 'OFFICE_NET' | 'VPN' | 'SHARED_LINK';
}
const downloads: Download[] = [];
const officeIp = () => `10.20.${between(1, 4)}.${between(10, 240)}`;
const homeIp = new Map(
  people.map((p) => [
    p.username,
    `${pick(['177', '179', '186', '189', '191'])}.${between(10, 250)}.${between(0, 255)}.${between(1, 254)}`,
  ]),
);
const teamOf = (username: string) =>
  matters.filter((m) => m.team.includes(username)).map((m) => m.id);

for (const person of people) {
  const u = user(person.username);
  const mine = teamOf(person.username);
  const lastDay = person.terminatedAt
    ? dayOf(person.terminatedAt) - 1
    : LAST_DAY;
  for (let day = 0; day <= lastDay; day += 1) {
    if (isWeekend(day)) continue;
    const count =
      person.perDay === 0
        ? 0
        : between(Math.max(0, person.perDay - 2), person.perDay + 2);
    for (let n = 0; n < count; n += 1) {
      const seconds = between(at(8, 40), at(19, 30));
      // Quase sempre documentos das próprias matérias, já criados.
      const pool = docs.filter(
        (d) =>
          (d.day < day || (d.day === day && d.seconds < seconds)) &&
          (mine.includes(d.matter) ||
            (chance(0.04) && d.classification === 'PUBLICO')),
      );
      if (pool.length === 0) continue;
      let target = pick(pool);
      // Antes de sair, o Caetano só mexia em documentos públicos e internos.
      if (
        person.username === 'c.brito' &&
        target.classification === 'CONFIDENCIAL'
      )
        target = pick(pool.filter((d) => d.classification !== 'CONFIDENCIAL'));
      // A Fernanda baixou a v6, nunca a v7.
      if (target === v7) continue;
      const remote = person.vpn && chance(0.15);
      downloads.push({
        user: u.id,
        doc: target.id,
        day,
        seconds: remote ? between(at(7, 0), at(22, 30)) : seconds,
        ip: remote ? homeIp.get(person.username)! : officeIp(),
        channel: remote ? 'VPN' : 'OFFICE_NET',
      });
    }
  }
}

// Backup noturno: às 03:00, baixa o que foi criado no dia anterior.
const backup = user('svc_backup');
for (let day = 1; day <= LAST_DAY; day += 1) {
  for (const d of docs.filter((d) => d.day === day - 1)) {
    downloads.push({
      user: backup.id,
      doc: d.id,
      day,
      seconds: at(3, 0) + between(0, 900),
      ip: '10.0.0.5',
      channel: 'OFFICE_NET',
    });
  }
}

// Digitalização: sobe e confere documentos públicos de vez em quando.
const scanner = user('svc_scanner');
for (let day = 0; day <= LAST_DAY; day += 1) {
  if (isWeekend(day) || !chance(0.4)) continue;
  const pool = docs.filter(
    (d) => d.day <= day && d.classification === 'PUBLICO',
  );
  downloads.push({
    user: scanner.id,
    doc: pick(pool).id,
    day,
    seconds: between(at(9, 0), at(17, 0)),
    ip: '10.0.0.8',
    channel: 'OFFICE_NET',
  });
}

// Link compartilhado do Augusto para o cliente, com a v6, expirado em 18/04.
for (const [date, h, m] of [
  ['2026-04-16', 10, 12],
  ['2026-04-16', 15, 47],
  ['2026-04-17', 9, 3],
] as const) {
  downloads.push({
    user: user('augusto.borges').id,
    doc: v6.id,
    day: dayOf(date),
    seconds: at(h, m, between(0, 59)),
    ip: '187.44.10.9',
    channel: 'SHARED_LINK',
  });
}

// O vazamento: a conta do Caetano, pela VPN, de um IP nunca visto, às 06:02.
downloads.push({
  user: user('c.brito').id,
  doc: v7.id,
  day: dayOf('2026-04-22'),
  seconds: at(6, 2, 41),
  ip: '200.155.31.77',
  channel: 'VPN',
});
// O sócio baixa a v7 no escritório, como sempre.
downloads.push({
  user: user('augusto.borges').id,
  doc: v7.id,
  day: dayOf('2026-04-22'),
  seconds: at(9, 40, 12),
  ip: '10.20.1.15',
  channel: 'OFFICE_NET',
});
// A Fernanda baixa a v6 várias vezes depois que ela sai.
for (const date of ['2026-04-16', '2026-04-17', '2026-04-20', '2026-04-21']) {
  downloads.push({
    user: user('f.matos').id,
    doc: v6.id,
    day: dayOf(date),
    seconds: between(at(9, 0), at(18, 0)),
    ip: officeIp(),
    channel: 'OFFICE_NET',
  });
}

downloads.sort(
  (a, b) => a.day - b.day || a.seconds - b.seconds || a.user - b.user,
);

// ── checagens do roteiro ───────────────────────────────────────────────
function check(ok: boolean, message: string) {
  if (!ok) throw new Error(`roteiro quebrado: ${message}`);
}
const byDoc = (d: Doc) => downloads.filter((x) => x.doc === d.id);
const v7Users = byDoc(v7).map((x) => users[x.user - 1].username);
check(
  v7Users.join() === ['c.brito', 'augusto.borges', 'svc_backup'].join(),
  `downloads da v7: ${v7Users.join()}`,
);
check(
  byDoc(v7)[0].seconds === at(6, 2, 41),
  'o primeiro download da v7 é o das 06:02',
);
const brito = user('c.brito');
const docById = new Map(docs.map((d) => [d.id, d]));
const conf = new Map<number, number>();
for (const x of downloads) {
  if (docById.get(x.doc)!.classification !== 'CONFIDENCIAL') continue;
  conf.set(x.user, (conf.get(x.user) ?? 0) + 1);
}
check(
  conf.get(brito.id) === 1,
  `Caetano com ${conf.get(brito.id)} downloads confidenciais`,
);
check(
  [...conf.entries()].filter(([, n]) => n === 1).length === 1,
  'só a conta do Caetano tem exatamente um download confidencial',
);
const afterTermination = downloads.filter(
  (x) => x.user === brito.id && x.day >= dayOf('2026-02-20'),
);
check(
  afterTermination.length === 1,
  'Caetano só baixa uma coisa depois de sair',
);
check(
  downloads.every((x) => x.user !== user('luana.prates').id),
  'Luana não baixou nada',
);
// Anti-join na Fusão Altamira: só o backup, o scanner (documento público) e o Caetano.
const outsiders = new Set(
  downloads
    .filter((x) => docById.get(x.doc)!.matter === ALTAMIRA.id)
    .filter((x) => !ALTAMIRA.team.includes(users[x.user - 1].username))
    .map((x) => users[x.user - 1].username),
);
check(
  [...outsiders].sort().join() === ['c.brito', 'svc_backup'].join(),
  `fora da equipe na Altamira: ${[...outsiders].join()}`,
);
check(
  byDoc(v6).some((x) => x.user === user('f.matos').id),
  'Fernanda baixou a v6',
);
const perUser = new Map<number, number>();
for (const x of downloads) perUser.set(x.user, (perUser.get(x.user) ?? 0) + 1);
const matos = perUser.get(user('f.matos').id)!;
check(
  [...perUser.entries()].every(
    ([id, n]) => id === user('f.matos').id || n < matos,
  ),
  'Fernanda é quem mais baixa',
);
check(
  v7.day === dayOf('2026-04-22') && v7.seconds === at(5, 20),
  'v7 criada às 05:20',
);
check(
  new Set(docs.map((d) => d.title)).size === docs.length,
  'títulos repetidos',
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

const teamRows = matters.flatMap((m) =>
  m.team.map((username) => [m.id, user(username).id]),
);

const sql = `-- Borges & Lacerda Advogados — sistema de documentos (05/01/2026 a 23/04/2026).
-- Gerado por tools/gen-case-004.ts. Não edite à mão: rode o gerador de novo.

CREATE TABLE hr_records (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL,
  terminated_at TEXT
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  hr_id INTEGER REFERENCES hr_records(id),
  active INTEGER NOT NULL
);

CREATE TABLE matters (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lead_partner INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE matter_team (
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (matter_id, user_id)
);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  matter_id INTEGER NOT NULL REFERENCES matters(id),
  title TEXT NOT NULL UNIQUE,
  classification TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE downloads (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  document_id INTEGER NOT NULL REFERENCES documents(id),
  downloaded_at TEXT NOT NULL,
  source_ip TEXT NOT NULL,
  channel TEXT NOT NULL
);

INSERT INTO hr_records (id, full_name, status, terminated_at) VALUES
${rows(hrRecords.map((h) => [h.id, h.name, h.status, h.terminatedAt]))};

INSERT INTO users (id, username, display_name, hr_id, active) VALUES
${rows(users.map((u) => [u.id, u.username, u.displayName, u.hrId, u.active]))};

INSERT INTO matters (id, name, lead_partner) VALUES
${rows(matters.map((m) => [m.id, m.name, user(m.lead).id]))};

INSERT INTO matter_team (matter_id, user_id) VALUES
${rows(teamRows)};

INSERT INTO documents (id, matter_id, title, classification, created_at) VALUES
${rows(docs.map((d) => [d.id, d.matter, d.title, d.classification, stamp(d.day, d.seconds)]))};

INSERT INTO downloads (id, user_id, document_id, downloaded_at, source_ip, channel) VALUES
${rows(downloads.map((x, index) => [index + 1, x.user, x.doc, stamp(x.day, x.seconds), x.ip, x.channel]))};
`;

writeFileSync(OUTPUT, sql);
console.log(
  `borges_dms.sql: ${users.length} contas, ${matters.length} matérias, ${docs.length} documentos, ${downloads.length} downloads`,
);
console.log(
  `  c.brito=${brito.id} f.matos=${user('f.matos').id} (${matos} downloads) svc_backup=${backup.id} v6=${v6.id} v7=${v7.id} Altamira=${ALTAMIRA.id}`,
);
