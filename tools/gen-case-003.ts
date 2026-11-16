/**
 * Gera o banco do caso 003 (Rede Praça Nova) de forma determinística: a mesma
 * semente produz sempre o mesmo SQL. O arquivo gerado é versionado em
 * cases/003-fila-caixa-7/db/pracanova_pdv.sql.
 *
 * Valores de estorno são múltiplos de R$ 0,25: em ponto flutuante eles somam
 * exato, então SUM() devolve o mesmo número que os fatos do caso esperam.
 *
 * Uso: bun tools/gen-case-003.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(
  new URL('../cases/003-fila-caixa-7/db/pracanova_pdv.sql', import.meta.url),
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

const rand = random(20260408);
const between = (min: number, max: number) =>
  Math.floor(min + rand() * (max - min + 1));
const pick = <T>(items: readonly T[]) => items[between(0, items.length - 1)];
const chance = (p: number) => rand() < p;
/** Valor em reais, múltiplo de R$ 0,25. */
const quarters = (min: number, max: number) =>
  between(Math.round(min * 4), Math.round(max * 4)) / 4;

// ── datas ──────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const FIRST = Date.UTC(2026, 1, 23); // segunda, 23/02/2026
const DAYS = 42; // seis semanas, até domingo 05/04/2026
const dayDate = (day: number) => new Date(FIRST + day * 86_400_000);
const dateOf = (day: number) => dayDate(day).toISOString().slice(0, 10);
const stamp = (day: number, seconds: number) =>
  `${dateOf(day)} ${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
const at = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;
const weekday = (day: number) => dayDate(day).getUTCDay();
/** Semana de promoção da loja Shopping: 16 a 22/03. */
const PROMO = [21, 27] as const;

// ── lojas e equipe ─────────────────────────────────────────────────────
const stores = [
  { id: 1, name: 'Centro', city: 'Campo Belo', registers: 9 },
  { id: 2, name: 'Shopping', city: 'Campo Belo', registers: 6 },
  { id: 3, name: 'Jardim Primavera', city: 'Campo Belo', registers: 5 },
  { id: 4, name: 'Rodoviária', city: 'Vila Serrana', registers: 4 },
];

type Shift = 'MANHA' | 'TARDE';
interface Staff {
  id: number;
  name: string;
  store: number;
  role: 'OPERADOR' | 'SUPERVISOR';
  shift: Shift;
  hiredAt: string;
  /** Caixa onde costuma trabalhar, vendas por dia e chance de estorno por venda. */
  register?: number;
  perDay?: number;
  refundRate?: number;
}

const roster: Array<Omit<Staff, 'id'>> = [
  // Centro
  {
    name: 'Rosana Lima',
    store: 1,
    role: 'SUPERVISOR',
    shift: 'TARDE',
    hiredAt: '2016-03-07',
  },
  {
    name: 'Marcia Teles',
    store: 1,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2018-05-14',
    register: 1,
    perDay: 94,
    refundRate: 0.085,
  },
  {
    name: 'Sueli Barreto',
    store: 1,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2020-08-03',
    register: 7,
    perDay: 38,
    refundRate: 0.03,
  },
  {
    name: 'Wellington Castro',
    store: 1,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2024-11-11',
    register: 7,
    perDay: 36,
    refundRate: 0,
  },
  {
    name: 'Paulo Garcia',
    store: 1,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2019-02-18',
    register: 9,
    perDay: 8,
    refundRate: 0,
  },
  {
    name: 'Denilson Prado',
    store: 1,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2022-04-25',
    register: 3,
    perDay: 22,
    refundRate: 0.04,
  },
  {
    name: 'Gisele Matos',
    store: 1,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2021-09-06',
    register: 2,
    perDay: 28,
    refundRate: 0.05,
  },
  {
    name: 'Joelma Fontes',
    store: 1,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2023-01-16',
    register: 4,
    perDay: 20,
    refundRate: 0.035,
  },
  // Shopping
  {
    name: 'Edson Rocha',
    store: 2,
    role: 'SUPERVISOR',
    shift: 'TARDE',
    hiredAt: '2017-06-12',
    register: undefined,
  },
  {
    name: 'Tatiane Leal',
    store: 2,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2020-02-03',
    register: 1,
    perDay: 30,
    refundRate: 0.045,
  },
  {
    name: 'Bruno Sales',
    store: 2,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2022-10-10',
    register: 2,
    perDay: 24,
    refundRate: 0.04,
  },
  {
    name: 'Aline Viana',
    store: 2,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2021-05-17',
    register: 3,
    perDay: 32,
    refundRate: 0.05,
  },
  {
    name: 'Rogério Dias',
    store: 2,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2019-11-25',
    register: 4,
    perDay: 27,
    refundRate: 0.045,
  },
  {
    name: 'Viviane Cruz',
    store: 2,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2023-07-03',
    register: 5,
    perDay: 18,
    refundRate: 0.04,
  },
  {
    name: 'Fernando Paz',
    store: 2,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2024-03-04',
    register: 6,
    perDay: 14,
    refundRate: 0.035,
  },
  // Jardim Primavera
  {
    name: 'Cláudia Neves',
    store: 3,
    role: 'SUPERVISOR',
    shift: 'MANHA',
    hiredAt: '2018-09-17',
  },
  {
    name: 'Márcio Telles',
    store: 3,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2020-06-01',
    register: 1,
    perDay: 26,
    refundRate: 0.04,
  },
  {
    name: 'Luana Freitas',
    store: 3,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2022-02-14',
    register: 2,
    perDay: 23,
    refundRate: 0.045,
  },
  {
    name: 'Otávio Brum',
    store: 3,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2021-08-23',
    register: 3,
    perDay: 19,
    refundRate: 0.03,
  },
  {
    name: 'Renata Sousa',
    store: 3,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2023-04-10',
    register: 4,
    perDay: 16,
    refundRate: 0.035,
  },
  {
    name: 'Kevin Souza',
    store: 3,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2026-04-02',
    register: 5,
    perDay: 1,
    refundRate: 0,
  },
  // Rodoviária
  {
    name: 'Hamilton Reis',
    store: 4,
    role: 'SUPERVISOR',
    shift: 'MANHA',
    hiredAt: '2015-01-19',
  },
  {
    name: 'Patrícia Gomes',
    store: 4,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2019-03-11',
    register: 1,
    perDay: 29,
    refundRate: 0.04,
  },
  {
    name: 'Diego Moraes',
    store: 4,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2021-12-06',
    register: 2,
    perDay: 25,
    refundRate: 0.05,
  },
  {
    name: 'Simone Araújo',
    store: 4,
    role: 'OPERADOR',
    shift: 'MANHA',
    hiredAt: '2022-07-18',
    register: 3,
    perDay: 17,
    refundRate: 0.035,
  },
  {
    name: 'Nelson Brito',
    store: 4,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2020-10-05',
    register: 4,
    perDay: 21,
    refundRate: 0.04,
  },
  {
    name: 'Karina Lopes',
    store: 4,
    role: 'OPERADOR',
    shift: 'TARDE',
    hiredAt: '2023-09-25',
    register: 3,
    perDay: 12,
    refundRate: 0.03,
  },
];

const staff: Staff[] = roster.map((member, index) => ({
  ...member,
  id: index + 1,
}));
const named = (name: string) => staff.find((member) => member.name === name)!;
const supervisorOf = (store: number) =>
  staff.find(
    (member) => member.store === store && member.role === 'SUPERVISOR',
  )!;
const wellington = named('Wellington Castro');
const sueli = named('Sueli Barreto');
const marcia = named('Marcia Teles');
const paulo = named('Paulo Garcia');
const kevin = named('Kevin Souza');

// ── vendas ─────────────────────────────────────────────────────────────
interface Sale {
  id: number;
  store: number;
  register: number;
  cashier: number;
  day: number;
  seconds: number;
  total: number;
  method: string;
}
interface Refund {
  sale: Sale;
  cashier: number;
  day: number;
  seconds: number;
  amount: number;
  reason: string;
  approvedBy: number | null;
}

const sales: Sale[] = [];
const refunds: Refund[] = [];
const methods = ['DINHEIRO', 'DEBITO', 'CREDITO', 'PIX'] as const;
const methodWeights = [0.25, 0.35, 0.3, 0.1];
const method = () => {
  let roll = rand();
  for (let i = 0; i < methods.length; i += 1) {
    roll -= methodWeights[i];
    if (roll < 0) return methods[i];
  }
  return 'DEBITO';
};
const shiftWindow = (shift: Shift) =>
  shift === 'MANHA' ? [at(7, 0), at(13, 0)] : [at(13, 0), at(21, 0)];
const reasons = [
  'Item cancelado',
  'Preço divergente',
  'Produto avariado',
  'Desistência do cliente',
  'Cobrança em duplicidade',
];

let saleId = 0;
for (const member of staff) {
  if (member.role !== 'OPERADOR') continue;
  const dayOff = between(1, 5); // uma folga fixa por semana, de segunda a sexta
  for (let day = 0; day < DAYS; day += 1) {
    if (dateOf(day) < member.hiredAt) continue;
    if (member !== kevin && weekday(day) === dayOff) continue;
    const count =
      member === kevin
        ? dateOf(day) === '2026-04-03'
          ? 3
          : 0
        : between(
            Math.floor(member.perDay! * 0.8),
            Math.ceil(member.perDay! * 1.2),
          );
    const [start, end] = shiftWindow(member.shift);
    for (let n = 0; n < count; n += 1) {
      const isAppliance = member === paulo;
      sales.push({
        id: ++saleId,
        store: member.store,
        register: member.register!,
        cashier: member.id,
        day,
        seconds: between(start, end - 60),
        total: isAppliance
          ? between(30_000, 420_000) / 100
          : between(450, 42_000) / 100,
        method: isAppliance
          ? pick(['CREDITO', 'CREDITO', 'DEBITO', 'PIX'])
          : method(),
      });
    }
  }
}

const refunded = new Set<number>();
function addRefund(sale: Sale, refund: Omit<Refund, 'sale'>) {
  refunded.add(sale.id);
  refunds.push({ sale, ...refund });
}

// Estornos comuns: itens pequenos sem supervisor; acima de R$ 50, com supervisor.
for (const sale of sales) {
  const member = staff[sale.cashier - 1];
  let rate = member.refundRate ?? 0;
  const promo =
    sale.store === 2 && sale.day >= PROMO[0] && sale.day <= PROMO[1];
  if (promo && sale.method === 'CREDITO') rate = 0.22; // devoluções da promoção
  if (!chance(rate)) continue;
  // A Marcia só cancela itens baratos: muitos estornos, valor total baixo.
  const big = promo ? chance(0.35) : member !== marcia && chance(0.08);
  const amount = Math.min(
    big
      ? quarters(52, 160)
      : member === marcia
        ? quarters(1, 22)
        : quarters(1.5, 43.75),
    Math.floor(sale.total * 4) / 4,
  );
  if (amount <= 0) continue;
  addRefund(sale, {
    cashier: member.id,
    day: sale.day,
    seconds: Math.min(sale.seconds + between(30, 900), at(21, 59)),
    amount,
    reason: promo ? 'Desistência do cliente' : pick(reasons),
    approvedBy: amount > 50 ? supervisorOf(sale.store).id : null,
  });
}

// Paulo: poucas devoluções grandes de eletro, todas com a supervisora.
const pauloSales = sales.filter(
  (sale) => sale.cashier === paulo.id && sale.total > 900,
);
for (const sale of pauloSales
  .filter((_, index) => index % 17 === 3)
  .slice(0, 14)) {
  addRefund(sale, {
    cashier: paulo.id,
    day: sale.day,
    seconds: Math.min(sale.seconds + between(3600, 7200), at(20, 50)),
    amount: Math.floor(sale.total * 4) / 4,
    reason: 'Produto com defeito (troca de eletro)',
    approvedBy: supervisorOf(1).id,
  });
}

// Kevin, o novato: três vendas e um estorno pequeno.
{
  const sale = sales.find((s) => s.cashier === kevin.id)!;
  addRefund(sale, {
    cashier: kevin.id,
    day: sale.day,
    seconds: sale.seconds + 200,
    amount: Math.min(6.5, Math.floor(sale.total * 4) / 4),
    reason: 'Item cancelado',
    approvedBy: null,
  });
}

// Wellington: estornos de R$ 44,00 a R$ 49,50 em vendas em dinheiro do caixa 7,
// sem supervisor, a maioria entre 14:00 e 14:40 (almoço da supervisora).
const FRAUD_COUNT = 250;
const FRAUD_TOTAL = 11_840;
const amounts = Array.from({ length: FRAUD_COUNT }, () => between(88, 99) / 2);
// Ajusta meio real por vez até o total bater, sem sair da faixa.
let diff = FRAUD_TOTAL - amounts.reduce((sum, value) => sum + value, 0);
for (let guard = 0; diff !== 0 && guard < 100_000; guard += 1) {
  const index = between(0, FRAUD_COUNT - 1);
  const step = diff > 0 ? 0.5 : -0.5;
  const next = amounts[index] + step;
  if (next < 44 || next > 49.5) continue;
  amounts[index] = next;
  diff -= step;
}
const workDays = [
  ...new Set(
    sales.filter((s) => s.cashier === wellington.id).map((s) => s.day),
  ),
];
const register7Cash = sales.filter(
  (sale) =>
    sale.store === 1 &&
    sale.register === 7 &&
    sale.method === 'DINHEIRO' &&
    sale.total >= 50 &&
    !refunded.has(sale.id),
);
let fraudIndex = 0;
for (let round = 0; fraudIndex < FRAUD_COUNT && round < 50; round += 1) {
  for (const day of workDays) {
    if (fraudIndex >= FRAUD_COUNT) break;
    const lunch = chance(0.7);
    const seconds = lunch
      ? between(at(14, 0), at(14, 39, 59))
      : chance(0.5)
        ? between(at(13, 5), at(13, 59, 59))
        : between(at(15, 0), at(20, 50));
    const sale = register7Cash.find(
      (candidate) =>
        candidate.day === day &&
        candidate.seconds < seconds &&
        !refunded.has(candidate.id),
    );
    if (!sale) continue;
    addRefund(sale, {
      cashier: wellington.id,
      day,
      seconds,
      amount: amounts[fraudIndex],
      reason: pick(['Desistência do cliente', 'Item cancelado']),
      approvedBy: null,
    });
    fraudIndex += 1;
  }
}

// ── ordem final e ids ──────────────────────────────────────────────────
sales.sort((a, b) => a.day - b.day || a.seconds - b.seconds || a.id - b.id);
const saleIds = new Map(sales.map((sale, index) => [sale, 100_001 + index]));
refunds.sort((a, b) => a.day - b.day || a.seconds - b.seconds);

// ── checagens do roteiro ───────────────────────────────────────────────
function check(ok: boolean, message: string) {
  if (!ok) throw new Error(`roteiro quebrado: ${message}`);
}
interface Tally {
  sales: number;
  refunds: number;
  total: number;
  unapproved: number[];
}
const tally = new Map<number, Tally>();
for (const member of staff)
  tally.set(member.id, { sales: 0, refunds: 0, total: 0, unapproved: [] });
for (const sale of sales) tally.get(sale.cashier)!.sales += 1;
for (const refund of refunds) {
  const entry = tally.get(refund.cashier)!;
  entry.refunds += 1;
  entry.total += refund.amount;
  if (refund.approvedBy === null) entry.unapproved.push(refund.amount);
}
const of = (member: Staff) => tally.get(member.id)!;
const ratio = (t: Tally) => (t.sales ? t.refunds / t.sales : 0);
const operators = staff.filter((m) => m.role === 'OPERADOR');

const w = of(wellington);
check(w.refunds === FRAUD_COUNT, `Wellington com ${w.refunds} estornos`);
check(w.total === FRAUD_TOTAL, `total do Wellington ${w.total}`);
check(
  operators.every((m) => m === marcia || of(m).refunds < of(marcia).refunds),
  'Marcia precisa ter mais estornos que todos',
);
check(
  operators.every((m) => m === paulo || of(m).total < of(paulo).total),
  'Paulo precisa ter o maior total',
);
check(
  operators
    .filter((m) => m !== wellington && of(m).sales >= 100)
    .every((m) => ratio(of(m)) < ratio(w)),
  'Wellington precisa ter a maior razão entre quem tem 100+ vendas',
);
check(
  ratio(of(kevin)) > ratio(w) && of(kevin).sales === 3,
  'o novato tem a maior razão sem filtro',
);
check(
  operators.every((m) => {
    if (m === wellington) return true;
    const list = of(m).unapproved;
    return !(Math.min(...list) === 44 && Math.max(...list) === 49.5);
  }),
  'outro operador com o mesmo mínimo e máximo do Wellington',
);
const marciaTotal = of(marcia).total;
check(
  marciaTotal > 2000 && marciaTotal < 5000,
  `total da Marcia ${marciaTotal}`,
);
const lunch = refunds.filter(
  (r) => r.cashier === wellington.id && Math.floor(r.seconds / 3600) === 14,
);
const lunchTotal = lunch.reduce((sum, r) => sum + r.amount, 0);
check(
  lunchTotal > 5000 && lunchTotal < 9000,
  `estornos das 14h somam ${lunchTotal}`,
);
check(
  lunch.every((r) => r.seconds < at(14, 40)),
  'estorno das 14h depois das 14:40',
);
const centroTotal = refunds
  .filter((r) => r.sale.store === 1)
  .reduce((sum, r) => sum + r.amount, 0);
check(centroTotal > 14_000, `total do Centro ${centroTotal}`);
check(
  refunds.every((r) => r.amount > 50 === (r.approvedBy !== null)),
  'acima de R$ 50 sempre com supervisor, abaixo nunca',
);
check(
  refunds.every(
    (r) => r.amount <= r.sale.total && Number.isInteger(r.amount * 4),
  ),
  'estorno maior que a venda ou fora dos múltiplos de R$ 0,25',
);
check(
  refunds.every((r) => r.day > r.sale.day || r.seconds > r.sale.seconds),
  'estorno antes da venda',
);
check(
  new Set(refunds.map((r) => r.sale.id)).size === refunds.length,
  'venda estornada duas vezes',
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

const sql = `-- Rede Praça Nova — vendas e estornos dos PDVs (23/02/2026 a 05/04/2026).
-- Gerado por tools/gen-case-003.ts. Não edite à mão: rode o gerador de novo.

