# Formato de casos

Um caso é uma pasta de arquivos declarativos: JSON, Markdown e SQL. Nenhum caso executa código. Este documento descreve o formato; os schemas que o validam ficam em `src/core/case-schema/`.

Casos de terceiros (mods) seguem exatamente o mesmo formato. Veja a seção de licença no README antes de publicar um.

## Estrutura

```text
cases/001-exemplo/
├── case.json
├── resolution.json
├── db/
│   └── exemplo.sql
├── emails/
│   ├── pt-BR/
│   │   └── e01-contrato.md
│   └── en/
│       └── e01-contract.md
├── sites/
│   └── pt-BR/
│       └── politica.md
└── SOLUTION.md
```

Paths são relativos à raiz do caso, usam `/`, não contêm `..` e diferenciam maiúsculas. IDs devem ser estáveis, ASCII e sem significado secreto quando forem opções.

## `case.json`

```json
{
  "schemaVersion": 1,
  "id": "001",
  "order": 1,
  "title": { "pt-BR": "Caso de exemplo", "en": "Example case" },
  "summary": { "pt-BR": "Resumo.", "en": "Summary." },
  "difficulty": 1,
  "sqlConcepts": ["SELECT", "WHERE"],
  "estimatedMinutes": 20,
  "author": "Autor",
  "license": "MIT",
  "client": "Empresa Exemplo",
  "databases": [
    {
      "id": "main",
      "file": "db/exemplo.sql",
      "label": { "pt-BR": "Acessos", "en": "Access" },
      "readOnly": true
    }
  ],
  "startEmail": "e01-contrato",
  "maxAttempts": 3,
  "hints": [
    {
      "id": "h1",
      "text": { "pt-BR": "Observe as datas.", "en": "Check the dates." }
    }
  ]
}
```

## `resolution.json`

Distribuir este arquivo não torna a resposta impossível de extrair; hashing evita texto claro e spoilers casuais, não um jogador determinado. Os IDs das opções também não podem carregar significado.

```json
{
  "facts": [
    {
      "id": "f_event",
      "bonus": false,
      "matcher": { "type": "rowHasValues", "values": [42, "ALMOX_TI"] },
      "verifyQuery": "SELECT badge_id, gate FROM events WHERE event_id = 7"
    }
  ],
  "report": {
    "slots": [
      {
        "id": "who",
        "label": { "pt-BR": "Quem?", "en": "Who?" },
        "options": [
          {
            "id": "w1",
            "label": { "pt-BR": "Pessoa A", "en": "Person A" },
            "requires": { "all": ["f_event"] }
          }
        ]
      }
    ]
  },
  "answerHashes": {
    "who": "<sha256 de 001|who|w1>"
  },
  "outcomes": {
    "correct": "e90-correto",
    "partial": "e91-parcial",
    "wrong": "e92-errado",
    "failed": "e93-falhou"
  }
}
```

Requisitos aceitos são exatamente `{ "all": [...] }`, `{ "any": [...] }` ou `{ "minFacts": N }`. `verifyQuery` deve produzir as linhas que satisfazem o matcher do próprio fato.

## E-mails Markdown

```md
---
id: e01-contrato
from:
  name: Helena Duarte
  address: helena@novapericia.example
  role: Coordenação
subject: Novo caso
date: 2026-03-16T09:00:00-03:00
kind: brief
unlockedBy: caseAccepted
attachments:
  - db/exemplo.sql
---

Corpo em Markdown sem HTML executável.
```

`client` é o nome do cliente, mostrado no Dossiê e no relatório.

Para o e-mail inicial, `unlockedBy` pode ser omitido; ele é referenciado por `startEmail`. Valores válidos posteriores: `caseAccepted`, `emailRead:<id>` e `answerCorrect:<caseId>`. Attachments precisam existir dentro do pacote.

## Sites Markdown

```md
---
url: intranet.empresa.example/politica
title: Política de acesso
---

Somente TI acessa o almoxarifado. {#p-almox}
```

Cada âncora é única na página. A URL usa host `.example`. O pipeline sanitiza o HTML e o iframe não recebe `allow-scripts`.

## Banco e solução

Cada arquivo SQL cria e popula um banco SQLite do zero. Tabelas de domínio devem ter chave primária; chaves estrangeiras devem apontar para objetos existentes. Geração ruidosa precisa ser determinística, com seed fixa e script em `tools/`; o `.sql` gerado também é versionado.

`SOLUTION.md` contém spoilers, queries de referência e explicação para testadores/autores. Não é exibido no jogo nem incluído no catálogo público de pistas.

## Empacotamento `.dbcase`

É um ZIP com a estrutura acima, na raiz ou dentro de uma única pasta. `bun run case:pack <pasta> [saida.dbcase]` valida e gera o pacote. O importador (`src/core/dbcase`) recusa caminhos absolutos, com `..` ou barra invertida, arquivos fora da estrutura, conteúdo que não seja UTF-8, mais de 500 arquivos e pacotes grandes demais: 25 MiB compactado, 100 MiB expandido, 10 MiB por JSON ou Markdown e 50 MiB por `.sql`. O tamanho declarado no zip é conferido antes de descompactar e o real, depois. Como publicar um caso: [MODDING.md](MODDING.md).

## Validação

O script `validate-cases` confere, com as mesmas regras que o jogo aplica a um `.dbcase` importado (`src/core/case-schema/build.ts` e `src/core/case-validate`), JSON e frontmatter, IDs duplicados, referências, e-mails órfãos, banco e chaves primárias, todos os `verifyQuery`, hashes, matchers, opções alcançáveis e se existe pelo menos uma combinação correta alcançável. Rode com `bun run validate-cases`. O script `case:hash` (`bun run case:hash 001 who w1`) recebe caso, slot e opção e devolve `sha256(caseId|slotId|optionId)`.

Um caso pode ter só pt-BR; os textos em inglês que faltarem caem no português.
