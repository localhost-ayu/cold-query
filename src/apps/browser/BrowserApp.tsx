import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Compass,
  House,
  LockSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { useMemo, useRef, useState, type FormEvent } from 'react';

import {
  caseById,
  gameStore,
  sitesFor,
  useGameState,
  type SiteEntry,
} from '@/apps/shared/game';
import { sanitizeCaseHtml } from '@/apps/shared/sanitize';
import sansBold from '@/assets/fonts/adwaita-sans-latin-700-normal.woff2';
import sansRegular from '@/assets/fonts/adwaita-sans-latin-400-normal.woff2';
import { isInternalUrl, normalizeUrl, resolveLink } from '@/core/browser';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { useResolvedTheme } from '@/os/theme/useResolvedTheme';
import { WindowHeaderItems } from '@/os/windows/header-slots';
import { START_PAGE, browserStore, useBrowser } from '@/store/browser-store';

/** Cores da página dentro do iframe, por tema (o iframe não herda o CSS do jogo). */
const pageColors = {
  light: {
    bg: '#ffffff',
    text: '#2e2e33',
    muted: '#5e5c64',
    accent: '#1c71d8',
    mark: 'rgb(28 113 216 / 8%)',
  },
  dark: {
    bg: '#1d1d20',
    text: '#f6f5f4',
    muted: '#c0bfbc',
    accent: '#99c1f1',
    mark: 'rgb(153 193 241 / 10%)',
  },
};

/**
 * Documento completo da página para o srcdoc do iframe. O HTML do caso já
 * passou pelo DOMPurify; o iframe ainda roda sem permissão de script.
 */
function pageDocument(
  site: SiteEntry['site'],
  theme: 'light' | 'dark',
  pinLabel: string,
) {
  const c = pageColors[theme];
  return `<!doctype html><html lang="${site.locale}"><head><meta charset="utf-8"><style>
@font-face{font-family:'Adwaita Sans';src:url('${sansRegular}') format('woff2');font-weight:400}
@font-face{font-family:'Adwaita Sans';src:url('${sansBold}') format('woff2');font-weight:700}
html{color-scheme:${theme}}
body{margin:0;padding:32px 28px 56px;background:${c.bg};color:${c.text};font:15px/1.65 'Adwaita Sans',system-ui,sans-serif}
main{max-width:680px;margin:0 auto}
h1{font-size:26px;line-height:1.25;margin:0 0 12px}
h2{font-size:19px;margin:28px 0 8px}
a{color:${c.accent}}
ul{padding-left:22px}
p[data-anchor]{position:relative;margin:0 -12px 14px;padding:8px 12px;border-radius:10px;transition:background-color .14s}
p[data-anchor]:hover,p[data-anchor]:focus-within{background:${c.mark}}
.pin{display:inline-flex;align-items:center;gap:4px;margin-left:8px;padding:2px 10px;border:0;border-radius:999px;background:${c.mark};color:${c.accent};font:600 12px 'Adwaita Sans',system-ui,sans-serif;cursor:pointer;vertical-align:1px}
.pin:hover{filter:brightness(1.2)}
.pin:focus-visible{outline:2px solid ${c.accent};outline-offset:2px}
</style></head><body><main data-pin-label="${pinLabel}">${sanitizeCaseHtml(site.html)}</main></body></html>`;
}

