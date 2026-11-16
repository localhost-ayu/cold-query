---
id: e02-dicionario
from:
  name: Leandro Porto
  address: leandro.porto@mercatto.example
  role: Controller, Mercatto Alimentos
subject: 'Dicionário de dados: contas a pagar'
date: '2026-03-23T09:41:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Bom dia. Segue o mapa do banco. Tudo saiu do ERP sem tratamento.

**employees**: funcionários. `bank_account` é a conta onde cai o salário; `hired_at` é a data de admissão.

**vendors**: fornecedores cadastrados. `bank_account` é a conta para onde pagamos; `created_by` é o `id` do funcionário que fez o cadastro e `created_at`, quando.

**purchase_orders**: pedidos de compra. `requested_by` é quem pediu (`id` em employees).

**invoices**: faturas recebidas. `vendor_id` aponta para vendors e `po_number` para o pedido de compra, quando existe.

**payments**: um registro por fatura paga. `invoice_id` aponta para invoices e `approved_by` é quem aprovou o pagamento.

As datas estão no formato `AAAA-MM-DD`. A TI me disse que `julianday()` transforma uma data em número de dias, se precisar fazer conta. As regras de compras estão na intranet: intranet.mercatto.example/politica-compras.

Agradeço a discrição. Por enquanto, só a diretoria sabe.

Leandro
