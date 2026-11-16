/**
 * Gera o banco do caso 002 (Mercatto Alimentos) de forma determinística: a
 * mesma semente produz sempre o mesmo SQL. O arquivo gerado é versionado em
 * cases/002-fornecedor-fantasma/db/mercatto_financeiro.sql.
 *
 * Uso: bun tools/gen-case-002.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(
  new URL(
    '../cases/002-fornecedor-fantasma/db/mercatto_financeiro.sql',
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

const rand = random(20260323);
const between = (min: number, max: number) =>
  Math.floor(min + rand() * (max - min + 1));
const pick = <T>(items: readonly T[]) => items[between(0, items.length - 1)];
const chance = (p: number) => rand() < p;

// ── datas ("AAAA-MM-DD", sem hora: julianday dá dias inteiros) ─────────
const DAY = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => iso(toTime(date) + days * DAY);
const weekday = (date: string) => new Date(toTime(date)).getUTCDay();
const isWeekend = (date: string) => [0, 6].includes(weekday(date));
/** Empurra sábado e domingo para a segunda-feira. */
const businessDay = (date: string) => {
  let day = date;
  while (isWeekend(day)) day = addDays(day, 1);
  return day;
};
const daysBetween = (a: string, b: string) => (toTime(b) - toTime(a)) / DAY;

/** Janela dos dados: de 01/03/2025 até a véspera do contrato. */
const START = '2025-03-01';
const CUTOFF = '2026-03-20';

// ── funcionários ───────────────────────────────────────────────────────
interface Employee {
  id: number;
  name: string;
  department: string;
  jobTitle: string;
  account: string;
  hiredAt: string;
}

const bankAccount = () =>
  `${pick(['001', '033', '104', '237', '341', '756'])} ${String(between(1000, 9999))} ${String(between(10000, 99999))}-${between(0, 9)}`;

const staff: Array<[string, string, string, string]> = [
  ['Leandro Porto', 'Controladoria', 'Controller', '2019-04-01'],
  ['Renata Assis', 'Controladoria', 'Analista de controladoria', '2022-02-14'],
  ['Sérgio Lins', 'Financeiro', 'Gerente financeiro', '2017-08-07'],
  ['Bruna Calado', 'Financeiro', 'Analista de contas a pagar', '2025-03-03'],
  ['Lúcia Prado', 'Financeiro', 'Analista de contas a pagar', '2021-06-21'],
  ['Hélio Bastos', 'Financeiro', 'Tesoureiro', '2018-11-05'],
  ['Tiago Seixas', 'Compras', 'Analista de compras', '2022-09-12'],
  ['Carla Menezes', 'Compras', 'Coordenadora de compras', '2018-03-19'],
  ['Igor Salles', 'Compras', 'Comprador', '2023-05-08'],
  ['Olavo Dantas', 'TI', 'Analista de sistemas', '2020-10-01'],
  ['Priscila Nogueira', 'TI', 'Coordenadora de TI', '2016-07-18'],
  ['Marcos Veiga', 'Marketing', 'Analista de marketing', '2025-09-01'],
  ['Juliana Rocha', 'Marketing', 'Gerente de marketing', '2019-01-14'],
  ['Fábio Antunes', 'Produção', 'Gerente de produção', '2015-02-02'],
  ['Elaine Costa', 'Produção', 'Supervisora de linha', '2017-09-25'],
  ['Rogério Paiva', 'Produção', 'Supervisor de linha', '2020-01-13'],
  ['Simone Freire', 'Produção', 'Operadora de envase', '2021-04-05'],
  ['Wesley Moura', 'Produção', 'Operador de máquinas', '2022-07-11'],
  ['Tânia Ribeiro', 'Qualidade', 'Coordenadora de qualidade', '2016-10-03'],
  ['André Luz', 'Qualidade', 'Analista de qualidade', '2023-02-20'],
  ['Valéria Campos', 'Qualidade', 'Técnica de laboratório', '2022-03-28'],
  ['Gilberto Sá', 'Manutenção', 'Supervisor de manutenção', '2014-06-16'],
  ['Robson Teixeira', 'Manutenção', 'Eletricista', '2019-08-19'],
  ['Cícero Alves', 'Manutenção', 'Mecânico', '2021-11-08'],
  ['Natália Brandt', 'Logística', 'Gerente de logística', '2018-05-14'],
  ['Diego Farias', 'Logística', 'Analista de expedição', '2020-09-21'],
  ['Kátia Lemos', 'Logística', 'Assistente de logística', '2023-08-07'],
  ['Mauro Pires', 'Logística', 'Conferente', '2021-01-25'],
  ['Patrícia Duarte', 'RH', 'Gerente de RH', '2016-04-11'],
  ['Felipe Arruda', 'RH', 'Analista de RH', '2022-10-17'],
  ['Larissa Melo', 'RH', 'Assistente de departamento pessoal', '2024-01-08'],
  ['Eduardo Matsuda', 'Comercial', 'Diretor comercial', '2015-07-06'],
  ['Camila Ferraz', 'Comercial', 'Executiva de contas', '2021-03-01'],
  ['Henrique Vidal', 'Comercial', 'Executivo de contas', '2023-06-12'],
  ['Sabrina Lopes', 'Comercial', 'Assistente comercial', '2024-04-15'],
  ['Otávio Reis', 'Diretoria', 'Diretor financeiro', '2013-01-07'],
  ['Marina Couto', 'Diretoria', 'Diretora geral', '2012-09-03'],
  ['Jonas Prado', 'Jurídico', 'Advogado', '2020-02-10'],
  ['Beatriz Nunes', 'Facilities', 'Supervisora de facilities', '2018-12-03'],
  ['Ronaldo Gil', 'Facilities', 'Assistente de facilities', '2023-11-20'],
];

