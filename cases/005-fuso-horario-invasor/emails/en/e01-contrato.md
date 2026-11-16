---
id: e01-contrato
from:
  name: Helena Duarte
  address: helena@novapericia.example
  role: Case coordination
subject: "Contract 134: Vantara again, and this time it's serious"
date: '2026-05-14T08:30:00-03:00'
kind: brief
unlockedBy: answerCorrect:004
attachments:
  - db/vantara_incidente.sql
---

Good morning.

Marta Vidal called at seven in the morning, which already tells you the size of it. Overnight from Tuesday to Wednesday, **1.8 GB of payroll data** left Vantara's HR server for an outside address. The firewall saw it. IT doesn't know who did it. HR swears nobody had a reason, which is never true.

This time there are five sources, each in its own system: Active Directory, VPN, DHCP, the firewall and the workstation antivirus (EDR), plus the badges, timesheet and assets you already know from the laptop case. I put everything into a single database.

A warning from IT itself: **the clocks don't agree**. Each system records the time its own way. Before linking one event to another, find out how big the difference is.

The report has three questions: **who**, **using which credential** and **what time the data left, on the real clock**. Help has the guide to window functions.

Three attempts. Marta said "you again, and with more tables this time", and I think it was a compliment.

Helena
