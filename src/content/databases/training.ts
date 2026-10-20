import type { DatabaseSource } from '@/core/sql/types';

/**
 * Base de treino da Nova Perícia Digital: o banco que o Terminal abre antes de
 * qualquer contrato. Pequena de propósito, só para experimentar sem estragar nada.
 */
export const trainingDatabase: DatabaseSource = {
  id: 'training',
  sql: `
CREATE TABLE analysts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  joined_on TEXT NOT NULL,
  active INTEGER NOT NULL
);

CREATE TABLE contracts (
  id INTEGER PRIMARY KEY,
  client TEXT NOT NULL,
  sector TEXT NOT NULL,
  analyst_id INTEGER REFERENCES analysts(id),
  opened_on TEXT NOT NULL,
  closed_on TEXT,
  fee_brl INTEGER NOT NULL,
  status TEXT NOT NULL
);

INSERT INTO analysts VALUES
  (1, 'Helena Duarte', 'Coordenação', '2019-02-11', 1),
  (2, 'Otávio Brandão', 'Forense', '2020-07-01', 1),
  (3, 'Lúcia Kawamura', 'Forense', '2021-03-15', 1),
  (4, 'Renan Siqueira', 'Dados', '2021-09-20', 0),
  (5, 'Bianca Moraes', 'Dados', '2022-05-02', 1),
  (6, 'Ícaro Teles', 'Campo', '2023-01-09', 1),
  (7, 'Paula Ventura', 'Campo', '2024-08-19', 1);

INSERT INTO contracts VALUES
  (101, 'Ferrovia Mantiqueira', 'Logística', 2, '2025-01-13', '2025-02-03', 18000, 'ENCERRADO'),
  (102, 'Laticínios Serra Azul', 'Alimentos', 3, '2025-02-20', '2025-03-11', 9500, 'ENCERRADO'),
  (103, 'Clínica Horizonte', 'Saúde', 5, '2025-04-02', NULL, 22000, 'SUSPENSO'),
  (104, 'Têxtil Arandu', 'Indústria', 2, '2025-05-06', '2025-05-30', 12500, 'ENCERRADO'),
  (105, 'Cooperativa Vale Verde', 'Agro', 6, '2025-06-17', '2025-07-21', 7800, 'ENCERRADO'),
  (106, 'Rede Farol de Hotéis', 'Turismo', 3, '2025-08-04', '2025-09-12', 15400, 'ENCERRADO'),
  (107, 'Editora Quatro Ventos', 'Mídia', 4, '2025-09-01', '2025-09-19', 6200, 'ENCERRADO'),
  (108, 'Portos do Atlântico', 'Logística', 5, '2025-10-14', '2025-12-02', 31000, 'ENCERRADO'),
  (109, 'Construtora Pedra Lisa', 'Construção', 7, '2025-11-24', NULL, 14000, 'EM_ANDAMENTO'),
  (110, 'Escola Nova Aurora', 'Educação', 6, '2026-01-12', '2026-02-06', 5400, 'ENCERRADO'),
  (111, 'Mineradora Sete Lagos', 'Mineração', 2, '2026-02-02', NULL, 27500, 'EM_ANDAMENTO'),
  (112, 'Vantara Logística', 'Logística', NULL, '2026-03-16', NULL, 8000, 'ABERTO');
`,
};