const employees: Employee[] = staff.map(
  ([name, department, jobTitle, hiredAt], index) => ({
    id: index + 1,
    name,
    department,
    jobTitle,
    account: bankAccount(),
    hiredAt,
  }),
);
const person = (name: string) => employees.find((e) => e.name === name)!;
const tiago = person('Tiago Seixas');
const bruna = person('Bruna Calado');
const lucia = person('Lúcia Prado');
const sergio = person('Sérgio Lins');
const olavo = person('Olavo Dantas');
const marcos = person('Marcos Veiga');
const buyers = ['Tiago Seixas', 'Carla Menezes', 'Igor Salles'].map(person);

// ── fornecedores ───────────────────────────────────────────────────────
interface Vendor {
  id: number;
  name: string;
  taxId: string;
  account: string;
  address: string;
  createdBy: number;
  createdAt: string;
  /** Faixa de valor das faturas e quantas por mês, para o gerador. */
  amount?: [number, number];
  perMonth?: number;
  description?: string;
  departments?: string[];
}

const cnpj = () =>
  `${between(10, 99)}.${between(100, 999)}.${between(100, 999)}/0001-${between(10, 99)}`;
const streets = [
  'Rua Coronel Bento',
  'Av. das Indústrias',
  'Rua Ipiranga',
  'Rod. SP-340, km',
  'Rua Treze de Maio',
  'Av. Brasil',
  'Rua do Comércio',
  'Rua Visconde de Mauá',
  'Av. Santos Dumont',
  'Rua Barão de Jaguara',
];
const address = () => `${pick(streets)}, ${between(12, 2400)}`;
/** Cadastro antigo, antes da janela dos dados (2021 a 2024). */
const oldDate = () =>
  businessDay(iso(toTime('2021-01-04') + between(0, 1400) * DAY));

const COWORKING = 'Av. Industrial, 1500, sala 214';

