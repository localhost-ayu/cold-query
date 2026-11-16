---
id: e03-ti
from:
  name: André Teixeira
  address: andre.teixeira@borgeslacerda.example
  role: IT analyst, Borges & Lacerda Advogados
subject: 'About the system accounts'
date: '2026-04-27T10:02:00-03:00'
kind: info
unlockedBy: emailRead:e02-dicionario
---

Hi, Rita asked me to explain how accounts work here.

Every account is born when HR registers a person and should die when HR reports that the person has left. "Should" because the notice arrives by e-mail, and e-mail sometimes gets left for later.

There are two service accounts with nobody behind them: `svc_backup`, which copies at night whatever was created the day before, and `svc_scanner`, used by document scanning.

The VPN accepts any active account, from anywhere. Nobody checks the time, because lawyers do work at dawn.

André