CREATE TABLE stores (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE cashiers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  role TEXT NOT NULL,
  shift TEXT NOT NULL,
  hired_at TEXT NOT NULL
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  register_no INTEGER NOT NULL,
  cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
  sold_at TEXT NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL
);

CREATE TABLE refunds (
  id INTEGER PRIMARY KEY,
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions(id),
  cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
  refunded_at TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  approved_by INTEGER REFERENCES cashiers(id)
);

INSERT INTO stores (id, name, city) VALUES
${rows(stores.map((s) => [s.id, s.name, s.city]))};

INSERT INTO cashiers (id, name, store_id, role, shift, hired_at) VALUES
${rows(staff.map((m) => [m.id, m.name, m.store, m.role, m.shift, m.hiredAt]))};

INSERT INTO transactions (id, store_id, register_no, cashier_id, sold_at, total, payment_method) VALUES
${rows(sales.map((s) => [saleIds.get(s)!, s.store, s.register, s.cashier, stamp(s.day, s.seconds), s.total, s.method]))};

INSERT INTO refunds (id, transaction_id, cashier_id, refunded_at, amount, reason, approved_by) VALUES
${rows(refunds.map((r, index) => [index + 1, saleIds.get(r.sale)!, r.cashier, stamp(r.day, r.seconds), r.amount, r.reason, r.approvedBy]))};
`;

writeFileSync(OUTPUT, sql);
const report = (member: Staff) => {
  const t = of(member);
  return `${member.name} (${member.id}): ${t.sales} vendas, ${t.refunds} estornos, R$ ${t.total.toFixed(2)}`;
};
console.log(
  `pracanova_pdv.sql: ${staff.length} pessoas, ${sales.length} vendas, ${refunds.length} estornos`,
);
for (const member of [wellington, marcia, paulo, sueli, kevin])
  console.log(`  ${report(member)}`);
console.log(
  `  14h do Wellington: ${lunch.length} estornos, R$ ${lunchTotal.toFixed(2)} · Centro R$ ${centroTotal.toFixed(2)}`,
);