/** Fornecedores legítimos: [nome, faixa de valor, faturas por mês, descrição, departamentos]. */
const legit: Array<[string, [number, number], number, string, string[]]> = [
  [
    'Embalagens Serra Azul Ltda',
    [8000, 26000],
    2,
    'Caixas e filme stretch',
    ['Produção', 'Logística'],
  ],
  [
    'Laticínios Campo Bom S.A.',
    [18000, 48000],
    3,
    'Leite e derivados (insumo)',
    ['Produção'],
  ],
  [
    'Moinho Santa Clara Ltda',
    [12000, 39000],
    2,
    'Farinha de trigo (insumo)',
    ['Produção'],
  ],
  [
    'Açúcar Boa Vista Ltda',
    [9000, 28000],
    2,
    'Açúcar refinado (insumo)',
    ['Produção'],
  ],
  [
    'Transportes Rota Sul Ltda',
    [6000, 19000],
    2,
    'Frete rodoviário',
    ['Logística'],
  ],
  [
    'Rota Sul Log Transportes ME',
    [3000, 9000],
    1,
    'Coleta e entrega urbana',
    ['Logística'],
  ],
  [
    'Eletro Forte Manutenção Ltda',
    [2500, 11000],
    1,
    'Manutenção elétrica',
    ['Manutenção'],
  ],
  [
    'Refrigeração Polar Ltda',
    [3000, 14000],
    1,
    'Manutenção de câmaras frias',
    ['Manutenção', 'Produção'],
  ],
  [
    'Lab Análise Certa Ltda',
    [1800, 6500],
    1,
    'Análises microbiológicas',
    ['Qualidade'],
  ],
  [
    'Uniformes Atlas ME',
    [2000, 7500],
    1,
    'Uniformes e EPIs',
    ['RH', 'Produção'],
  ],
  [
    'Gráfica Ponto Final Ltda',
    [900, 4800],
    1,
    'Rótulos e impressos',
    ['Marketing', 'Produção'],
  ],
  [
    'Agência Vitrine Comunicação',
    [4000, 15000],
    1,
    'Campanhas e mídia',
    ['Marketing'],
  ],
  [
    'Contabilidade Exata S/S',
    [6500, 6500],
    1,
    'Assessoria contábil mensal',
    ['Controladoria'],
  ],
  [
    'Advocacia Moreira & Faria',
    [5000, 12000],
    1,
    'Honorários jurídicos',
    ['Jurídico'],
  ],
  [
    'Segurança Vigil Ltda',
    [14800, 14800],
    1,
    'Vigilância patrimonial mensal',
    ['Facilities'],
  ],
  [
    'Limpeza Brilho Total Ltda',
    [11200, 11200],
    1,
    'Limpeza predial mensal',
    ['Facilities'],
  ],
  [
    'Restaurante Sabor da Terra',
    [16000, 22000],
    1,
    'Refeições dos funcionários',
    ['RH'],
  ],
  [
    'Combustíveis Via Norte Ltda',
    [4000, 13000],
    2,
    'Diesel da frota',
    ['Logística'],
  ],
  [
    'Pneus Rodaforte Ltda',
    [3000, 16000],
    1,
    'Pneus e recapagem',
    ['Logística'],
  ],
  [
    'Química Pura Ltda',
    [2500, 9000],
    1,
    'Produtos de limpeza industrial',
    ['Produção'],
  ],
  [
    'Ferragens Central Ltda',
    [400, 3800],
    1,
    'Peças e ferramentas',
    ['Manutenção'],
  ],
  [
    'Papelaria Escritório Mais',
    [300, 2200],
    1,
    'Material de escritório',
    ['Facilities'],
  ],
  ['Telecom Conecta S.A.', [3900, 3900], 1, 'Telefonia e internet', ['TI']],
  [
    'Energia Comercializadora Alfa',
    [42000, 68000],
    1,
    'Energia elétrica (mercado livre)',
    ['Facilities'],
  ],
  [
    'Água Mineral Fonte Clara',
    [800, 1900],
    1,
    'Galões de água',
    ['Facilities'],
  ],
  [
    'Consultoria Lean Brasil',
    [9000, 21000],
    1,
    'Consultoria de processos',
    ['Produção'],
  ],
  [
    'Saúde Vida Assistência Médica',
    [38000, 41000],
    1,
    'Plano de saúde',
    ['RH'],
  ],
  ['Treinamentos Saber Ltda', [2500, 8000], 1, 'Treinamentos NR', ['RH']],
  [
    'Locadora Frota Já Ltda',
    [9000, 18000],
    1,
    'Locação de veículos',
    ['Logística', 'Comercial'],
  ],
  [
    'Eventos Palco Aberto Ltda',
    [6000, 24000],
    1,
    'Feiras e eventos',
    ['Comercial', 'Marketing'],
  ],
  [
    'Hidráulica Fluxo Ltda',
    [700, 5200],
    1,
    'Manutenção hidráulica',
    ['Manutenção'],
  ],
  [
    'Dedetizadora Campo Limpo',
    [1900, 1900],
    1,
    'Controle de pragas mensal',
    ['Qualidade'],
  ],
  [
    'Correios Express Entregas',
    [500, 2800],
    1,
    'Envio de amostras',
    ['Comercial'],
  ],
  ['Software Gestor ERP Ltda', [7800, 7800], 1, 'Licença do ERP', ['TI']],
  [
    'Copiadoras Nitidez Ltda',
    [1200, 1200],
    1,
    'Locação de impressoras',
    ['TI'],
  ],
  [
    'Certificadora Selo Alto',
    [6000, 14000],
    1,
    'Auditoria de certificação',
    ['Qualidade'],
  ],
];

