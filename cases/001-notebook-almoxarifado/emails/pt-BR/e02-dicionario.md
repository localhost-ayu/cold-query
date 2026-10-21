---
id: e02-dicionario
from:
  name: Marta Vidal
  address: marta.vidal@vantara.example
  role: Gerente de RH, Vantara Logística
subject: 'Dicionário de dados: acessos e patrimônio'
date: '2026-03-16T10:42:00-03:00'
kind: info
unlockedBy: caseAccepted
---

Olá! A Helena pediu que eu explicasse as tabelas. Vai em linhas gerais, a TI pode detalhar se precisar.

**employees**: quem trabalha aqui. `badge_id` é o número do crachá; `shift` é o turno (`COMERCIAL`, `NOTURNO` ou `LIMPEZA`).

**assets**: o patrimônio. `status` pode ser `EM_USO`, `DISPONIVEL`, `MANUTENCAO` ou `BAIXADO`; `location` diz onde o item deveria estar (`ESTACAO`, `ALMOX_TI`, `BANCADA_TI`, `DESCARTE`). `assigned_to` é o `id` do funcionário responsável. `last_audit_at` e `last_audit_by` registram a última conferência.

**badge_events**: cada passada de crachá. `gate` é o leitor (`PORTARIA`, `ANDAR_2`, `ANDAR_3`, `ANDAR_4`, `ALMOX_TI`, `REFEITORIO`) e `direction` é `IN` ou `OUT`. A portaria e o almoxarifado registram entrada e saída; andares e refeitório, só a entrada.

**timesheet**: o ponto. Um registro por pessoa por dia, com `clock_in` e `clock_out` arredondados para o minuto.

As horas estão no formato `AAAA-MM-DD HH:MM:SS`, então dá para comparar como texto. A política de acesso fica na intranet, em intranet.vantara.example/politica-acesso.

Obrigada pela ajuda. Aqui ninguém dorme direito desde segunda.

Marta
