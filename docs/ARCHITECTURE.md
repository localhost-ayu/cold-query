# Arquitetura

Cold Query é um site estático. Tudo roda no navegador do jogador: não há servidor, conta, API nem telemetria. O build (Vite) gera uma pasta `dist/` que qualquer hospedagem de arquivos estáticos serve sem configuração.

```text
pacotes de caso ──► validação ──► estado do jogo ──► apps do TraceOS
                                       │                   │
                                       ▼                   ▼
                              IndexedDB / save JSON    SqlEngine ──► Web Worker (SQLite WASM)
```

## Camadas

| Pasta          | O que faz                                                           | O que não pode conhecer  |
| -------------- | ------------------------------------------------------------------- | ------------------------ |
| `src/main.tsx` | ponto de entrada: monta o desktop                                   | regras de caso           |
| `src/os`       | shell: top bar, dock, janelas, tema, áudio, i18n                    | respostas dos casos      |
| `src/apps`     | Mail, Terminal, Dossiê, Navegador, Arquivos, Notas, Ajuda e Ajustes | persistência concreta    |
| `src/core`     | SQL, i18n, contratos de caso, matchers, veredito                    | React e Zustand          |
| `src/store`    | estado e comandos (Zustand)                                         | DOM e detalhes do SQLite |
| `src/content`  | conteúdo que acompanha o jogo (base de treino)                      | código de UI             |
| `cases/`       | casos declarativos: JSON, Markdown e SQL                            | código executável        |
| `scripts/`     | tarefas de build                                                    | runtime do jogador       |

As dependências vão da UI para o núcleo, nunca ao contrário. Os stores chamam funções puras de `src/core`; Worker e armazenamento ficam atrás de adaptadores, e por isso dá para testar tudo com dublês.

## Motor SQL

`src/core/sql` expõe a interface `SqlEngine { open, exec, schema, close }`. A implementação do navegador (`worker-engine.ts`) conversa com `sql.worker.ts` por mensagens numeradas.

- **SQLite oficial** (`@sqlite.org/sqlite-wasm`), banco em memória. Não usamos OPFS: ele exigiria os cabeçalhos COOP/COEP, que impedem o jogo de abrir dentro de um iframe.
- **Empacotamento.** O worker importa o pacote normalmente e o Vite emite o `.wasm` como asset. Em dev, o pacote fica fora do pré-empacotamento (`optimizeDeps.exclude`), senão o caminho do `.wasm` se perde.
- **Somente leitura em três camadas.** (1) `guard.ts` recusa `ATTACH`, `DETACH`, `VACUUM` e pragmas de escrita antes do envio, só para dar uma mensagem clara. (2) Depois de rodar o script do caso, o banco recebe `PRAGMA query_only = ON`. (3) Um _authorizer_ do SQLite nega `ATTACH`, `DETACH` e qualquer pragma fora da lista de leitura, e `sqlite3_limit` limita strings e blobs a 8 MiB. A camada 1 é conveniência; a segurança está nas camadas 2 e 3.
- **Tempo e tamanho.** Cada consulta tem 5 s. Passou disso, o worker é encerrado e um novo nasce no pedido seguinte, reabrindo os bancos a partir dos scripts guardados. O botão _Interromper_ faz o mesmo. Resultados param em 1000 linhas, com aviso.
- **Erros traduzidos.** `errors.ts` transforma a mensagem do SQLite num código (`noTable`, `syntax`, `timeout`...) com parâmetros; a UI mostra o texto no idioma do jogador e a mensagem original como detalhe.

## Apps