let vendorId = 0;
const vendors: Vendor[] = legit.map(
  ([name, amount, perMonth, description, departments]) => ({
    id: ++vendorId,
    name,
    taxId: cnpj(),
    account: bankAccount(),
    address: name.includes('Rota Sul') ? COWORKING : address(),
    createdBy: pick(buyers).id,
    createdAt: oldDate(),
    amount,
    perMonth,
    description,
    departments,
  }),
);

// Olavo cadastrou três fornecedores de software no começo de 2026, todos com PO.
const olavoVendors: Array<[string, string, [number, number]]> = [
  ['Nuvem Clara Software Ltda', '2026-01-12', [2400, 2400]],
  ['Pixel Norte Licenças ME', '2026-01-26', [1350, 1350]],
  ['Byte Sul Infraestrutura Ltda', '2026-02-09', [5600, 8900]],
];
for (const [name, createdAt, amount] of olavoVendors) {
  vendors.push({
    id: ++vendorId,
    name,
    taxId: cnpj(),
    account: bankAccount(),
    address: address(),
    createdBy: olavo.id,
    createdAt,
    amount,
    perMonth: 1,
    description: 'Licenças e serviços de software',
    departments: ['TI'],
  });
}

// Marcos fotografava eventos da Mercatto como MEI antes de ser contratado.
const marcosVendor: Vendor = {
  id: ++vendorId,
  name: 'Marcos Veiga Fotografia',
  taxId: cnpj(),
  account: marcos.account,
  address: address(),
  createdBy: person('Igor Salles').id,
  createdAt: '2025-04-10',
};
vendors.push(marcosVendor);

const cantina: Vendor = {
  id: ++vendorId,
  name: 'Cantina Dona Odete',
  taxId: cnpj(),
  account: bankAccount(),
  address: address(),
  createdBy: person('Carla Menezes').id,
  createdAt: '2024-08-02',
};
vendors.push(cantina);

// O fornecedor fantasma: conta de Tiago, cadastrado por ele.
const delta: Vendor = {
  id: ++vendorId,
  name: 'Delta Higienização ME',
  taxId: cnpj(),
  account: tiago.account,
  address: 'Rua das Acácias, 77, fundos',
  createdBy: tiago.id,
  createdAt: '2025-06-30',
};
vendors.push(delta);

// Mais alguns cadastros antigos sem movimento no período (fornecedores esporádicos).
for (const name of [
  'Mudanças Bom Destino Ltda',
  'Buffet Recanto Verde',
  'Tapeçaria Arte Fina',
]) {
  vendors.push({
    id: ++vendorId,
    name,
    taxId: cnpj(),
    account: bankAccount(),
    address: address(),
    createdBy: pick(buyers).id,
    createdAt: oldDate(),
  });
}

// ── pedidos de compra, faturas e pagamentos ────────────────────────────
interface PurchaseOrder {
  number: string;
  requestedBy: number;
  department: string;
  openedAt: string;
}
interface Invoice {
  id: number;
  vendorId: number;
  po: string | null;
  amount: number;
  issuedAt: string;
  description: string;
}
interface Payment {
  invoiceId: number;
  paidAt: string;
  approvedBy: number;
}

const orders: PurchaseOrder[] = [];
const invoices: Omit<Invoice, 'id'>[] = [];
const payments: Array<
  Omit<Payment, 'invoiceId'> & { invoice: Omit<Invoice, 'id'> }
