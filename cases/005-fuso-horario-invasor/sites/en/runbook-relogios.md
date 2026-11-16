---
id: runbook-relogios
url: ti.vantara.example/runbook-relogios
title: 'Runbook: clocks and time sync'
---

# Runbook: clocks and time sync

Updated 05/05/2026 by the infrastructure team.

The firewall lost time sync (NTP) after the 04/14 update and is running fast. A ticket is open with the vendor; until it is fixed, every firewall time must be adjusted before matching it against other sources. {#p-firewall}

The workstation EDR records events in UTC, three hours ahead of Brasília time. {#p-edr}

AD, VPN, DHCP, turnstiles and timesheet use the internal time server and are correct. {#p-referencia}

Every system writes a pulse to the heartbeats table on the hour, with the same sequence number. Comparing the same pulse across two sources measures the difference between their clocks. {#p-pulsos}
