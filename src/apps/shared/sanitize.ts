import DOMPurify from 'dompurify';

/**
 * Limpa HTML vindo de um caso antes de pôr na tela. O Markdown já vira HTML no
 * build, mas caso é conteúdo de terceiros: scripts, eventos e iframes saem aqui.
 */
export function sanitizeCaseHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'iframe'],
  });
}
