---
id: e02-dicionario
from:
  name: Marta Vidal
  address: marta.vidal@vantara.example
  role: Gerente de RH, Vantara Logística
subject: 'As tabelas, de novo (agora são mais)'
date: '2026-05-14T09:05:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Oi! Vocês de novo, e dessa vez com mais tabelas. Vou explicar o que é cada uma; a Priscila, da TI, manda os detalhes técnicos.

**employees**, **badge_events**, **timesheet**: as mesmas do caso do notebook, agora com o `username` de cada um na rede.

**absences**: afastamentos do RH (férias, licenças), com início e fim.

**assets**: o patrimônio, agora com as estações de trabalho e os servidores. `assigned_to` é quem usa a máquina.

**ad_logons**: cada entrada numa máquina pela rede. `host` é onde a pessoa entrou e `src_host`, de onde ela veio.

**vpn_sessions**: conexões de fora, com início e fim.

**dhcp_leases**: qual máquina estava com qual IP, e de quando até quando.

**fw_events**: o que saiu pela internet (`dst_scope` `EXTERNO`) ou foi para dentro (`INTERNO`), com os bytes.

**edr_events**: programas abertos em cada máquina, pelo antivírus.

**heartbeats**: um "pulso" que cada sistema grava de hora em hora. A Priscila explica melhor.

Por favor, rápido. A folha tem o salário de todo mundo, inclusive o meu.

Marta
