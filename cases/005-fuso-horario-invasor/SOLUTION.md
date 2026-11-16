# Caso 005: solução

> Spoiler. Para autores e testadores; o jogo não mostra este arquivo.

**Resposta:** Gustavo Pires (Comercial), com a credencial de Henrique Sato (de férias); o dado saiu entre 22:48 e 22:55, no relógio real (22:51:00).

## A verdade, no relógio de referência

| Hora | O que aconteceu |
| --- | --- |
| 18:12 | Gustavo bate o ponto e sai. |
| 21:58 | Gustavo passa o crachá na portaria; 22:03, no 2º andar. |
| 22:04 | A WS-COM-14 (dele) pega o IP 10.30.2.57 no DHCP. |
| 22:44 | Logon de `h.sato` no SRV-RH-01 vindo da WS-COM-14. Henrique está de férias desde 11/05. |
| 22:46–22:47 | EDR: `7z.exe` e `rclone.exe` na WS-COM-14 (gravados como 01:46 e 01:47 UTC do dia 13). |
| 22:51 | Saída de 1.874.329.600 bytes para fora (o firewall grava 22:58:12). |
| 22:54 | A WS-COM-14 desliga; o IP .57 vai para a WS-COM-12, da Natália, acordada para atualizar. |

## Caminho esperado

1. **A saída grande:** `SUM(bytes_out) OVER (PARTITION BY src_ip ORDER BY event_time)` em `fw_events` externos mostra o IP 10.30.2.57 às 22:58:12 do firewall.
2. **A deriva do firewall:** self-join em `heartbeats` pelo `seq`, FW contra AD: `AVG(strftime('%s', f.event_time) - strftime('%s', a.event_time))` dá 432 s.
3. **O dono do IP na hora real:** `datetime(event_time, '-432 seconds')` dá 22:51:00; nesse instante o lease do .57 é da WS-COM-14, atribuída ao funcionário 11 (Gustavo). Sem a correção, 22:58:12 cai no lease da WS-COM-12, da Natália.
4. **Quem estava no prédio:** `ROW_NUMBER() OVER (PARTITION BY badge_id ORDER BY event_time DESC)` na portaria até 22:51 mostra o Gustavo (e o vigilante noturno) com último evento `IN`. A Natália saiu às 17:48.
5. **O logon atípico:** `LAG(event_time)` dos logons de `h.sato` mostra o anterior em 08/05, antes das férias, e o de 12/05 vindo da WS-COM-14. `absences` traz as férias.
6. **O EDR:** `datetime(event_time, '-3 hours')` leva o `rclone.exe` para 22:47:30 local.

## Despistes

- **Natália Prado:** sem corrigir o relógio, o IP da saída é da máquina dela.
- **Hora do EDR:** em UTC, o `rclone.exe` parece ser de 01:47, de madrugada.
- **Priscila Andrade:** VPN das 22:12 às 23:15, manutenção do storage no calendário de mudanças.
- **Diego Lima:** logon no SRV-RH-01 às 22:05, pela VPN, para o patch agendado.
- **Backup:** 3 GB às 23:00 (23:07 no firewall), para o storage interno.
- **Henrique Sato:** a conta é dele, mas ele está de férias, sem crachá nem ponto.

## Relatório

| Slot | Opção | Libera com |
| --- | --- | --- |
| who | w1 Natália | `f_natalia_lease` |
| who | w2 Diego | `f_diego_patch` |
| who | **w3 Gustavo** | `f_lease_gustavo` + `f_asset_gustavo` + `f_fw_offset` |
| who | w4 Priscila | `f_priscila_vpn` |
| who | w5 Henrique | `f_sato_logon` |
| who | w6 inconclusivo | 4 fatos |
| credential | c1 conta do Gustavo | `f_asset_gustavo` |
| credential | c2 conta de backup | `f_backup_internal` |
| credential | **c3 conta do Henrique** | `f_sato_logon` + `f_sato_vacation` |
| credential | c4 VPN da Priscila | `f_priscila_vpn` |
| when | t1 22:30–22:40 | 3 fatos |
| when | t2 22:40–22:50 (hora do logon) | `f_sato_logon` |
| when | **t3 22:48–22:55** | `f_fw_exfil` + `f_fw_offset` |
| when | t4 22:55–23:05 (firewall cru) | `f_fw_exfil` |
| when | t5 01:45–01:55 (EDR cru, UTC) | `f_edr_raw` |

Bônus: `f_edr_local`, `f_gustavo_return`, `b_gustavo_clockout` e o parágrafo `p-firewall` do runbook. A dica 4 só aparece depois de uma tentativa errada.

## Dados

`tools/gen-case-005.ts` (semente 20260512) gera um banco único com uma tabela por fonte (8.677 linhas, de 04/05 a 13/05 06:00), usando os funcionários do caso 001. Cada tabela já vem com o relógio da fonte: firewall +432 s, EDR em UTC. Diferenças em relação ao roteiro: tabela `absences` para as férias do Henrique virarem uma linha fixável; a opção "22:30–22:40" aparece com quaisquer três fatos; o portal da TI fica em `ti.vantara.example`, para não colidir com a intranet do caso 001. O gerador confere: hora crua do firewall, dono do IP antes e depois da correção, uma saída grande só, Henrique sem ponto nem crachá nas férias, Gustavo dentro e Natália fora do prédio às 22:51, deriva constante.
