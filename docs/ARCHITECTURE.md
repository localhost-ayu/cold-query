# Arquitetura

Cold Query é um site estático. Tudo roda no navegador do jogador: não há servidor, conta, API nem telemetria. O build (Vite) gera uma pasta `dist/` que qualquer hospedagem de arquivos estáticos serve sem configuração.

```text
pacotes de caso ──► validação ──► estado do jogo ──► apps do TraceOS
                                       │                   │
                                       ▼                   ▼
                              IndexedDB / save JSON    SqlEngine ──► Web Worker (SQLite WASM)
```

## Camadas

| Pasta          | O que faz                                               | O que não pode conhecer  |
| -------------- | ------------------------------------------------------- | ------------------------ |
| `src/main.tsx` | ponto de entrada: monta o desktop                       | regras de caso           |
| `src/os`       | shell: top bar, dock, janelas, tema, áudio, i18n        | respostas dos casos      |
| `src/apps`     | Terminal, Ajustes e, depois, Mail, Dossiê, Notas, Ajuda | persistência concreta    |
| `src/core`     | SQL, i18n, contratos de caso, matchers, veredito        | React e Zustand          |
| `src/store`    | estado e comandos (Zustand)                             | DOM e detalhes do SQLite |
| `src/content`  | conteúdo que acompanha o jogo (base de treino)          | código de UI             |
| `cases/`       | casos declarativos: JSON, Markdown e SQL                | código executável        |
| `scripts/`     | tarefas de build                                        | runtime do jogador       |

As dependências vão da UI para o núcleo, nunca ao contrário. Os stores chamam funções puras de `src/core`; Worker e armazenamento ficam atrás de adaptadores, e por isso dá para testar tudo com dublês.

## Motor SQL

`src/core/sql` expõe a interface `SqlEngine { open, exec, schema, close }`. A implementação do navegador (`worker-engine.ts`) conversa com `sql.worker.ts` por mensagens numeradas.

- **SQLite oficial** (`@sqlite.org/sqlite-wasm`), banco em memória. Não usamos OPFS: ele exigiria os cabeçalhos COOP/COEP, que impedem o jogo de abrir dentro de um iframe.
- **Empacotamento.** O worker importa o pacote normalmente e o Vite emite o `.wasm` como asset. Em dev, o pacote fica fora do pré-empacotamento (`optimizeDeps.exclude`), senão o caminho do `.wasm` se perde.
- **Somente leitura em três camadas.** (1) `guard.ts` recusa `ATTACH`, `DETACH`, `VACUUM` e pragmas de escrita antes do envio, só para dar uma mensagem clara. (2) Depois de rodar o script do caso, o banco recebe `PRAGMA query_only = ON`. (3) Um _authorizer_ do SQLite nega `ATTACH`, `DETACH` e qualquer pragma fora da lista de leitura, e `sqlite3_limit` limita strings e blobs a 8 MiB. A camada 1 é conveniência; a segurança está nas camadas 2 e 3.
- **Tempo e tamanho.** Cada consulta tem 5 s. Passou disso, o worker é encerrado e um novo nasce no pedido seguinte, reabrindo os bancos a partir dos scripts guardados. O botão _Interromper_ faz o mesmo. Resultados param em 1000 linhas, com aviso.
- **Erros traduzidos.** `errors.ts` transforma a mensagem do SQLite num código (`noTable`, `syntax`, `timeout`...) com parâmetros; a UI mostra o texto no idioma do jogador e a mensagem original como detalhe.

## Estado

Um store por domínio: preferências, janelas e Terminal; progresso, dossiê e notas chegam com os casos. Seletores finos evitam renders globais.

- **Preferências** (idioma, tema, som) ficam no `localStorage`, com leitura e escrita protegidas: aba privada ou armazenamento bloqueado não quebram o jogo. Um script no `<head>` do `index.html` aplica o tema antes da primeira pintura, para não piscar.
- **Progresso do jogo** vai para IndexedDB, num formato próprio com `saveVersion` e migrações. É o próximo passo depois dos casos.

## Shell e janelas

Cada app tem uma janela. A janela guarda geometria, minimizada/maximizada, encaixe lateral, z-index e a geometria para restaurar. Todas as mudanças passam por comandos do store que respeitam a área útil entre a top bar e o dock.

- Arrastar começa depois de 4 px, para um clique na barra de título não mover nem maximizar nada.
- Soltar no topo maximiza; nas laterais, encaixa em meia tela. Arrastar uma janela encaixada devolve o tamanho anterior.
- Atalhos: `Alt+Tab` alterna janelas. `Super` + setas encaixa, maximiza e minimiza; `Alt+Shift` + setas faz o mesmo onde o sistema operacional captura o Super.
- Com `prefers-reduced-motion`, as janelas só aparecem e somem com fade.

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
