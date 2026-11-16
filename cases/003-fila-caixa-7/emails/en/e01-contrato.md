---
id: e01-contrato
from:
  name: Helena Duarte
  address: helena@novapericia.example
  role: Case coordination
subject: "Contract 121: Rede Praça Nova's till won't balance"
date: '2026-04-08T08:50:00-03:00'
kind: brief
unlockedBy: answerCorrect:002
attachments:
  - db/pracanova_pdv.sql
---

Good morning.

Dalva Nogueira, regional manager at **Rede Praça Nova**, four supermarkets, called me in a mood. The downtown store closed March more than R$ 11,000 short, and the system says the money went out as refunds.

She already tried to sort it out herself: she called the cashier with the most refunds in the chain into her office. The cashier pointed out, politely, that she works the busiest register in town. Dalva apologized and hired us.

The database has six weeks from all four stores: stores, cashiers, sales and refunds. Around twenty thousand sales. Don't read them row by row: sum, count and compare. The `GROUP BY` and `HAVING` guide is already in Help.

This time the report has three questions: **who**, **what pattern** the irregular refunds follow and **how much** the downtown store lost to them. Three attempts, as usual.

Helena
