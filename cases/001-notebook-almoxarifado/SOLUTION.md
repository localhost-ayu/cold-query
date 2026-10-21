# Caso 001: solução

> Spoilers. Para quem testa ou escreve casos; o jogo não mostra este arquivo.

**Resposta:** Rafael Tavares (Financeiro), sexta, 13/03, entre 22:30 e 23:00 (`who = w1`, `when = t2`).

## Caminho esperado

1. **Último registro do notebook.** A auditoria de sexta é o ponto de partida.

   ```sql
   SELECT asset_tag, status, location, last_audit_at, last_audit_by
   FROM assets
   WHERE asset_tag = 'NB-0417';
   ```

   NB-0417 auditado às 17:30:00 por Caio Mendes (`f_audit`).

2. **Quem entrou no almoxarifado depois disso.**

   ```sql
   SELECT * FROM badge_events
   WHERE gate = 'ALMOX_TI'
     AND event_time BETWEEN '2026-03-13 17:30:00' AND '2026-03-16 08:10:00'
   ORDER BY event_time;
   ```

   Aparecem quatro crachás: 9002 às 19:05:22 (`f_denise_entry`), 4471 às 22:47:03 (`f_rafael_entry`), 9100 às 03:10:31 de sábado e nas madrugadas seguintes (`f_guard_entry`), e 2210 às 08:05:14 de segunda (`f_caio_monday`).

3. **Rotina ou exceção.** 9002 (Denise, limpeza) entra todo dia útil por volta das 19:05; 9100 (Wagner, vigilante) toda madrugada por volta das 03:10; 2210 é o próprio Caio, que deu falta do notebook.

   ```sql
   SELECT badge_id, COUNT(*) FROM badge_events
   WHERE gate = 'ALMOX_TI' AND direction = 'IN'
   GROUP BY badge_id;
   ```

   (Agregação é do caso 3; no caso 1 basta filtrar por `badge_id` e ver as linhas, o que libera os bônus `b_denise_routine` e `b_guard_routine`.)

4. **Quem é o 4471.**

   ```sql
   SELECT * FROM employees WHERE badge_id = 4471;
   ```

   Rafael Tavares, Financeiro, id 9 (`f_rafael_id`). A política de acesso libera o Patrimônio do Financeiro para conferência mensal, então o crachá abrir a porta não espanta; o horário, sim.

5. **Contexto (bônus).**
   - Ponto de sexta: saiu às 18:04 (`b_clockout`).
   - Na volta: portaria 22:41:12, 4º andar 22:44:30 (`b_rafael_floor`), almoxarifado 22:47:03 a 22:52:41, portaria 22:58:09. São as únicas passagens dele pelo almoxarifado nas duas semanas.
   - Motivo: `SELECT * FROM assets WHERE assigned_to = 9;` mostra o NB-0409 dele em `MANUTENCAO` na `BANCADA_TI` (`b_motive`).
   - Entrada do Caio para a auditoria às 17:12:40 (`b_caio_audit_entry`).
   - Parágrafo `p-almox` da política de acesso (`b_policy`, quando o Navegador existir).

## Despistes

- **Juliana Freitas** fica no 4º andar até 21:34 na sexta, mas não passa no almoxarifado.
- **Diego Lima** vai ao prédio no sábado entre 10:05 e 10:50 e também não passa no almoxarifado.
- **Denise** entra às 19:05:22, dentro da rotina, e sai às 19:19:47.
- **Wagner** faz a ronda de sábado às 03:10:31, como em todas as madrugadas.

## Relatório

| Slot | Opção | Libera com |
| --- | --- | --- |
| Quem | w2 Denise | `f_denise_entry` |
| Quem | w3 Wagner | `f_guard_entry` |
| Quem | w4 Caio | `f_audit` ou `f_caio_monday` |
| Quem | **w1 Rafael** | `f_rafael_entry` e `f_rafael_id` |
| Quem | w5 Inconclusivo | 3 fatos quaisquer |
| Quando | t1 sexta 19:00–19:30 | `f_denise_entry` |
| Quando | **t2 sexta 22:30–23:00** | `f_rafael_entry` |
| Quando | t3 sábado 03:00–03:30 | `f_guard_entry` |
| Quando | t4 segunda 08:00–08:15 | `f_caio_monday` |

Uma escolha certa e outra errada dá `partial`. São três tentativas.

## Dados

`db/vantara_acessos.sql` é gerado por `tools/gen-case-001.ts` (semente fixa). O gerador confere o roteiro antes de gravar; `bun run validate-cases` confere fatos, opções e respostas.