> = [];
const money = (min: number, max: number) =>
  Math.round((min + rand() * (max - min)) * 100) / 100;

let poCounter = 0;
function openOrder(department: string, openedAt: string): PurchaseOrder {
  poCounter += 1;
  const year = openedAt.slice(0, 4);
  const requesters = employees.filter((e) => e.department === department);
  const order = {
    number: `PO-${year}-${String(poCounter).padStart(4, '0')}`,
    requestedBy: pick(requesters.length ? requesters : buyers).id,
    department,
    openedAt,
  };
  orders.push(order);
  return order;
}

/** Quem aprova: acima da alçada de R$ 30 mil, o gerente; abaixo, contas a pagar. */
function approverFor(amount: number, paidAt: string): number {
  if (amount > 30_000) return sergio.id;
  if (paidAt < '2025-03-17') return sergio.id; // Bruna ainda em treinamento
  return chance(0.78) ? bruna.id : lucia.id;
}

const months: string[] = [];
for (let m = 0; m < 13; m += 1) {
  const d = new Date(Date.UTC(2025, 2 + m, 1));
  months.push(iso(d.getTime()).slice(0, 7));
}

for (const vendor of vendors) {
  if (!vendor.amount || !vendor.perMonth) continue;
  const fixed = vendor.amount[0] === vendor.amount[1];
  // Contratos recorrentes têm um PO por semestre; compras avulsas, um por fatura.
  let standing: PurchaseOrder | null = null;
  for (const month of months) {
    const first = `${month}-01`;
    if (first < vendor.createdAt.slice(0, 7) + '-01') continue;
    for (let n = 0; n < vendor.perMonth; n += 1) {
      if (!fixed && chance(0.12)) continue; // nem todo mês tem compra
      const issuedAt = businessDay(
        `${month}-${String(between(3, 26)).padStart(2, '0')}`,
      );
      if (issuedAt < START || issuedAt > CUTOFF || issuedAt < vendor.createdAt)
        continue;
      const department = pick(vendor.departments!);
      let po: PurchaseOrder;
      if (fixed) {
        if (!standing || month.endsWith('-03') || month.endsWith('-09'))
          standing = openOrder(department, addDays(issuedAt, -between(10, 20)));
        po = standing;
      } else {
        po = openOrder(department, addDays(issuedAt, -between(5, 18)));
      }
      const amount = money(vendor.amount[0], vendor.amount[1]);
      const invoice = {
        vendorId: vendor.id,
        po: po.number,
        amount,
        issuedAt,
        description: vendor.description!,
      };
      invoices.push(invoice);
      // Pagamento padrão: em torno de 28 dias, sempre em dia útil.
      const paidAt = businessDay(addDays(issuedAt, between(25, 31)));
      if (paidAt <= CUTOFF)
        payments.push({
          invoice,
          paidAt,
          approvedBy: approverFor(amount, paidAt),
        });
    }
  }
}

// Marcos Veiga Fotografia: dois eventos em 2025, antes da contratação dele.
for (const [issuedAt, amount] of [
  ['2025-04-28', 3200],
  ['2025-06-16', 2750],
] as const) {
  const po = openOrder('Marketing', addDays(issuedAt, -12));
  const invoice = {
    vendorId: marcosVendor.id,
    po: po.number,
    amount,
    issuedAt,
    description: 'Cobertura fotográfica de evento',
  };
  invoices.push(invoice);
  const paidAt = businessDay(addDays(issuedAt, 28));
  payments.push({ invoice, paidAt, approvedBy: approverFor(amount, paidAt) });
}

// Cantina Dona Odete: único gasto sem PO além da Delta, coberto pela política de reembolso.
{
  const invoice = {
    vendorId: cantina.id,
    po: null,
    amount: 380,
    issuedAt: '2025-10-14',
    description: 'Coffee break da reunião de diretoria (reembolso)',
  };
  invoices.push(invoice);
  payments.push({ invoice, paidAt: '2025-10-24', approvedBy: lucia.id });
}

