/** Nomes e links do produto num lugar só: trocar aqui troca no jogo inteiro. */
export const brand = {
  gameName: 'Cold Query',
  osName: 'TraceOS',
  companyName: 'Nova Perícia Digital',
  tagline: 'Evidências nos dados. Conclusões no dossiê.',
  author: 'Nathã Grazzioli Botelho',
  license: 'PolyForm Noncommercial 1.0.0',
  links: {
    repository: 'https://github.com/localhost-ayu/cold-query',
    /** Pedidos de licença comercial. */
    commercial: 'https://github.com/localhost-ayu/cold-query/issues',
    commercialEmail: 'natha@grazzioli.dev',
    site: 'https://coldquery.grazzioli.dev',
    /** Vazio enquanto não houver página de apoio; a tela Sobre esconde o botão. */
    donation: '',
  },
} as const;
