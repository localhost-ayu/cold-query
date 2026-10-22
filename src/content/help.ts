import type { LocalizedText } from '@/core/case-schema';

/**
 * Guia de SQL da Ajuda. Cada tópico pertence a um conceito do currículo
 * (o mesmo nome usado em `sqlConcepts` dos casos) e só abre quando um contrato
 * com aquele conceito chega. Os exemplos rodam na base de treino.
 */
export interface HelpTopic {
  concept: string;
  title: LocalizedText;
  summary: LocalizedText;
  body: LocalizedText[];
  example?: string;
}

export const helpTopics: HelpTopic[] = [
  {
    concept: 'SELECT',
    title: {
      'pt-BR': 'SELECT: escolher colunas',
      en: 'SELECT: picking columns',
    },
    summary: {
      'pt-BR': 'Toda consulta começa dizendo o que você quer ver e de onde.',
      en: 'Every query starts by saying what you want to see and where from.',
    },
    body: [
      {
        'pt-BR':
          'SELECT lista as colunas e FROM diz a tabela. O asterisco (*) traz todas as colunas, na ordem em que a tabela foi criada.',
        en: 'SELECT lists the columns and FROM names the table. The asterisk (*) returns every column, in the order the table was created.',
      },
      {
        'pt-BR':
          'Listar só as colunas que importam deixa o resultado mais fácil de ler e de fixar no dossiê.',
        en: 'Listing only the columns that matter makes the result easier to read and to pin.',
      },
    ],
    example: 'SELECT name, team\nFROM analysts;',
  },
  {
    concept: 'WHERE',
    title: { 'pt-BR': 'WHERE: filtrar linhas', en: 'WHERE: filtering rows' },
    summary: {
      'pt-BR': 'Fica só com as linhas que passam na condição.',
      en: 'Keeps only the rows that pass the condition.',
    },
    body: [
      {
        'pt-BR':
          "Compare com =, <>, <, >, <= e >=. Texto vai entre aspas simples ('Logística'); números, sem aspas.",
        en: "Compare with =, <>, <, >, <= and >=. Text goes in single quotes ('Logística'); numbers do not.",
      },
      {
        'pt-BR':
          'Junte condições com AND (as duas valem) e OR (pelo menos uma vale). Use parênteses quando misturar os dois.',
        en: 'Combine conditions with AND (both hold) and OR (at least one holds). Use parentheses when you mix them.',
      },
      {
        'pt-BR':
          'Valor vazio é NULL, e NULL não é igual a nada, nem a ele mesmo: use IS NULL ou IS NOT NULL.',
        en: 'An empty value is NULL, and NULL equals nothing, not even itself: use IS NULL or IS NOT NULL.',
      },
    ],
    example:
      "SELECT id, client, status\nFROM contracts\nWHERE sector = 'Logística' AND closed_on IS NULL;",
  },
  {
    concept: 'ORDER BY',
    title: { 'pt-BR': 'ORDER BY: ordenar', en: 'ORDER BY: sorting' },
    summary: {
      'pt-BR': 'Sem ORDER BY, a ordem das linhas não é garantida.',
      en: 'Without ORDER BY, row order is not guaranteed.',
    },
    body: [
      {
        'pt-BR':
          'ASC ordena do menor para o maior (o padrão); DESC, do maior para o menor. Dá para ordenar por mais de uma coluna: a segunda desempata a primeira.',
        en: 'ASC sorts from lowest to highest (the default); DESC from highest to lowest. You can sort by several columns: the second breaks ties in the first.',
      },
      {
        'pt-BR':
          'Datas e horas no formato AAAA-MM-DD HH:MM:SS ordenam certo mesmo sendo texto.',
        en: 'Dates and times in YYYY-MM-DD HH:MM:SS format sort correctly even as text.',
      },
    ],
    example:
      'SELECT client, opened_on\nFROM contracts\nORDER BY opened_on DESC;',
  },
  {
    concept: 'LIMIT',
    title: {
      'pt-BR': 'LIMIT: só as primeiras linhas',
      en: 'LIMIT: just the first rows',
    },
    summary: {
      'pt-BR': 'Corta o resultado depois de N linhas.',
      en: 'Cuts the result after N rows.',
    },
    body: [
      {
        'pt-BR':
          'LIMIT vem por último. Junto com ORDER BY, responde perguntas como "os 3 maiores" ou "o mais recente".',
        en: 'LIMIT comes last. Together with ORDER BY it answers questions like "the 3 largest" or "the most recent".',
      },
      {
        'pt-BR':
          'Também serve para espiar uma tabela grande sem despejar milhares de linhas: SELECT * FROM tabela LIMIT 10.',
        en: 'It is also handy to peek at a large table without dumping thousands of rows: SELECT * FROM table LIMIT 10.',
      },
    ],
    example:
      'SELECT client, fee_brl\nFROM contracts\nORDER BY fee_brl DESC\nLIMIT 3;',
  },
  {
    concept: 'LIKE',
    title: { 'pt-BR': 'LIKE: procurar texto', en: 'LIKE: searching text' },
    summary: {
      'pt-BR': 'Compara texto com um padrão.',
      en: 'Matches text against a pattern.',
    },
    body: [
      {
        'pt-BR':
          "% vale qualquer sequência de caracteres (até nenhuma); _ vale exatamente um. 'C%' começa com C; '%Lagos' termina com Lagos; '%Vale%' contém Vale.",
        en: "% stands for any run of characters (even none); _ stands for exactly one. 'C%' starts with C; '%Lagos' ends with Lagos; '%Vale%' contains Vale.",
      },
      {
        'pt-BR':
          'No SQLite, LIKE ignora maiúsculas e minúsculas nas letras sem acento.',
        en: 'In SQLite, LIKE is case-insensitive for unaccented letters.',
      },
    ],
    example: "SELECT client\nFROM contracts\nWHERE client LIKE '%Vale%';",
  },
  {
    concept: 'BETWEEN',
    title: { 'pt-BR': 'BETWEEN: intervalos', en: 'BETWEEN: ranges' },
    summary: {
      'pt-BR': 'Um valor entre dois limites, os dois incluídos.',
      en: 'A value between two bounds, both included.',
    },
    body: [
      {
        'pt-BR':
          'x BETWEEN a AND b é o mesmo que x >= a AND x <= b. Funciona com números, datas e horas.',
        en: 'x BETWEEN a AND b is the same as x >= a AND x <= b. It works with numbers, dates and times.',
      },
      {
        'pt-BR':
          "Cuidado com horas: BETWEEN '2026-03-13' AND '2026-03-14' para à meia-noite do dia 14. Para pegar o dia 14 inteiro, use '2026-03-14 23:59:59'.",
        en: "Watch out for times: BETWEEN '2026-03-13' AND '2026-03-14' stops at midnight on the 14th. To include the whole 14th, use '2026-03-14 23:59:59'.",
      },
    ],
    example:
      "SELECT client, opened_on\nFROM contracts\nWHERE opened_on BETWEEN '2025-01-01' AND '2025-06-30';",
  },
];

