---
id: runbook-relogios
url: ti.vantara.example/runbook-relogios
title: 'Runbook: relógios e sincronização de hora'
---

# Runbook: relógios e sincronização de hora

Atualizado em 05/05/2026 pela equipe de infraestrutura.

O firewall perdeu a sincronização de hora (NTP) depois da atualização de 14/04 e está adiantado. Chamado aberto com o fornecedor; até a correção, toda hora do firewall precisa ser ajustada antes de cruzar com outras fontes. {#p-firewall}

O EDR das estações grava os eventos em UTC, três horas à frente do horário de Brasília. {#p-edr}

AD, VPN, DHCP, catracas e ponto usam o servidor de hora interno e estão corretos. {#p-referencia}

Todo sistema grava um pulso na tabela de heartbeats na virada de cada hora, com o mesmo número de sequência. Comparar o mesmo pulso em duas fontes mede a diferença entre os relógios. {#p-pulsos}
