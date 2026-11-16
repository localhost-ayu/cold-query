---
id: e03-ti
from:
  name: Priscila Andrade
  address: priscila.andrade@vantara.example
  role: Coordenadora de TI, Vantara Logística
subject: 'Sobre os relógios'
date: '2026-05-14T09:40:00-03:00'
kind: info
unlockedBy: emailRead:e02-dicionario
---

Olá. A Marta pediu que eu explicasse a parte chata.

AD, VPN, DHCP, crachás e ponto sincronizam com o mesmo servidor de hora e estão certos. O firewall perdeu a sincronização em abril, depois de uma atualização, e ninguém sabe quanto ele andou desde então. O EDR grava tudo em UTC, que é três horas à frente da nossa hora.

Para medir a diferença existem os pulsos: todo sistema grava um registro na tabela `heartbeats` na virada de cada hora, com o mesmo número de sequência. Se dois sistemas gravaram o pulso 100 com horas diferentes, a diferença é o erro de relógio de um deles.

Ah, e eu estava conectada naquela noite: manutenção do storage, agendada no calendário de mudanças. Não fui eu, mas entendo se vocês precisarem conferir.

Priscila