/** Conceitos que ainda virão, mostrados trancados (sem conteúdo) para dar o mapa do currículo. */
export const upcomingConcepts: Array<{
  concept: string;
  title: LocalizedText;
}> = [
  {
    concept: 'JOIN',
    title: { 'pt-BR': 'JOIN: juntar tabelas', en: 'JOIN: combining tables' },
  },
  {
    concept: 'DISTINCT',
    title: {
      'pt-BR': 'DISTINCT: sem repetição',
      en: 'DISTINCT: no duplicates',
    },
  },
  {
    concept: 'GROUP BY',
    title: { 'pt-BR': 'GROUP BY e agregações', en: 'GROUP BY and aggregates' },
  },
  {
    concept: 'HAVING',
    title: {
      'pt-BR': 'HAVING: filtrar grupos',
      en: 'HAVING: filtering groups',
    },
  },
  {
    concept: 'CTE',
    title: { 'pt-BR': 'Subconsultas e CTEs', en: 'Subqueries and CTEs' },
  },
  {
    concept: 'LEFT JOIN',
    title: {
      'pt-BR': 'LEFT JOIN: o que falta',
      en: 'LEFT JOIN: what is missing',
    },
  },
  {
    concept: 'WINDOW',
    title: { 'pt-BR': 'Funções de janela', en: 'Window functions' },
  },
];
