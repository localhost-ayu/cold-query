/**
 * Durações e curvas usadas pelo framer-motion. Espelham os tokens de
 * src/styles/tokens.css: sair é mais rápido que entrar.
 */
export const motionTokens = {
  enter: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
  exit: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  /** Mudanças de lugar (overview): mais longas, para o olho acompanhar. */
  spatial: { duration: 0.36, ease: [0.2, 0.8, 0.2, 1] },
} as const;
