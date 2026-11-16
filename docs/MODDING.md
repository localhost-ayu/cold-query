# Criando casos (mods)

Qualquer pessoa pode escrever um caso e distribuir como um arquivo `.dbcase`. O jogador instala em **Ajustes → Casos → Instalar caso**, e o contrato chega no Mail como o de um caso oficial. Nada roda fora do navegador do jogador e nenhum caso executa código: é só JSON, Markdown e SQL.

## Passo a passo

1. **Copie um caso como modelo.** `cases/001-notebook-almoxarifado/` tem tudo o que um caso usa. Copie para uma pasta sua, fora de `cases/` se o caso não for entrar no jogo oficial.
2. **Escolha um id próprio.** O `id` do `case.json` tem três dígitos, e de `001` a `099` são dos casos oficiais. Use um de `100` a `999`. Instalar de novo um caso com o mesmo id troca a versão anterior.
3. **Escreva o banco.** `db/*.sql` cria e popula as tabelas do zero. Se os dados forem muitos, gere o SQL com um script com seed fixa, para quem revisa conseguir reproduzir.
4. **Escreva os e-mails e os sites** em `emails/<idioma>/` e `sites/<idioma>/`. pt-BR basta; o inglês que faltar cai no português.
5. **Defina fatos e relatório** em `resolution.json`. Cada fato precisa de uma `verifyQuery` que o descobre. O formato completo está em [CASE_FORMAT.md](CASE_FORMAT.md) e o funcionamento em [RESOLUTION_SYSTEM.md](RESOLUTION_SYSTEM.md).
6. **Gere os hashes das respostas certas**, um por slot:

   ```sh
   bun run case:hash <id-do-caso> <slot> <opção>
   ```

   O hash inclui o id do caso: se mudar o id, gere de novo.

7. **Empacote:**

   ```sh
   bun run case:pack caminho/do/caso [saida.dbcase]
   ```

   O script valida o caso com as mesmas regras da importação no jogo e só grava o `.dbcase` se tudo passar. Um erro aponta o arquivo e o problema.

## O que o jogo confere ao importar

- **Pacote:** zip válido, até 25 MiB compactado e 100 MiB descompactado, até 500 arquivos, cada JSON ou Markdown até 10 MiB e cada `.sql` até 50 MiB. Todo arquivo precisa ser texto UTF-8.
- **Caminhos:** só os do formato (`case.json`, `resolution.json`, `db/*.sql`, `emails/<idioma>/*.md`, `sites/<idioma>/*.md`, `SOLUTION.md`, `README.md`). Caminhos absolutos, com `..` ou com barra invertida são recusados, assim como qualquer outro arquivo. O caso pode estar na raiz do zip ou dentro de uma única pasta.
- **Conteúdo:** schemas, referências entre arquivos, âncoras, e-mails de resultado e anexos.
- **Solução:** cada `verifyQuery` roda num SQLite isolado e precisa satisfazer o matcher do seu fato, toda opção do relatório precisa ser liberável e exatamente uma combinação de opções pode ser a correta.

`SOLUTION.md` e `README.md` podem ir no pacote para quem for ler, mas o jogo não os abre.

## Segurança

O conteúdo de um caso importado é tratado como não confiável. O HTML dos e-mails e sites passa pelo DOMPurify, os sites rodam num iframe sem permissão de script e o SQL roda num banco só de leitura, dentro de um worker com limite de tempo. O jogador vê o autor e a licença do caso antes de remover ou manter.

O jogo guarda os arquivos originais do caso no navegador (IndexedDB) e monta o caso de novo a cada abertura, então uma versão nova do jogo reaplica as regras atuais. Um caso que deixar de passar fica fora do jogo até ser atualizado.

## Licença dos mods

O Cold Query é MIT, código e conteúdo (veja o [README](../README.md#license)). Um caso seu pode ter a licença que você escolher; declare em `license` no `case.json`. Se ele copiar textos, bancos ou personagens de um caso oficial, mantenha o aviso de copyright e o texto da licença MIT junto do pacote.
