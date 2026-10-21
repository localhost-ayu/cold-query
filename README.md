# Cold Query

[English](#english) · [Português do Brasil](#portugues) · [License / Licença](#license)

Code available · Free for noncommercial use · Mods welcome

<a id="english"></a>

**A detective game where the only weapon is SQL.** You are a data analyst at Nova Perícia Digital, a small forensics firm. Helena, the coordinator, sends you contracts; each one comes with real databases (badge logs, inventories, timesheets) and a question nobody inside the client company could answer. You open the SQL Terminal, query, pin what matters to your case board and send in a conclusion backed by evidence.

Everything happens inside **TraceOS**, a fictional operating system that runs in the browser: windows, dock, mail, notes. SQLite runs in a Web Worker on your machine. There are no accounts, no servers and nothing to install.

> **Status:** early development. The desktop and the SQL Terminal work against a training database. The first case, mail, case board and saves are next.

## Running locally

Requires [Bun](https://bun.sh) 1.3+ (or Node.js 22+ with npm).

```sh
bun install
bun run dev        # http://localhost:5173
bun run test
bun run lint
bun run typecheck
bun run build      # static site in dist/
```

## Deploying

`bun run build` produces a static site in `dist/`. Any static host works: Vercel, Netlify and Cloudflare Pages detect Vite projects with no setup. To serve from a subfolder, such as a GitHub Pages project site, build with `BASE_PATH=/cold-query/`.

The game can be embedded in an iframe (`sandbox="allow-scripts allow-same-origin"`). It needs no COOP/COEP headers.

## How it is built

React · Vite · TypeScript · SQLite WASM · CodeMirror 6 · Zustand · Tailwind CSS. Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Case packages are plain JSON, Markdown and SQL, described in [docs/CASE_FORMAT.md](docs/CASE_FORMAT.md) and [docs/RESOLUTION_SYSTEM.md](docs/RESOLUTION_SYSTEM.md).

<a id="portugues"></a>

<details>
<summary><strong>Português do Brasil</strong></summary>

## Cold Query

**Um jogo de detetive em que a única arma é SQL.** Você é analista de dados da Nova Perícia Digital, uma pequena empresa de perícia. A coordenadora, Helena, manda os contratos; cada um vem com bancos de dados de verdade (catracas, inventário, ponto) e uma pergunta que ninguém na empresa cliente conseguiu responder. Você abre o Terminal SQL, consulta, fixa o que importa no dossiê e envia uma conclusão sustentada por evidências.

Tudo acontece dentro do **TraceOS**, um sistema operacional fictício que roda no navegador: janelas, dock, e-mail, notas. O SQLite roda num Web Worker na sua máquina. Não há conta, servidor nem instalação.

> **Estado:** início do desenvolvimento. O desktop e o Terminal SQL já funcionam com uma base de treino. O primeiro caso, o Mail, o Dossiê e os saves vêm a seguir.

### Rodando localmente

Requer [Bun](https://bun.sh) 1.3+ (ou Node.js 22+ com npm).

```sh
bun install
bun run dev        # http://localhost:5173
bun run test
bun run lint
bun run typecheck
bun run build      # site estático em dist/
```

### Publicando

`bun run build` gera um site estático em `dist/`. Serve em qualquer hospedagem estática: Vercel, Netlify e Cloudflare Pages detectam projetos Vite sozinhas. Para publicar numa subpasta, como um site de projeto do GitHub Pages, faça o build com `BASE_PATH=/cold-query/`.

O jogo pode ser embutido num iframe (`sandbox="allow-scripts allow-same-origin"`). Não precisa de cabeçalhos COOP/COEP.

### Como é feito

React · Vite · TypeScript · SQLite WASM · CodeMirror 6 · Zustand · Tailwind CSS. Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Os casos são JSON, Markdown e SQL, descritos em [docs/CASE_FORMAT.md](docs/CASE_FORMAT.md) e [docs/RESOLUTION_SYSTEM.md](docs/RESOLUTION_SYSTEM.md).

</details>

<a id="license"></a>

## License

Cold Query is **code available** under the [PolyForm Noncommercial License 1.0.0](LICENSE). The license covers the code and the original game content: cases, databases, e-mails, fictional sites, texts and art. It is not an OSI-approved open source license, because commercial use is not granted.

- **Allowed, for noncommercial purposes:** clone it to study, play it, run it on your own site, republish it, modify it, build mods and new cases, and share all of that.
- **Credit:** whatever you share must carry the license (or its URL) and the `Required Notice:` lines from [NOTICE](NOTICE), crediting Nathã Grazzioli Botelho and this repository. Modifying the game does not include removing the credit.
- **Commercial use** (selling it or its mods, paid or ad-supported hosting, monetized adaptations) requires a separate license and the author's prior written authorization, with terms agreed before any commercial use. [Open an issue](https://github.com/localhost-ayu/cold-query/issues) describing what you have in mind. Opening an issue does not grant permission.
- **Third-party software, fonts and icons** keep their own licenses; see [CREDITS.md](CREDITS.md).

The English text in [LICENSE](LICENSE) is the license; these summaries are not.

### Licença

O Cold Query é **code available** sob a [PolyForm Noncommercial License 1.0.0](LICENSE). A licença cobre o código e o conteúdo original do jogo: casos, bancos, e-mails, sites fictícios, textos e arte. Não é uma licença open source aprovada pela OSI, porque não concede uso comercial.

- **Permitido, sem fins comerciais:** clonar para estudar, jogar, rodar no seu site, republicar, modificar, criar mods e casos novos, e compartilhar tudo isso.
- **Crédito:** o que você compartilhar precisa levar a licença (ou o endereço dela) e as linhas `Required Notice:` do [NOTICE](NOTICE), citando Nathã Grazzioli Botelho e este repositório. Modificar o jogo não inclui remover o crédito.
- **Uso comercial** (vender o jogo ou mods, hospedagem paga ou com anúncios, adaptações monetizadas) exige licença separada e autorização prévia por escrito do autor, com condições acertadas antes de qualquer uso comercial. [Abra uma issue](https://github.com/localhost-ayu/cold-query/issues) contando o que você pretende. Abrir a issue não concede permissão.
- **Software, fontes e ícones de terceiros** mantêm as próprias licenças; veja [CREDITS.md](CREDITS.md).

O texto em inglês de [LICENSE](LICENSE) é a licença; estes resumos não são.
