---
id: e02-dicionario
from:
  name: Dalva Nogueira
  address: dalva.nogueira@pracanova.example
  role: Gerente regional, Rede Praça Nova
subject: 'Como ler o banco dos caixas'
date: '2026-04-08T09:25:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Oi. O pessoal da TI tirou isto direto dos PDVs.

**stores**: as quatro lojas.

**cashiers**: a equipe. `role` diz se é `OPERADOR` ou `SUPERVISOR`; `shift` é o turno (`MANHA` das 7h às 13h, `TARDE` das 13h às 21h).

**transactions**: cada venda, com a loja, o número do caixa (`register_no`), quem atendeu, a hora, o total e a forma de pagamento (`DINHEIRO`, `DEBITO`, `CREDITO` ou `PIX`).

**refunds**: cada estorno. `transaction_id` é a venda estornada, `cashier_id` quem fez o estorno e `approved_by` o supervisor que liberou, quando precisou. Fica vazio quando não precisou.

A política de estornos está na intranet: intranet.pracanova.example/politica-estornos.

Só peço uma coisa: antes de me dizer um nome, tenha certeza. Eu já errei uma vez.

Dalva