- **Navegador** (`src/apps/browser`): só abre páginas `.example` dos casos aceitos. Cada página vira um documento num `<iframe sandbox="allow-same-origin">`: sem `allow-scripts`, nada da página executa, e o jogo ainda alcança o DOM para ligar links internos e os botões "Fixar no dossiê" dos parágrafos com âncora. O HTML passa pelo DOMPurify antes. Endereços e histórico ficam em `src/core/browser` e `src/store/browser-store.ts`.
- **Tela de bloqueio**: é o menu do jogo, em `src/os/lock`. O jogo sempre abre bloqueado (`locked` no shell store); o escudo com o relógio sobe com clique ou tecla e mostra o login, com senha cenográfica, opções (idioma, tema, som) e créditos. Enquanto bloqueada, a sessão fica `inert` e os atalhos globais não respondem. O primeiro e-mail de um jogo novo só chega depois do desbloqueio. Bloquear (cadeado nas configurações rápidas, Super+L ou Alt+Shift+L) grava o progresso na hora.
- **Terminal**: alterna entre Consultas e Diagrama. O diagrama mostra um cartão por tabela e uma seta para cada chave estrangeira (`pragma_foreign_key_list`); `src/core/diagram` põe as tabelas que apontam à esquerda, as apontadas no meio e as soltas à direita, para as setas não cruzarem cartões.
- **Dossiê**: alterna entre Quadro e Linha do tempo. `src/core/timeline` tira de cada linha fixada as datas e horas (data e hora juntas, ou data com horas em colunas separadas, como no ponto) e as põe em ordem, agrupadas por dia. Só organiza o que foi fixado; não indica o que é relevante.
- **Casos importados**: `.dbcase` instalado em Ajustes. `src/core/dbcase` abre o zip com limites, `src/core/case-schema/build.ts` monta o caso (o mesmo montador do build) e `src/core/case-validate` prova que tem solução num worker SQLite à parte. Os arquivos ficam no depósito `cases` do IndexedDB e são remontados no boot, antes do save ser restaurado.
- **Arquivos**: lista os bancos (treino e casos aceitos) e as páginas da intranet; abrir leva ao Terminal ou ao Navegador.
- **Notas**: um caderno Markdown por caso, mais um geral. A prévia carrega o `marked` sob demanda.
- **Ajuda**: guia de SQL com um tópico por conceito do currículo, liberado conforme os contratos; os exemplos abrem numa aba nova do Terminal, na base de treino. Também traz como jogar, as dicas já reveladas e os atalhos.

## Casos e resolução

- Os casos ficam em `cases/<NNN-slug>/` (formato em [CASE_FORMAT.md](CASE_FORMAT.md)). No build, o plugin `cold-query-cases` do `vite.config.ts` lê a pasta com `scripts/cases.ts`, valida tudo com os schemas zod de `src/core/case-schema/`, converte o Markdown em HTML e expõe o módulo `virtual:cases`. O SQL de cada banco vira um import sob demanda: só baixa quando o jogador aceita o contrato.
- O HTML dos e-mails passa pelo DOMPurify antes de ir para a tela.
- `src/core/resolution` tem as regras do jogo em funções puras: matchers, fatos descobertos, opções liberadas (só aumentam), veredito por hash sha256 e estrelas.
- `src/store/game-store.ts` guarda caixa de entrada, progresso de cada caso, dossiê e notas, e entrega os e-mails pelos gatilhos `caseAccepted`, `emailRead:<id>` e `answerCorrect:<caso>`.
- `bun run validate-cases` roda cada `verifyQuery` no SQLite, confere que toda opção pode ser liberada e que existe exatamente uma combinação correta. Os mesmos testes rodam no Vitest.
- **Treinamento:** antes do primeiro contrato, a Helena manda um e-mail com cinco exercícios na base de treino (`src/content/tutorial.ts`). O Terminal confere cada resultado com `src/core/tutorial` (basta uma coluna do resultado bater com a resposta, então tanto `SELECT *` quanto `SELECT id` valem). Quem já sabe SQL pula e recebe o contrato na hora.
- Bancos grandes são gerados por scripts determinísticos em `tools/` (`bun run cases:generate`), e o `.sql` resultante é versionado.

## Estado

Um store por domínio: preferências, janelas e Terminal; progresso, dossiê e notas chegam com os casos. Seletores finos evitam renders globais.

