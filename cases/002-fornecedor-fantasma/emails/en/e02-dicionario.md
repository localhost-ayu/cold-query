---
id: e02-dicionario
from:
  name: Leandro Porto
  address: leandro.porto@mercatto.example
  role: Controller, Mercatto Alimentos
subject: 'Data dictionary: accounts payable'
date: '2026-03-23T09:41:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Good morning. Here is the map of the database. It all came straight out of the ERP.

**employees**: staff. `bank_account` is where the salary is paid; `hired_at` is the hiring date.

**vendors**: registered vendors. `bank_account` is the account we pay into; `created_by` is the `id` of the employee who registered it and `created_at`, when.

**purchase_orders**: purchase orders. `requested_by` is who asked for it (`id` in employees).

**invoices**: invoices received. `vendor_id` points to vendors and `po_number` to the purchase order, when there is one.

**payments**: one row per paid invoice. `invoice_id` points to invoices and `approved_by` is who approved the payment.

Dates are formatted `YYYY-MM-DD`. IT tells me `julianday()` turns a date into a number of days, if you need to do arithmetic. The purchasing rules are on the intranet: intranet.mercatto.example/politica-compras.

Thank you for your discretion. For now, only the board knows.

Leandro
