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
  {
    concept: 'JOIN',
    title: { 'pt-BR': 'JOIN: juntar tabelas', en: 'JOIN: combining tables' },
    summary: {
      'pt-BR': 'Junta linhas de duas tabelas que têm um valor em comum.',
      en: 'Combines rows from two tables that share a value.',
    },
    body: [
      {
        'pt-BR':
          'JOIN ... ON diz qual coluna de uma tabela corresponde a qual coluna da outra. Cada par de linhas que casa vira uma linha no resultado; linhas sem par ficam de fora.',
        en: 'JOIN ... ON says which column of one table matches which column of the other. Every matching pair of rows becomes one result row; rows with no match are left out.',
      },
      {
        'pt-BR':
          'Dê um apelido curto a cada tabela (contracts c, analysts a) e use-o antes das colunas: c.client, a.name. Fica claro de onde vem cada coluna quando as duas têm uma "id" ou um "name".',
        en: 'Give each table a short alias (contracts c, analysts a) and put it before the columns: c.client, a.name. It makes clear where each column comes from when both have an "id" or a "name".',
      },
      {
        'pt-BR':
          'Dá para encadear: um JOIN depois do outro liga três ou mais tabelas. A coluna do ON não precisa ser a chave; qualquer valor em comum serve.',
        en: 'You can chain them: one JOIN after another links three or more tables. The ON column does not have to be the key; any shared value works.',
      },
    ],
    example:
      'SELECT c.client, c.opened_on, a.name\nFROM contracts c\nJOIN analysts a ON a.id = c.analyst_id;',
  },
  {
    concept: 'DISTINCT',
    title: {
      'pt-BR': 'DISTINCT: sem repetição',
      en: 'DISTINCT: no duplicates',
    },
    summary: {
      'pt-BR': 'Mostra cada valor (ou combinação de valores) uma vez só.',
      en: 'Shows each value (or combination of values) only once.',
    },
    body: [
      {
        'pt-BR':
          'SELECT DISTINCT tira as linhas repetidas do resultado. Com várias colunas, conta como repetida a linha em que todas são iguais.',
        en: 'SELECT DISTINCT removes repeated rows from the result. With several columns, a row only counts as repeated when all of them are the same.',
      },
      {
        'pt-BR':
          'Bom para perguntas como "quem já aprovou isso?" ou "em quais setores trabalhamos?", em que a quantidade de vezes não importa.',
        en: 'Good for questions like "who has ever approved this?" or "which sectors do we work in?", where how many times does not matter.',
      },
    ],
    example: 'SELECT DISTINCT sector\nFROM contracts\nORDER BY sector;',
  },
  {
    concept: 'DATES',
    title: {
      'pt-BR': 'Datas: contas e partes',
      en: 'Dates: arithmetic and parts',
    },
    summary: {
      'pt-BR':
        'Quantos dias entre duas datas, e que mês ou dia da semana cada uma é.',
      en: 'How many days lie between two dates, and which month or weekday each one is.',
    },
    body: [
      {
        'pt-BR':
          'No SQLite, datas são texto no formato AAAA-MM-DD. julianday() transforma a data num número de dias; subtrair duas dá a distância entre elas.',
        en: 'In SQLite, dates are text formatted YYYY-MM-DD. julianday() turns a date into a number of days; subtracting two gives the distance between them.',
      },
      {
        'pt-BR':
          "strftime() tira uma parte da data: '%Y' o ano, '%m' o mês, '%Y-%m' ano e mês juntos, '%w' o dia da semana (0 é domingo).",
        en: "strftime() extracts part of a date: '%Y' the year, '%m' the month, '%Y-%m' year and month together, '%w' the weekday (0 is Sunday).",
      },
    ],
    example:
      "SELECT client, opened_on, closed_on,\n  julianday(closed_on) - julianday(opened_on) AS dias,\n  strftime('%Y-%m', opened_on) AS mes\nFROM contracts\nWHERE closed_on IS NOT NULL;",
  },
  {
    concept: 'GROUP BY',
    title: { 'pt-BR': 'GROUP BY e agregações', en: 'GROUP BY and aggregates' },
    summary: {
      'pt-BR': 'Junta as linhas em grupos e resume cada grupo numa linha só.',
      en: 'Gathers rows into groups and sums up each group in a single row.',
    },
    body: [
      {
        'pt-BR':
          'GROUP BY coluna junta todas as linhas com o mesmo valor naquela coluna. No SELECT, o que não for a coluna do grupo precisa ser uma agregação: COUNT(*) conta, SUM() soma, AVG() tira a média, MIN() e MAX() acham o menor e o maior.',
        en: 'GROUP BY column gathers all rows with the same value in that column. In the SELECT, anything that is not the group column must be an aggregate: COUNT(*) counts, SUM() adds, AVG() averages, MIN() and MAX() find the smallest and largest.',
      },
      {
        'pt-BR':
          'Com JOIN, uma linha pode se repetir no resultado antes do agrupamento. COUNT(DISTINCT coluna) conta cada valor uma vez só.',
        en: 'With a JOIN, a row may repeat in the result before grouping. COUNT(DISTINCT column) counts each value only once.',
      },
      {
        'pt-BR':
          'Para comparar grupos de tamanhos diferentes, divida: 1.0 * COUNT(...) / COUNT(...) dá uma razão (o 1.0 evita a divisão inteira). ROUND(valor, 3) deixa o número legível.',
        en: 'To compare groups of different sizes, divide: 1.0 * COUNT(...) / COUNT(...) gives a ratio (the 1.0 avoids integer division). ROUND(value, 3) keeps the number readable.',
      },
    ],
    example:
      'SELECT sector, COUNT(*) AS contratos, SUM(fee_brl) AS total\nFROM contracts\nGROUP BY sector\nORDER BY total DESC;',
  },
  {
    concept: 'HAVING',
    title: {
      'pt-BR': 'HAVING: filtrar grupos',
      en: 'HAVING: filtering groups',
    },
    summary: {
      'pt-BR': 'O WHERE dos grupos: filtra depois de agrupar.',
      en: 'The WHERE of groups: it filters after grouping.',
    },
    body: [
      {
        'pt-BR':
          'WHERE escolhe linhas antes do GROUP BY; HAVING escolhe grupos depois, olhando para as agregações. HAVING COUNT(*) >= 2 fica só com os grupos que têm duas linhas ou mais.',
        en: 'WHERE picks rows before GROUP BY; HAVING picks groups afterwards, looking at the aggregates. HAVING COUNT(*) >= 2 keeps only the groups with two rows or more.',
      },
      {
        'pt-BR':
          'Bom para tirar da conta os grupos pequenos demais para dizer alguma coisa, como alguém com três vendas no período inteiro.',
        en: 'Good for leaving out groups too small to say anything, like someone with three sales in the whole period.',
      },
    ],
    example:
      'SELECT analyst_id, COUNT(*) AS contratos\nFROM contracts\nWHERE analyst_id IS NOT NULL\nGROUP BY analyst_id\nHAVING COUNT(*) >= 2;',
  },
  {
    concept: 'CTE',
    title: { 'pt-BR': 'Subconsultas e CTEs', en: 'Subqueries and CTEs' },
    summary: {
      'pt-BR':
        'Uma consulta dentro da outra, para perguntas que dependem de outra resposta.',
      en: 'A query inside another, for questions that depend on another answer.',
    },
    body: [
      {
        'pt-BR':
          'Uma subconsulta entre parênteses vira uma lista ou uma tabela para a consulta de fora. WHERE coluna IN (SELECT ...) filtra pelos valores que a de dentro devolve.',
        en: 'A subquery in parentheses becomes a list or a table for the outer query. WHERE column IN (SELECT ...) filters by the values the inner one returns.',
      },
      {
        'pt-BR':
          'WITH nome AS (SELECT ...) dá um nome a uma subconsulta antes da consulta principal. Fica mais fácil de ler, e dá para usar o nome mais de uma vez.',
        en: 'WITH name AS (SELECT ...) names a subquery before the main query. It reads more easily, and the name can be used more than once.',
      },
      {
        'pt-BR':
          'Consultas longas assim merecem um nome: salve-as na aba Salvas do Terminal para reabrir e ajustar depois.',
        en: "Long queries like these deserve a name: save them in the Terminal's Saved tab to reopen and adjust later.",
      },
    ],
    example:
      'WITH por_analista AS (\n  SELECT analyst_id, COUNT(*) AS n\n  FROM contracts\n  GROUP BY analyst_id\n)\nSELECT a.name, p.n\nFROM por_analista p\nJOIN analysts a ON a.id = p.analyst_id\nWHERE p.n > (SELECT AVG(n) FROM por_analista);',
  },
  {
    concept: 'LEFT JOIN',
    title: {
      'pt-BR': 'LEFT JOIN: o que falta',
      en: 'LEFT JOIN: what is missing',
    },
    summary: {
      'pt-BR':
        'Mantém todas as linhas da esquerda, com ou sem par do outro lado.',
      en: 'Keeps every row on the left, with or without a match on the other side.',
    },
    body: [
      {
        'pt-BR':
          'JOIN descarta as linhas sem par; LEFT JOIN as mantém e preenche as colunas do outro lado com NULL.',
        en: "JOIN drops rows with no match; LEFT JOIN keeps them and fills the other side's columns with NULL.",
      },
      {
        'pt-BR':
          'Isso responde "quem não está na lista": faça o LEFT JOIN com a lista e filtre WHERE coluna_da_lista IS NULL. É o chamado anti-join. NOT IN (SELECT ...) e NOT EXISTS fazem o mesmo de outro jeito.',
        en: 'That answers "who is not on the list": LEFT JOIN the list and filter WHERE list_column IS NULL. It is called an anti-join. NOT IN (SELECT ...) and NOT EXISTS do the same in another way.',
      },
    ],
    example:
      'SELECT a.name\nFROM analysts a\nLEFT JOIN contracts c ON c.analyst_id = a.id\nWHERE c.id IS NULL;',
  },
  {
    concept: 'WINDOW',
    title: { 'pt-BR': 'Funções de janela', en: 'Window functions' },
    summary: {
      'pt-BR':
        'Contas que olham para as linhas vizinhas sem juntar tudo numa linha só.',
      en: 'Calculations that look at neighbouring rows without collapsing them into one.',
    },
    body: [
      {
        'pt-BR':
          'Uma função de janela termina em OVER (...). PARTITION BY separa os grupos e ORDER BY diz a ordem dentro de cada um. Ao contrário do GROUP BY, todas as linhas continuam no resultado.',
        en: 'A window function ends in OVER (...). PARTITION BY splits the groups and ORDER BY sets the order inside each one. Unlike GROUP BY, every row stays in the result.',
      },
      {
        'pt-BR':
          'ROW_NUMBER() numera as linhas (a 1 é a primeira na ordem); LAG(coluna) traz o valor da linha anterior; SUM(coluna) OVER (...) soma acumulando.',
        en: "ROW_NUMBER() numbers the rows (1 is first in the order); LAG(column) brings the previous row's value; SUM(column) OVER (...) adds up cumulatively.",
      },
      {
        'pt-BR':
          "Para comparar uma tabela com ela mesma, junte-a duas vezes com apelidos diferentes (um self-join). datetime(hora, '-432 seconds') ou '-3 hours' corrige um horário; strftime('%s', hora) dá os segundos, bons para subtrair.",
        en: "To compare a table with itself, join it twice under different aliases (a self-join). datetime(time, '-432 seconds') or '-3 hours' corrects a time; strftime('%s', time) gives the seconds, handy for subtracting.",
      },
    ],
    example:
      'SELECT client, opened_on, fee_brl,\n  ROW_NUMBER() OVER (PARTITION BY sector ORDER BY opened_on) AS ordem,\n  LAG(client) OVER (ORDER BY opened_on) AS anterior,\n  SUM(fee_brl) OVER (ORDER BY opened_on) AS acumulado\nFROM contracts\nORDER BY opened_on;',
  },
];
