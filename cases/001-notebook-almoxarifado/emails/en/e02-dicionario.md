---
id: e02-dicionario
from:
  name: Marta Vidal
  address: marta.vidal@vantara.example
  role: HR Manager, Vantara Logística
subject: 'Data dictionary: access and assets'
date: '2026-03-16T10:42:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Hi! Helena asked me to explain the tables. This is the broad picture; IT can go into detail if needed. Our systems are in Portuguese, so the values are too.

**employees**: who works here. `badge_id` is the badge number; `shift` is the shift (`COMERCIAL` for office hours, `NOTURNO` for nights, `LIMPEZA` for cleaning).

**assets**: the asset register. `status` can be `EM_USO` (in use), `DISPONIVEL` (available), `MANUTENCAO` (under repair) or `BAIXADO` (written off); `location` says where the item should be (`ESTACAO` for a desk, `ALMOX_TI` for the IT storeroom, `BANCADA_TI` for the IT workbench, `DESCARTE` for disposal). `assigned_to` is the `id` of the employee in charge of it. `last_audit_at` and `last_audit_by` record the latest check.

**badge_events**: every badge swipe. `gate` is the reader (`PORTARIA` is the front desk, then `ANDAR_2`, `ANDAR_3`, `ANDAR_4` for the floors, `ALMOX_TI` and `REFEITORIO`, the cafeteria) and `direction` is `IN` or `OUT`. The front desk and the storeroom record both entry and exit; floors and the cafeteria, entry only.

**timesheet**: clock-ins. One row per person per day, with `clock_in` and `clock_out` rounded to the minute.

Times are formatted `YYYY-MM-DD HH:MM:SS`, so they compare fine as text. The access policy is on the intranet, at intranet.vantara.example/politica-acesso.

Thanks for the help. Nobody here has slept properly since Monday.

Marta
