---
id: e02-dicionario
from:
  name: Dalva Nogueira
  address: dalva.nogueira@pracanova.example
  role: Regional manager, Rede Praça Nova
subject: 'How to read the register database'
date: '2026-04-08T09:25:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Hi. IT pulled this straight from the registers. The values are in Portuguese, like everything else here.

**stores**: the four stores.

**cashiers**: the staff. `role` says whether someone is an `OPERADOR` (cashier) or a `SUPERVISOR`; `shift` is `MANHA` (7am to 1pm) or `TARDE` (1pm to 9pm).

**transactions**: every sale, with the store, the register number (`register_no`), who served, the time, the total and the payment method (`DINHEIRO` for cash, `DEBITO`, `CREDITO` or `PIX`).

**refunds**: every refund. `transaction_id` is the refunded sale, `cashier_id` who made the refund and `approved_by` the supervisor who authorized it, when that was needed. It is empty when it wasn't.

The refund policy is on the intranet: intranet.pracanova.example/politica-estornos.

I only ask one thing: before you give me a name, be sure. I've already been wrong once.

Dalva
