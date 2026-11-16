---
id: e02-dicionario
from:
  name: Rita Lacerda
  address: rita.lacerda@borgeslacerda.example
  role: Managing partner, Borges & Lacerda Advogados
subject: "What's in the database"
date: '2026-04-27T09:15:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Dear all,

Below is a description of the tables, as IT gave it to me. The values are in Portuguese.

**users**: accounts in the document system. `hr_id` links the account to the HR register (service accounts have none); `active` is 1 for an active account and 0 for a disabled one.

**hr_records**: the HR register. `status` is `ATIVO` (employed) or `DESLIGADO` (left the firm); `terminated_at` is the date they left.

**matters**: the firm's matters (cases), with the partner in charge. **matter_team** says who works on each.

**documents**: the documents, with their matter, title and classification (`PUBLICO`, `INTERNO` or `CONFIDENCIAL`).

**downloads**: every download, with the account, the document, the time, the source IP and the channel (`OFFICE_NET` inside the office, `VPN` from outside, `SHARED_LINK` through a shared link).

The Altamira Merger is matter 3. Internal policies are at intranet.borgeslacerda.example.

I trust in your discretion.

Rita Lacerda
