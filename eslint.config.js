import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['scripts/**', 'tools/**', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.worker } },
    rules: {
      // Regiões roláveis (a tabela de resultados) precisam de foco para rolar pelo teclado.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { roles: ['tabpanel', 'table', 'region'] },
      ],
    },
  },
);