// Delta: sem PO, fim de mês (a primeira é o "teste"), paga em 1 ou 2 dias, sempre por Bruna.
const deltaInvoices: Array<[string, number, number]> = [
  ['2025-07-02', 9840.0, 1],
  ['2025-07-29', 24315.5, 1],
  ['2025-08-27', 25980.0, 2],
  ['2025-09-29', 26460.0, 1],
  ['2025-10-29', 25310.4, 1],
  ['2025-11-26', 26120.0, 2],
  ['2025-12-29', 24745.9, 1],
  ['2026-01-28', 26180.0, 1],
  ['2026-02-24', 25390.2, 2],
];
const deltaServices = [
  'Higienização industrial — linha 1',
  'Higienização industrial — linhas 1 e 2',
  'Sanitização de tanques e tubulações',
];
for (const [issuedAt, amount, days] of deltaInvoices) {
  const invoice = {
    vendorId: delta.id,
    po: null,
    amount,
    issuedAt,
    description: pick(deltaServices),
  };
  invoices.push(invoice);
  payments.push({
    invoice,
    paidAt: addDays(issuedAt, days),
    approvedBy: bruna.id,
  });
}

// ── ordem final e ids ──────────────────────────────────────────────────
invoices.sort((a, b) =>
  a.issuedAt < b.issuedAt
    ? -1
    : a.issuedAt > b.issuedAt
      ? 1
      : a.vendorId - b.vendorId,
);
const invoiceRows: Invoice[] = invoices.map((invoice, index) => ({
  ...invoice,
  id: 1001 + index,
}));
const idOf = new Map(invoices.map((invoice, index) => [invoice, 1001 + index]));
const paymentRows = payments
  .map((payment) => ({
    invoiceId: idOf.get(payment.invoice)!,
    paidAt: payment.paidAt,
    approvedBy: payment.approvedBy,
  }))
  .sort((a, b) =>
    a.paidAt < b.paidAt
      ? -1
      : a.paidAt > b.paidAt
        ? 1
        : a.invoiceId - b.invoiceId,
  );
orders.sort((a, b) =>
  a.openedAt < b.openedAt ? -1 : a.openedAt > b.openedAt ? 1 : 0,
);

// ── checagens do roteiro ───────────────────────────────────────────────
function check(ok: boolean, message: string) {
  if (!ok) throw new Error(`roteiro quebrado: ${message}`);
}

const accountMatches = vendors.filter((v) =>
  employees.some((e) => e.account === v.account),
);
check(
  accountMatches
    .map((v) => v.name)
    .sort()
    .join() === ['Delta Higienização ME', 'Marcos Veiga Fotografia'].join(),
  `contas repetidas: ${accountMatches.map((v) => v.name).join(', ')}`,
);
check(
  new Set(employees.map((e) => e.account)).size === employees.length,
  'contas de funcionários repetidas',
);

const deltaRows = invoiceRows.filter((i) => i.vendorId === delta.id);
const total = deltaRows.reduce((sum, i) => sum + i.amount, 0);
check(Math.abs(total - 214_342) < 1, `total da Delta: ${total}`);
check(
  deltaRows.every((i) => i.po === null),
  'fatura da Delta com PO',
);
check(
  deltaRows.every((i) => i.amount < 30_000),
  'fatura da Delta acima da alçada',
);
check(
  daysBetween(delta.createdAt, deltaRows[0].issuedAt) === 2,
  'primeira fatura 2 dias após o cadastro',
);

const withoutPo = invoiceRows.filter((i) => i.po === null);
check(withoutPo.length === deltaRows.length + 1, 'só Delta e a Cantina sem PO');

const deltaPayments = paymentRows.filter((p) =>
  deltaRows.some((i) => i.id === p.invoiceId),
);
check(
  deltaPayments.filter((p) => {
    const invoice = invoiceRows.find((i) => i.id === p.invoiceId)!;
    return daysBetween(invoice.issuedAt, p.paidAt) === 1;
  }).length === 6,
  'seis pagamentos da Delta em 1 dia',
);
check(
  new Set(deltaPayments.map((p) => p.approvedBy)).size === 1,
  'Delta com um aprovador só',
);
check(
  paymentRows.every((p) => !isWeekend(p.paidAt)),
  'pagamento em fim de semana',
);

const brunaShare =
  paymentRows.filter((p) => p.approvedBy === bruna.id).length /
  paymentRows.length;
