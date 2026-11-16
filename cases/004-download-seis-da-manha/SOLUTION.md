# Caso 004: solução

> Spoiler. Para autores e testadores; o jogo não mostra este arquivo.

**Resposta:** a conta `c.brito` (Caetano Brito, desligado em 20/02/2026); credencial de ex-funcionário ainda ativa, usada pela VPN; falhou a desativação de contas no desligamento.

## Caminho esperado

1. **Quem baixou a v7.** Três downloads: `c.brito` às 06:02:41 de 22/04 pela VPN, de um IP externo nunca visto; `augusto.borges` às 09:40 no escritório; `svc_backup` na madrugada seguinte.

   ```sql
   SELECT u.username, d.downloaded_at, d.source_ip, d.channel
   FROM downloads d
   JOIN users u ON u.id = d.user_id
   JOIN documents doc ON doc.id = d.document_id
   WHERE doc.title = 'minuta_fusao_v7'
   ORDER BY d.downloaded_at;
   ```

2. **Anti-join: quem baixou documentos da Fusão Altamira sem ser da equipe.** Só o backup (que copia tudo) e o `c.brito`.

   ```sql
   SELECT u.username, doc.title, d.downloaded_at
   FROM downloads d
   JOIN documents doc ON doc.id = d.document_id
   JOIN users u ON u.id = d.user_id
   LEFT JOIN matter_team mt
          ON mt.matter_id = doc.matter_id AND mt.user_id = d.user_id
   WHERE doc.matter_id = 3 AND mt.user_id IS NULL;
   ```

3. **Subconsulta: contas ativas de pessoas desligadas.** `c.brito` e `luana.prates`. Sem o filtro `active = 1`, aparece também `j.moreira`, desativado direito.

   ```sql
   SELECT * FROM users
   WHERE active = 1
     AND hr_id IN (SELECT id FROM hr_records WHERE status = 'DESLIGADO');
   ```

4. **CTE: a conta com um único download confidencial na vida.** Só `c.brito`; antes de sair ele só mexia em documentos públicos e internos das próprias matérias.

## Despistes

- **Fernanda Matos** (`f.matos`), estagiária da equipe: 2.359 downloads, a maior do escritório. Baixou a v6 várias vezes, nunca a v7.
- **Augusto Borges**, sócio da matéria: baixou a v7 às 09:40, de dentro do escritório. Também criou o link compartilhado da v6 para o cliente, expirado em 18/04.
- **svc_backup**: copia às 03:00 o que foi criado na véspera. A v7 foi criada às 05:20 de 22/04, então o backup só a copiou em 23/04.
- **Luana Prates**: desligada há oito meses com a conta ainda ativa (falha real), mas sem nenhum download.
- **Segregação por matéria**: a política deixa o acervo aberto a todos os advogados ativos, então "fora da equipe" não é, sozinho, violação. O que falhou foi a conta de alguém que já não era do escritório.

## Relatório

| Slot | Opção | Libera com |
| --- | --- | --- |
| account | a1 f.matos | `f_matos_volume` |
| account | a2 svc_backup | `f_backup_3am` |
| account | **a3 c.brito** | `f_dl_v7` + `f_not_team` + `f_account_active` |
| account | a4 augusto.borges | `f_augusto_v7` |
| account | a5 luana.prates | `f_luana` |
| how | m1 link compartilhado | `f_shared_link` |
| how | m2 estagiária da equipe | `f_matos_volume` |
| how | **m3 credencial de ex-funcionário pela VPN** | `f_dl_v7` + `f_termination` |
| how | m4 conta de backup | `f_backup_3am` |
| control | c1 expiração de links | `f_shared_link` |
| control | c2 horário atípico | `f_dl_v7` |
| control | **c3 desativação no desligamento** | `f_account_active` + `f_termination` |
| control | c4 segregação por matéria | `f_not_team` |

Bônus: `f_first_conf`, `f_doc_created` e o parágrafo `p-desligamento` da política. A dica 4 só aparece depois de uma tentativa errada.

## Dados

`tools/gen-case-004.ts` (semente 20260427) gera 33 contas, 12 matérias, 315 documentos e 12.388 downloads, de 05/01 a 23/04/2026. O gerador confere: só três downloads da v7, na ordem certa; só `c.brito` com exatamente um download confidencial; nenhum download dele depois do desligamento além do vazamento; anti-join da Altamira com só backup e `c.brito`; Fernanda como quem mais baixa.
