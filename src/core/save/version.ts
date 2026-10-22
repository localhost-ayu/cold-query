/** Versão atual do formato de save. Fica num módulo à parte para não puxar o zod. */
export const CURRENT_SAVE_VERSION = 1 as const;
/** Teto para arquivos importados. Um save real fica em dezenas de KB. */
export const MAX_SAVE_BYTES = 5 * 1024 * 1024;
