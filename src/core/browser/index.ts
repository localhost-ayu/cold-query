/**
 * Endereços do Navegador do TraceOS. Só existem páginas internas `.example`
 * que vêm dos casos; nada sai para a internet.
 */

/** "https://Intranet.Vantara.example/politica-acesso/" → "intranet.vantara.example/politica-acesso". */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim().replace(/^[a-z]+:\/\//i, '');
  const [host, ...path] = trimmed.split('/');
  const cleanPath = path.join('/').replace(/\/+$/, '');
  return cleanPath ? `${host.toLowerCase()}/${cleanPath}` : host.toLowerCase();
}

export function isInternalUrl(url: string): boolean {
  return /^[\w-]+(\.[\w-]+)*\.example(\/|$)/.test(normalizeUrl(url));
}

/** Resolve o href de um link a partir da página atual (relativo, absoluto ou com /). */
export function resolveLink(current: string, href: string): string {
  if (
    /^[a-z]+:\/\//i.test(href) ||
    /^[\w-]+(\.[\w-]+)*\.example(\/|$)/.test(href)
  )
    return normalizeUrl(href);
  const host = normalizeUrl(current).split('/')[0];
  if (href.startsWith('/')) return normalizeUrl(`${host}${href}`);
  const base = normalizeUrl(current).split('/');
  // Link relativo troca o último pedaço do caminho (ou acrescenta, na raiz).
  const directory = base.length > 1 ? base.slice(0, -1) : base;
  return normalizeUrl([...directory, href].join('/'));
}
