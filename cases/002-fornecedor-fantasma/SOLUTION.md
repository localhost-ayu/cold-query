# Caso 002: solução

> Spoiler. Para autores e testadores; o jogo não mostra este arquivo.

**Resposta:** Tiago Seixas (Compras) se beneficiou; o dinheiro começou a sair em **julho de 2025**.

## Caminho esperado

1. **Faturas sem pedido de compra.** Só dois fornecedores têm faturas com `po_number` nulo: a Delta (9 faturas) e a Cantina Dona Odete (uma, de R$ 380, coberta pela política de reembolso).

   ```sql
   SELECT DISTINCT v.legal_name
   FROM invoices i
   JOIN vendors v ON v.id = i.vendor_id
   WHERE i.po_number IS NULL;
   ```

2. **De quem é a conta.** Juntar fornecedores e funcionários pela conta bancária mostra duas coincidências: a Delta com Tiago Seixas e a Marcos Veiga Fotografia com Marcos Veiga.

   ```sql
   SELECT v.legal_name, v.bank_account, e.name, e.department
   FROM vendors v
   JOIN employees e ON e.bank_account = v.bank_account;
   ```

3. **Quem cadastrou.** `SELECT * FROM vendors WHERE legal_name LIKE 'Delta%'` traz `created_by = 7` (Tiago) e `created_at = 2025-06-30`.

4. **Quando o dinheiro começou a sair.** A primeira fatura é de 02/07/2025 (R$ 9.840,00, dois dias depois do cadastro) e foi paga no dia seguinte.

   ```sql
   SELECT v.legal_name, i.issued_at, p.paid_at,
          julianday(p.paid_at) - julianday(i.issued_at) AS dias
   FROM payments p
   JOIN invoices i ON i.id = p.invoice_id
   JOIN vendors v ON v.id = i.vendor_id
   WHERE v.legal_name LIKE 'Delta%'
   ORDER BY i.issued_at;
   ```

   Seis pagamentos saem em 1 dia e três em 2. O prazo médio dos outros fornecedores é de 28 dias.

5. **Quem aprovou.** `SELECT DISTINCT` sobre os aprovadores da Delta devolve só Bruna Calado.

## Despistes

- **Bruna Calado** aprova 70% de todos os pagamentos (é o trabalho dela desde março de 2025). Aprovou todos os da Delta porque eram abaixo da alçada de R$ 30 mil. Negligente, não cúmplice.
- **Marcos Veiga** tem a conta igual à da Marcos Veiga Fotografia, mas o fornecedor foi cadastrado em 10/04/2025, antes da admissão dele (01/09/2025), com pedidos de compra e só duas faturas de eventos.
- **Transportes Rota Sul** e **Rota Sul Log** dividem o endereço de um coworking, com contas e pedidos de compra próprios.
- **Olavo Dantas** (TI) cadastrou três fornecedores de software em 2026, todos com PO e conta própria.
- **Tiago** cadastrou vários fornecedores legítimos. `created_by` sozinho não condena; o que prova é a conta.

## Relatório

| Slot | Opção | Libera com |
| --- | --- | --- |
| who | w1 Bruna Calado | `f_approver` |
| who | w2 Rota Sul | `f_same_address` |
| who | **w3 Tiago Seixas** | `f_acct_match` + `f_created_by` |
| who | w4 Olavo Dantas | `f_olavo_id` ou `f_olavo_name` |
| who | w5 Marcos Veiga | `f_marcos` |
| who | w6 insuficiente | 4 fatos quaisquer |
| when | t1 março de 2025 | `f_bruna_start` (admissão da Bruna) |
| when | t2 junho de 2025 | `f_vendor_created` (cadastro da Delta) |
| when | **t3 julho de 2025** | `f_first_invoice` ou `f_first_payment` |
| when | t4 fevereiro de 2026 | `f_last_invoice` |

Bônus: `f_no_po`, `f_fast_pay`, `b_marcos_before` e o parágrafo `p-po` da política de compras.

## Dados

`tools/gen-case-002.ts` (semente 20260323) gera 40 funcionários, 45 fornecedores, 422 pedidos de compra, 503 faturas e 463 pagamentos, de 01/03/2025 a 20/03/2026. O gerador confere o roteiro antes de gravar: só duas contas coincidentes, só Delta e Cantina sem PO, total da Delta de R$ 214.342,00, seis pagamentos em 1 dia, aprovadora única, participação da Bruna entre 62% e 78% e prazo médio legítimo entre 26 e 31 dias.
