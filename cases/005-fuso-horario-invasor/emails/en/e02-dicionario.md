---
id: e02-dicionario
from:
  name: Marta Vidal
  address: marta.vidal@vantara.example
  role: HR Manager, Vantara Logística
subject: 'The tables, again (there are more now)'
date: '2026-05-14T09:05:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Hi! You again, and with more tables this time. I'll explain what each one is; Priscila, from IT, will send the technical details.

**employees**, **badge_events**, **timesheet**: the same ones from the laptop case, now with each person's network `username`.

**absences**: HR leave records (vacations, sick leave), with start and end dates. `FERIAS` means vacation.

**assets**: the asset register, now with workstations and servers. `assigned_to` is who uses the machine.

**ad_logons**: every sign-in to a machine on the network. `host` is where the person signed in and `src_host` is where they came from.

**vpn_sessions**: connections from outside, with start and end.

**dhcp_leases**: which machine had which IP, from when until when.

**fw_events**: what went out to the internet (`dst_scope` `EXTERNO`) or stayed inside (`INTERNO`), with the bytes.

**edr_events**: programs started on each machine, as seen by the antivirus.

**heartbeats**: a "pulse" each system records every hour. Priscila explains it better.

Please be quick. The payroll has everyone's salary in it, mine included.

Marta
