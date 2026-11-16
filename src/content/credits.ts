/**
 * Créditos mostrados na tela de bloqueio. Espelha o CREDITS.md: o que entrar
 * lá entra aqui. Nomes e licenças não se traduzem.
 */
export interface CreditEntry {
  name: string;
  author: string;
  license: string;
  url: string;
}

export const thirdPartyCredits: CreditEntry[] = [
  {
    name: 'Adwaita Sans · Adwaita Mono',
    author: 'The GNOME Project',
    license: 'SIL OFL 1.1',
    url: 'https://gitlab.gnome.org/GNOME/adwaita-fonts',
  },
  {
    name: 'Phosphor Icons',
    author: 'Helena Zhang, Tobias Fried',
    license: 'MIT',
    url: 'https://phosphoricons.com',
  },
  {
    name: 'SQLite',
    author: 'D. Richard Hipp',
    license: 'Public domain',
    url: 'https://sqlite.org',
  },
  {
    name: 'CodeMirror 6',
    author: 'Marijn Haverbeke',
    license: 'MIT',
    url: 'https://codemirror.net',
  },
  {
    name: 'React · Vite',
    author: 'Meta · VoidZero',
    license: 'MIT',
    url: 'https://react.dev',
  },
  {
    name: 'Zustand',
    author: 'Poimandres',
    license: 'MIT',
    url: 'https://zustand.docs.pmnd.rs',
  },
  {
    name: 'Framer Motion',
    author: 'Framer',
    license: 'MIT',
    url: 'https://motion.dev',
  },
  {
    name: 'TanStack Virtual',
    author: 'Tanner Linsley',
    license: 'MIT',
    url: 'https://tanstack.com/virtual',
  },
  {
    name: 'Tailwind CSS',
    author: 'Tailwind Labs',
    license: 'MIT',
    url: 'https://tailwindcss.com',
  },
  {
    name: 'DOMPurify',
    author: 'Cure53',
    license: 'Apache 2.0 / MPL 2.0',
    url: 'https://github.com/cure53/DOMPurify',
  },
  {
    name: 'marked',
    author: 'Christopher Jeffrey',
    license: 'MIT',
    url: 'https://marked.js.org',
  },
  {
    name: 'Zod',
    author: 'Colin McDonnell',
    license: 'MIT',
    url: 'https://zod.dev',
  },
  {
    name: 'yaml',
    author: 'Eemeli Aro',
    license: 'ISC',
    url: 'https://eemeli.org/yaml',
  },
  {
    name: 'fflate',
    author: 'Arjun Barrett',
    license: 'MIT',
    url: 'https://github.com/101arrowz/fflate',
  },
];
