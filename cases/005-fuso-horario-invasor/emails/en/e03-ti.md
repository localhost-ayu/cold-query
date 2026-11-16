---
id: e03-ti
from:
  name: Priscila Andrade
  address: priscila.andrade@vantara.example
  role: IT Coordinator, Vantara Logística
subject: 'About the clocks'
date: '2026-05-14T09:40:00-03:00'
kind: info
unlockedBy: emailRead:e02-dicionario
---

Hello. Marta asked me to explain the boring part.

AD, VPN, DHCP, badges and timesheet sync with the same time server and are correct. The firewall lost sync in April, after an update, and nobody knows how far it has drifted since. The EDR records everything in UTC, which is three hours ahead of our local time.

That's what the pulses are for: every system writes a row to the `heartbeats` table on the hour, with the same sequence number. If two systems recorded pulse 100 at different times, the difference is one of them being off.

Oh, and I was connected that night: storage maintenance, scheduled in the change calendar. It wasn't me, but I understand if you need to check.

Priscila
