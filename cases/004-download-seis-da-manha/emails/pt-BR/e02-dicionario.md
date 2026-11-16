---
id: e02-dicionario
from:
  name: Rita Lacerda
  address: rita.lacerda@borgeslacerda.example
  role: Sócia-gestora, Borges & Lacerda Advogados
subject: 'O que há no banco'
date: '2026-04-27T09:15:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Prezados,

Segue a descrição das tabelas, conforme me passou a TI.

**users**: contas do sistema de documentos. `hr_id` liga a conta ao cadastro do RH (contas de serviço não têm); `active` é 1 para conta ativa e 0 para desativada.

**hr_records**: cadastro do RH. `status` é `ATIVO` ou `DESLIGADO`; `terminated_at`, a data do desligamento.

**matters**: as matérias (casos) do escritório, com o sócio responsável. **matter_team** diz quem trabalha em cada uma.

**documents**: os documentos, com a matéria, o título e a classificação (`PUBLICO`, `INTERNO` ou `CONFIDENCIAL`).

**downloads**: cada download, com a conta, o documento, a hora, o IP de origem e o canal (`OFFICE_NET` dentro do escritório, `VPN` de fora, `SHARED_LINK` por link compartilhado).

A Fusão Altamira é a matéria 3. As políticas internas ficam em intranet.borgeslacerda.example.

Conto com a discrição de vocês.

Rita Lacerda
