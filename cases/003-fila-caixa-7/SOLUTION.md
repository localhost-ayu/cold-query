# Caso 003: solução

> Spoiler. Para autores e testadores; o jogo não mostra este arquivo.

**Resposta:** Wellington Castro, do caixa 7 da loja Centro à tarde; estornos logo abaixo de R$ 50 sem supervisor; prejuízo entre R$ 9 mil e R$ 14 mil (R$ 11.840,00).

## Caminho esperado

1. **Contar estornos por operador** mostra Marcia Teles na frente (297) e Wellington em segundo (250). Somar valores mostra Paulo Garcia na frente (R$ 35.944,25, devoluções de eletro).

   ```sql
   SELECT c.name, COUNT(*) AS qtd, SUM(r.amount) AS total
   FROM refunds r JOIN cashiers c ON c.id = r.cashier_id
   GROUP BY c.id ORDER BY qtd DESC;
   ```

2. **Razão estornos/vendas.** Sem filtro, o novato Kevin Souza (3 vendas, 1 estorno) lidera. Com `HAVING vendas >= 100`, o Wellington tem 0,194, o dobro da Marcia.

   ```sql
   SELECT c.name,
          COUNT(DISTINCT t.id) AS vendas,
          COUNT(DISTINCT r.id) AS estornos,
          ROUND(1.0 * COUNT(DISTINCT r.id) / COUNT(DISTINCT t.id), 3) AS razao
   FROM cashiers c
   JOIN transactions t ON t.cashier_id = c.id
   LEFT JOIN refunds r ON r.cashier_id = c.id
   GROUP BY c.id
   HAVING vendas >= 100
   ORDER BY razao DESC;
   ```

   Sem `COUNT(DISTINCT)`, o JOIN multiplica as linhas e os números ficam absurdos: é a lição.

3. **O padrão.** Os estornos sem supervisor do Wellington vão de R$ 44,00 a R$ 49,50 (a política exige supervisor acima de R$ 50), todos sobre vendas em dinheiro do caixa 7 e 179 deles entre 14:00 e 14:40, o almoço da supervisora do Centro.

   ```sql
   SELECT cashier_id, COUNT(*), MIN(amount), MAX(amount), SUM(amount)
   FROM refunds WHERE approved_by IS NULL
   GROUP BY cashier_id HAVING COUNT(*) > 10;
   ```

4. **O valor.** `SUM(amount)` dos estornos sem supervisor do Wellington: R$ 11.840,00.

## Despistes

- **Marcia Teles:** mais estornos da rede, mas no caixa mais movimentado (3.250 vendas) e só itens baratos (R$ 3.515 no total).
- **Paulo Garcia:** maior valor estornado, poucas devoluções de eletro, todas com a supervisora.
- **Kevin Souza:** maior razão sem `HAVING`, com 3 vendas.
- **Caixa 7 e Sueli Barreto:** agrupando por caixa, o 7 aparece com 280 estornos; as vendas estornadas são da Sueli (manhã), mas quem estorna é o Wellington (tarde).
- **Loja Shopping:** muitos estornos em cartão de crédito na semana de promoção (16 a 22/03), legítimos.

## Relatório

| Slot | Opção | Libera com |
| --- | --- | --- |
| who | w1 Marcia | `f_marcia` |
| who | w2 Sueli e o caixa 7 | `f_register` |
| who | w3 Paulo | `f_paulo` |
| who | **w4 Wellington** | `f_ratio` + `f_below_limit` |
| who | w5 Kevin | `f_novato` |
| who | w6 insuficiente | 4 fatos |
| pattern | p1 eletro | `f_paulo` |
| pattern | **p2 abaixo do limite, sem supervisor** | `f_below_limit` |
| pattern | p3 cartão de crédito | `f_shopping_card` |
| pattern | p4 almoço da supervisora | `f_hour` |
| loss | l1 R$ 2–5 mil | `f_marcia` (total dela) |
| loss | l2 R$ 5–9 mil | `f_hour_total` (só os das 14h) |
| loss | **l3 R$ 9–14 mil** | `f_total` |
| loss | l4 acima de R$ 14 mil | `f_total_all` (todos os estornos do Centro) |

Bônus: `f_no_approval`, `f_cash` e o parágrafo `p-limite` da política.

## Dados

`tools/gen-case-003.ts` (semente 20260408) gera 4 lojas, 27 pessoas, 20.769 vendas e 1.249 estornos em seis semanas (23/02 a 05/04/2026). O volume é maior que o do roteiro (~4.800 vendas) porque a Marcia precisa ter mais estornos que o Wellington com uma razão normal. Os estornos são múltiplos de R$ 0,25 para as somas saírem exatas. O gerador confere cada ponto do roteiro antes de gravar.
