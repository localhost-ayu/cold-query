import type { LocalizedText } from '@/core/case-schema';
import type { TutorialChallenge } from '@/core/tutorial';

/**
 * Primeiro dia na Nova Perícia: cinco exercícios curtos na base de treino,
 * conferidos pelo próprio Terminal antes do primeiro contrato. Quem já sabe
 * SQL pode pular.
 */
export const tutorialChallenges: TutorialChallenge[] = [
  {
    id: 'select',
    concept: 'SELECT',
    task: {
      'pt-BR': 'Liste todos os analistas da Nova Perícia (tabela analysts).',
      en: 'List every analyst at Nova Perícia (the analysts table).',
    },
    hint: {
      'pt-BR':
        'SELECT * FROM analysts; traz todas as colunas e todas as linhas.',
      en: 'SELECT * FROM analysts; returns every column and every row.',
    },
    expect: [
      [1, 2, 3, 4, 5, 6, 7],
      [
        'Helena Duarte',
        'Otávio Brandão',
        'Lúcia Kawamura',
        'Renan Siqueira',
        'Bianca Moraes',
        'Ícaro Teles',
        'Paula Ventura',
      ],
    ],
    ordered: false,
  },
  {
    id: 'where',
    concept: 'WHERE',
    task: {
      'pt-BR': 'Mostre só os contratos com status EM_ANDAMENTO.',
      en: 'Show only the contracts whose status is EM_ANDAMENTO.',
    },
    hint: {
      'pt-BR':
        "Filtre com WHERE coluna = 'valor'. Texto vai entre aspas simples: WHERE status = 'EM_ANDAMENTO'.",
      en: "Filter with WHERE column = 'value'. Text goes in single quotes: WHERE status = 'EM_ANDAMENTO'.",
    },
    expect: [
      [109, 111],
      ['Construtora Pedra Lisa', 'Mineradora Sete Lagos'],
    ],
    ordered: false,
  },
  {
    id: 'order-limit',
    concept: 'ORDER BY · LIMIT',
    task: {
      'pt-BR':
        'Quais são os 3 contratos de maior valor (fee_brl)? Do mais caro para o mais barato.',
      en: 'Which 3 contracts have the highest fee (fee_brl)? Most expensive first.',
    },
    hint: {
      'pt-BR':
        'ORDER BY fee_brl DESC ordena do maior para o menor; LIMIT 3 corta nas três primeiras linhas.',
      en: 'ORDER BY fee_brl DESC sorts from highest to lowest; LIMIT 3 keeps the first three rows.',
    },
    expect: [
      [108, 111, 103],
      ['Portos do Atlântico', 'Mineradora Sete Lagos', 'Clínica Horizonte'],
    ],
    ordered: true,
  },
  {
    id: 'like',
    concept: 'LIKE',
    task: {
      'pt-BR': 'Encontre os contratos de clientes cujo nome começa com C.',
      en: 'Find the contracts whose client name starts with C.',
    },
    hint: {
      'pt-BR':
        "WHERE client LIKE 'C%': o % vale qualquer sequência de letras depois do C.",
      en: "WHERE client LIKE 'C%': the % stands for any run of characters after the C.",
    },
    expect: [
      [103, 105, 109],
      ['Clínica Horizonte', 'Cooperativa Vale Verde', 'Construtora Pedra Lisa'],
    ],
    ordered: false,
  },
  {
    id: 'between',
    concept: 'BETWEEN',
    task: {
      'pt-BR': 'Liste os contratos abertos entre 01/06/2025 e 30/09/2025.',
      en: 'List the contracts opened between 2025-06-01 and 2025-09-30.',
    },
    hint: {
      'pt-BR':
        "As datas estão como texto AAAA-MM-DD, então dá para comparar direto: opened_on BETWEEN '2025-06-01' AND '2025-09-30'.",
      en: "Dates are stored as YYYY-MM-DD text, so they compare directly: opened_on BETWEEN '2025-06-01' AND '2025-09-30'.",
    },
    expect: [
      [105, 106, 107],
      [
        'Cooperativa Vale Verde',
        'Rede Farol de Hotéis',
        'Editora Quatro Ventos',
      ],
    ],
    ordered: false,
  },
];

export interface SystemEmail {
  id: 'welcome' | 'done';
  from: { name: string; address: string; role: LocalizedText };
  subject: LocalizedText;
  paragraphs: LocalizedText[];
}

const helena = {
  name: 'Helena Duarte',
  address: 'helena@novapericia.example',
  role: { 'pt-BR': 'Coordenação de casos', en: 'Case coordination' },
};

/** E-mails do treinamento. São do jogo, não de um caso, por isso vivem aqui. */
export const tutorialEmails: Record<SystemEmail['id'], SystemEmail> = {
  welcome: {
    id: 'welcome',
    from: helena,
    subject: {
      'pt-BR': 'Bem-vindo à Nova Perícia: primeiro dia',
      en: 'Welcome to Nova Perícia: day one',
    },
    paragraphs: [
      { 'pt-BR': 'Bom dia, e bem-vindo.', en: 'Good morning, and welcome.' },
      {
        'pt-BR':
          'Antes do primeiro contrato, um aquecimento rápido. A base de treino já está no Terminal SQL: duas tabelas, analysts e contracts, com o nosso próprio histórico. Nada ali é sigiloso, a não ser quanto cobramos.',
        en: 'Before your first contract, a quick warm-up. The training database is already in the SQL Terminal: two tables, analysts and contracts, with our own history. Nothing there is confidential, except how much we charge.',
      },
      {
        'pt-BR':
          'São cinco exercícios curtos, e o Terminal confere cada resposta sozinho. Se você já escreve SELECT de olhos fechados, pode pular: o contrato chega na hora.',
        en: 'There are five short exercises, and the Terminal checks each answer by itself. If you can write a SELECT with your eyes closed, skip it: the contract arrives right away.',
      },
      { 'pt-BR': 'Helena', en: 'Helena' },
    ],
  },
  done: {
    id: 'done',
    from: helena,
    subject: {
      'pt-BR': 'Treinamento concluído',
      en: 'Training complete',
    },
    paragraphs: [
      {
        'pt-BR':
          'Cinco de cinco. O suficiente para não passar vergonha na frente de cliente.',
        en: 'Five out of five. Enough not to embarrass yourself in front of a client.',
      },
      {
        'pt-BR':
          'O primeiro contrato acabou de chegar. Lembre: linhas de tabela, não teoria.',
        en: 'Your first contract just came in. Remember: table rows, not theories.',
      },
      { 'pt-BR': 'Helena', en: 'Helena' },
    ],
  },
};