- **Preferências** (idioma, tema, som) ficam no `localStorage`, com leitura e escrita protegidas: aba privada ou armazenamento bloqueado não quebram o jogo. Um script no `<head>` do `index.html` aplica o tema antes da primeira pintura, para não piscar.
- **Progresso do jogo** vai para o IndexedDB (`src/core/save/storage.ts`) com autosave: qualquer mudança no jogo, no Terminal ou nas janelas agenda uma gravação 800 ms depois, e esconder ou fechar a aba grava na hora. O save guarda caixa de entrada, progresso dos casos, dossiê, notas, abas e histórico do Terminal e a posição das janelas; resultados de consulta não (rodam de novo).
- **Formato do save** (`src/core/save/schema.ts`): JSON com `app`, `saveVersion` e os dados acima, validado com zod tanto ao carregar quanto ao importar um arquivo. Ao mudar o formato, a versão sobe e uma função em `migrations` converte o save anterior, um passo por vez. Saves de uma versão mais nova do jogo são recusados. O validador (e o zod) só carrega quando há um save para ler.
- **Ajustes > Progresso**: exportar o save como arquivo, importar (com confirmação) e apagar o progresso. Sem IndexedDB (aba privada), o jogo funciona e avisa que é bom exportar.

## Shell e janelas

O TraceOS segue o GNOME do Fedora: barra superior preta, Atividades (overview) no lugar de um dock fixo e janelas no padrão libadwaita.

- **Barra superior:** indicador de áreas de trabalho (abre as Atividades), relógio com notificações e calendário, e o menu do sistema com configurações rápidas (estilo escuro, som, volume, idioma). Estado em `src/store/shell-store.ts`.
- **Atividades:** as janelas encolhem para uma grade (`src/os/overview/layout.ts`, função pura testada), com busca de apps no topo e o dash embaixo. Abre pelo botão da barra, pelo canto superior esquerdo, por Super ou Alt+F1; fecha com Esc ou clique no fundo.
- **Notificações:** banner no topo que some sozinho e fica guardado na lista do relógio.
- **Janelas:** cada app tem uma. A janela guarda geometria, minimizada/maximizada, encaixe lateral, z-index e a geometria para restaurar. Os apps põem botões na header bar por `WindowHeaderItems` (um portal para os encaixes da barra).
- Arrastar começa depois de 4 px. Soltar no topo maximiza; nas laterais, encaixa em meia tela. Arrastar uma janela encaixada devolve o tamanho anterior.
- Atalhos: `Alt+Tab` alterna janelas; `Super` + setas (ou `Alt+Shift` + setas) encaixa, maximiza e minimiza.
- Com `prefers-reduced-motion`, as transições viram fade.

## Internacionalização

As mensagens moram em `src/core/i18n/messages`. `pt-BR.ts` define as chaves e `en.ts` é obrigado pelo TypeScript a ter as mesmas; um teste confere também os `{parâmetros}`. Componentes usam `useT()` e não contêm texto visível literal. Casos trazem conteúdo por idioma, com pt-BR como reserva.

## Hospedagem

- `bun run build` gera `dist/` com HTML, JS, CSS e o SQLite. Funciona em Vercel, Netlify, Cloudflare Pages e GitHub Pages.
- Na raiz de um domínio ou subdomínio, nada a configurar. Para servir numa subpasta, defina `BASE_PATH` no build (por exemplo `/cold-query/` no GitHub Pages).
- O jogo pode ser embutido num iframe com `sandbox="allow-scripts allow-same-origin"`. Não use cabeçalhos que impeçam isso (`X-Frame-Options: DENY`, COOP/COEP).

## Desempenho

- CodeMirror, o worker e o SQLite (cerca de 1,5 MB) só baixam quando o Terminal abre.
- A tabela de resultados é virtualizada: só as linhas visíveis existem no DOM.
- Fontes são servidas pelo próprio site; o papel de parede é CSS.