check(
  brunaShare > 0.62 && brunaShare < 0.78,
  `Bruna aprova ${brunaShare.toFixed(2)}`,
);

const legitDays = paymentRows
  .filter((p) => !deltaRows.some((i) => i.id === p.invoiceId))
  .map((p) => {
    const invoice = invoiceRows.find((i) => i.id === p.invoiceId)!;
    return daysBetween(invoice.issuedAt, p.paidAt);
  });
const average = legitDays.reduce((a, b) => a + b, 0) / legitDays.length;
check(average > 26 && average < 31, `prazo médio legítimo ${average}`);

check(
  vendors.filter((v) => v.createdBy === olavo.id).length === 3,
  'Olavo cadastrou 3',
);
check(
  vendors.filter((v) => v.address === COWORKING).length === 2,
  'Rota Sul no mesmo endereço',
);
check(
  marcosVendor.createdAt < marcos.hiredAt,
  'fornecedor do Marcos antes da admissão',
);
check(
  invoiceRows
    .filter((i) => i.vendorId === marcosVendor.id)
    .every((i) => i.issuedAt < marcos.hiredAt),
  'Marcos sem faturas depois da admissão',
);
// Ids que os fatos usam não podem se confundir com outros números das linhas.
check(
  delta.id !== tiago.id && delta.id !== olavo.id,
  'ids de fornecedor e funcionário iguais',
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

const sql = `-- Mercatto Alimentos — contas a pagar (01/03/2025 a 20/03/2026).
-- Gerado por tools/gen-case-002.ts. Não edite à mão: rode o gerador de novo.

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  hired_at TEXT NOT NULL
);

CREATE TABLE vendors (
  id INTEGER PRIMARY KEY,
  legal_name TEXT NOT NULL,
  tax_id TEXT NOT NULL UNIQUE,
  bank_account TEXT NOT NULL,
  address TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES employees(id),
  created_at TEXT NOT NULL
);

CREATE TABLE purchase_orders (
  po_number TEXT PRIMARY KEY,
  requested_by INTEGER NOT NULL REFERENCES employees(id),
  department TEXT NOT NULL,
  opened_at TEXT NOT NULL
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  po_number TEXT REFERENCES purchase_orders(po_number),
  amount REAL NOT NULL,
  issued_at TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL UNIQUE REFERENCES invoices(id),
  paid_at TEXT NOT NULL,
  approved_by INTEGER NOT NULL REFERENCES employees(id),
  status TEXT NOT NULL
);

INSERT INTO employees (id, name, department, job_title, bank_account, hired_at) VALUES
${rows(employees.map((e) => [e.id, e.name, e.department, e.jobTitle, e.account, e.hiredAt]))};

INSERT INTO vendors (id, legal_name, tax_id, bank_account, address, created_by, created_at) VALUES
${rows(vendors.map((v) => [v.id, v.name, v.taxId, v.account, v.address, v.createdBy, v.createdAt]))};

INSERT INTO purchase_orders (po_number, requested_by, department, opened_at) VALUES
${rows(orders.map((o) => [o.number, o.requestedBy, o.department, o.openedAt]))};

INSERT INTO invoices (id, vendor_id, po_number, amount, issued_at, description) VALUES
${rows(invoiceRows.map((i) => [i.id, i.vendorId, i.po, i.amount, i.issuedAt, i.description]))};

INSERT INTO payments (id, invoice_id, paid_at, approved_by, status) VALUES
${rows(paymentRows.map((p, index) => [index + 1, p.invoiceId, p.paidAt, p.approvedBy, 'PAGO']))};
`;

writeFileSync(OUTPUT, sql);
console.log(
  `mercatto_financeiro.sql: ${employees.length} funcionários, ${vendors.length} fornecedores, ${orders.length} pedidos, ${invoiceRows.length} faturas, ${paymentRows.length} pagamentos`,
);
console.log(
  `Delta ${delta.id}: R$ ${total.toFixed(2)} em ${deltaRows.length} faturas · Tiago ${tiago.id} · Bruna ${bruna.id} (${(brunaShare * 100).toFixed(0)}%) · Olavo ${olavo.id} · prazo médio ${average.toFixed(1)} dias`,
);
