# Cold Query

[English](#english) · [Português do Brasil](#portugues) · [License / Licença](#license)

Open source · MIT · Mods welcome

<a id="english"></a>

**A detective game where the only weapon is SQL.** You are a data analyst at Nova Perícia Digital, a small forensics firm. Helena, the coordinator, sends you contracts; each one comes with real databases (badge logs, inventories, timesheets) and a question nobody inside the client company could answer. You open the SQL Terminal, query, pin what matters to your case board and send in a conclusion backed by evidence.

Everything happens inside **TraceOS**, a fictional GNOME-flavored operating system that runs in the browser: windows, Activities overview, mail, notes. SQLite runs in a Web Worker on your machine. There are no accounts, no servers and nothing to install.

> **Status:** early development. Case 001 is playable end to end: Mail, SQL Terminal and case board. Progress is saved in the browser and can be exported.
>
> Play it at **[coldquery.grazzioli.dev](https://coldquery.grazzioli.dev)**.

## Running locally

Requires [Bun](https://bun.sh) 1.3+ (or Node.js 22+ with npm).

```sh
bun install
bun run dev        # http://localhost:5173
bun run test
bun run lint
bun run typecheck
bun run build      # static site in dist/
bun run validate-cases

# end-to-end tests in Firefox (first time: bunx playwright install firefox)
bun run e2e
```

## Deploying

`bun run build` produces a static site in `dist/`. Any static host works: Vercel, Netlify and Cloudflare Pages detect Vite projects with no setup. To serve from a subfolder, such as a GitHub Pages project site, build with `BASE_PATH=/cold-query/`.

The game can be embedded in an iframe (`sandbox="allow-scripts allow-same-origin"`). It needs no COOP/COEP headers.

## How it is built

React · Vite · TypeScript · SQLite WASM · CodeMirror 6 · Zustand · Tailwind CSS. Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Case packages are plain JSON, Markdown and SQL, described in [docs/CASE_FORMAT.md](docs/CASE_FORMAT.md) and [docs/RESOLUTION_SYSTEM.md](docs/RESOLUTION_SYSTEM.md). To write your own case and ship it as a `.dbcase` players can install, see [docs/MODDING.md](docs/MODDING.md) (in Portuguese).

<a id="portugues"></a>

<details>
<summary><strong>Português do Brasil</strong></summary>

## Cold Query

**Um jogo de detetive em que a única arma é SQL.** Você é analista de dados da Nova Perícia Digital, uma pequena empresa de perícia. A coordenadora, Helena, manda os contratos; cada um vem com bancos de dados de verdade (catracas, inventário, ponto) e uma pergunta que ninguém na empresa cliente conseguiu responder. Você abre o Terminal SQL, consulta, fixa o que importa no dossiê e envia uma conclusão sustentada por evidências.

Tudo acontece dentro do **TraceOS**, um sistema operacional fictício, com cara de GNOME, que roda no navegador: janelas, Atividades, e-mail, notas. O SQLite roda num Web Worker na sua máquina. Não há conta, servidor nem instalação.

> **Estado:** início do desenvolvimento. O caso 001 já dá para jogar do começo ao fim: Mail, Terminal SQL e Dossiê. O progresso fica salvo no navegador e pode ser exportado.
>
> Jogue em **[coldquery.grazzioli.dev](https://coldquery.grazzioli.dev)**.

### Rodando localmente

Requer [Bun](https://bun.sh) 1.3+ (ou Node.js 22+ com npm).

```sh
bun install
bun run dev        # http://localhost:5173
bun run test
bun run lint
bun run typecheck
bun run build      # site estático em dist/
bun run validate-cases

# testes de ponta a ponta no Firefox (na primeira vez: bunx playwright install firefox)
bun run e2e
```

### Publicando

`bun run build` gera um site estático em `dist/`. Serve em qualquer hospedagem estática: Vercel, Netlify e Cloudflare Pages detectam projetos Vite sozinhas. Para publicar numa subpasta, como um site de projeto do GitHub Pages, faça o build com `BASE_PATH=/cold-query/`.

O jogo pode ser embutido num iframe (`sandbox="allow-scripts allow-same-origin"`). Não precisa de cabeçalhos COOP/COEP.

### Como é feito

React · Vite · TypeScript · SQLite WASM · CodeMirror 6 · Zustand · Tailwind CSS. Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Os casos são JSON, Markdown e SQL, descritos em [docs/CASE_FORMAT.md](docs/CASE_FORMAT.md) e [docs/RESOLUTION_SYSTEM.md](docs/RESOLUTION_SYSTEM.md). Para escrever um caso seu e distribuir como `.dbcase`, veja [docs/MODDING.md](docs/MODDING.md).

</details>

<a id="license"></a>

## License

Cold Query is open source under the [MIT License](LICENSE), covering both the code and the original game content: cases, databases, e-mails, fictional sites, texts and art. You can use, study, modify, republish and sell it, and build mods and new cases, as long as copies keep the copyright notice and the license text.

Third-party software, fonts and icons keep their own licenses; see [CREDITS.md](CREDITS.md).

### Licença

O Cold Query é open source sob a [licença MIT](LICENSE), que cobre o código e o conteúdo original do jogo: casos, bancos, e-mails, sites fictícios, textos e arte. Você pode usar, estudar, modificar, republicar e vender, além de criar mods e casos novos, desde que as cópias mantenham o aviso de copyright e o texto da licença.

Software, fontes e ícones de terceiros mantêm as próprias licenças; veja [CREDITS.md](CREDITS.md).