function StartPage({
  sites,
  onOpen,
}: {
  sites: SiteEntry[];
  onOpen: (url: string) => void;
}) {
  const t = useT();
  if (sites.length === 0) {
    return (
      <div className="status-page">
        <Compass weight="duotone" className="status-page__glyph" aria-hidden />
        <h2>{t('browser.emptyTitle')}</h2>
        <p>{t('browser.emptyBody')}</p>
      </div>
    );
  }
  return (
    <div className="browser-start">
      <h2>{t('browser.bookmarks')}</h2>
      <ul className="browser-start__grid">
        {sites.map(({ caseId, site }) => (
          <li key={`${caseId}-${site.id}`}>
            <button
              type="button"
              className="browser-start__card"
              onClick={() => onOpen(site.url)}
            >
              <span className="browser-start__title">{site.title}</span>
              <span className="browser-start__url">{site.url}</span>
              <span className="browser-start__client">
                {caseById.get(caseId)?.manifest.client}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotFound({ url }: { url: string }) {
  const t = useT();
  return (
    <div className="status-page">
      <WarningCircle
        weight="duotone"
        className="status-page__glyph"
        aria-hidden
      />
      <h2>{t('browser.notFoundTitle')}</h2>
      <p>
        {t(
          isInternalUrl(url) ? 'browser.notFoundBody' : 'browser.externalBody',
          { url },
        )}
      </p>
    </div>
  );
}

/** Navegador no estilo do GNOME Web, restrito às intranets dos casos. */
export function BrowserApp() {
  const t = useT();
  const locale = useLocale();
  const theme = useResolvedTheme();
  const entries = useBrowser((state) => state.entries);
  const index = useBrowser((state) => state.index);
  const cases = useGameState((state) => state.cases);
  const current = entries[index];
  const [typed, setTyped] = useState<{ for: string; text: string } | null>(
    null,
  );
  const [pinned, setPinned] = useState(false);
  const pinnedTimer = useRef<number | undefined>(undefined);

  // Chave estável dos casos aceitos: a lista de sites só muda quando ela muda.
  const acceptedKey = Object.entries(cases)
    .filter(([, progress]) => progress.status !== 'available')
    .map(([id]) => id)
    .sort()
    .join(',');
  const sites = useMemo(
    () => sitesFor(acceptedKey ? acceptedKey.split(',') : [], locale),
    [acceptedKey, locale],
  );
  const page =
    current === START_PAGE
      ? null
      : sites.find(({ site }) => normalizeUrl(site.url) === current);
  const canPin = page ? cases[page.caseId]?.status === 'active' : false;

  const address =
    typed?.for === current ? typed.text : current === START_PAGE ? '' : current;
  const { navigate, back, forward, home } = browserStore.getState();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (address.trim()) navigate(address);
    setTyped(null);
  }

  /**
   * Liga a página: links internos navegam aqui dentro, e cada parágrafo com
   * âncora ganha um botão de fixar. O iframe tem allow-same-origin (sem
   * allow-scripts), então a página não roda código, mas o jogo alcança o DOM dela.
   */
  function wire(frame: HTMLIFrameElement) {
    const doc = frame.contentDocument;
    if (!doc || !page) return;
    const label = doc.querySelector('main')?.dataset.pinLabel ?? '';
    const texts = new Map<string, string>();
    for (const paragraph of doc.querySelectorAll<HTMLElement>(
      '[data-anchor]',
    )) {
      const anchor = paragraph.dataset.anchor!;
      texts.set(anchor, paragraph.textContent?.trim() ?? '');
      if (!canPin) continue;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'pin';
      button.dataset.pin = anchor;
      button.textContent = `📌 ${label}`;
      paragraph.append(button);
    }
    // Com o foco dentro da página, as teclas não chegam à janela do jogo:
    // repassa para que Super, Alt+F1 e Alt+Tab continuem funcionando.
    for (const type of ['keydown', 'keyup'] as const) {
      doc.addEventListener(type, (event) => {
        window.dispatchEvent(new KeyboardEvent(type, event));
      });
    }
    doc.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const pin = target.closest<HTMLElement>('button[data-pin]');
      if (pin) {
        const anchor = pin.dataset.pin!;
        const outcome = gameStore.getState().pinEvidence({
          caseId: page.caseId,
          source: 'site',
          pageId: page.site.id,
          anchor,
          columns: ['url', 'trecho'],
          rows: [[page.site.url, texts.get(anchor) ?? '']],
        });
        if (outcome.ok) {
          play('click');
          setPinned(true);
          window.clearTimeout(pinnedTimer.current);
          pinnedTimer.current = window.setTimeout(() => setPinned(false), 2500);
        }
        return;
      }
      const link = target.closest<HTMLAnchorElement>('a[href]');
      if (link) {
        event.preventDefault();
        navigate(resolveLink(page.site.url, link.getAttribute('href') ?? ''));
      }
    });
  }

  return (
    <div className="browser">
      <WindowHeaderItems side="start">
        <button
          type="button"
          className="flat-button flat-button--icon"
          aria-label={t('browser.back')}
          title={t('browser.back')}
          disabled={index === 0}
          onClick={back}
        >
          <ArrowLeft weight="bold" aria-hidden />
        </button>
        <button
          type="button"
          className="flat-button flat-button--icon"
          aria-label={t('browser.forward')}
          title={t('browser.forward')}
          disabled={index >= entries.length - 1}
          onClick={forward}
        >
          <ArrowRight weight="bold" aria-hidden />
        </button>
        <button
          type="button"
          className="flat-button flat-button--icon"
          aria-label={t('browser.home')}
          title={t('browser.home')}
          onClick={home}
        >
          <House weight="bold" aria-hidden />
        </button>
      </WindowHeaderItems>

      <form className="browser__bar" onSubmit={submit}>
        <LockSimple weight="bold" aria-hidden className="browser__lock" />
        <input
          type="text"
          inputMode="url"
          spellCheck={false}
          aria-label={t('browser.address')}
          placeholder={t('browser.addressPlaceholder')}
          value={address}
          onChange={(event) =>
            setTyped({ for: current, text: event.target.value })
          }
          onFocus={(event) => event.target.select()}
        />
      </form>

      <div className="browser__view">
        {current === START_PAGE ? (
          <StartPage sites={sites} onOpen={navigate} />
        ) : page ? (
          <iframe
            key={`${current}-${theme}-${locale}-${canPin}`}
            title={page.site.title}
            className="browser__frame"
            // Sem allow-scripts: nada da página executa. allow-same-origin deixa o jogo ligar os botões.
            sandbox="allow-same-origin"
            srcDoc={pageDocument(page.site, theme, t('browser.pin'))}
            onLoad={(event) => wire(event.currentTarget)}
          />
        ) : (
          <NotFound url={current} />
        )}
        {pinned ? (
          <div className="toast browser__toast" role="status">
            <CheckCircle weight="fill" aria-hidden />
            <span>{t('browser.pinned')}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
