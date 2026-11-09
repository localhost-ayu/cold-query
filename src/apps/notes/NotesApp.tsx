import { Notebook } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import {
  caseById,
  gameStore,
  localized,
  useGameState,
} from '@/apps/shared/game';
import { sanitizeCaseHtml } from '@/apps/shared/sanitize';
import { useLocale, useT } from '@/os/i18n';
import { WindowHeaderItems } from '@/os/windows/header-slots';

/** Caderno sem caso, para o que não pertence a contrato nenhum. */
export const GENERAL_NOTES = 'general';

type Mode = 'edit' | 'preview';

/** Markdown → HTML só quando a prévia abre: o marked fica fora do pacote inicial. */
function usePreview(text: string, active: boolean): string | null {
  const [html, setHtml] = useState<{ text: string; html: string } | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void import('marked').then(({ marked }) => {
      const rendered = marked.parse(text, { async: false }) as string;
      if (!cancelled) setHtml({ text, html: sanitizeCaseHtml(rendered) });
    });
    return () => {
      cancelled = true;
    };
  }, [text, active]);
  return html && html.text === text ? html.html : null;
}

export function NotesApp() {
  const t = useT();
  const locale = useLocale();
  const cases = useGameState((state) => state.cases);
  const notes = useGameState((state) => state.notes);
  const accepted = Object.entries(cases)
    .filter(([, progress]) => progress.status !== 'available')
    .map(([id]) => id)
    .sort();
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  // Sem escolha do jogador, abre o caso mais recente (ou o caderno geral).
  const notebook = picked ?? accepted.at(-1) ?? GENERAL_NOTES;
  const text = notes[notebook] ?? '';
  const preview = usePreview(text, mode === 'preview');

  const label = (id: string) =>
    id === GENERAL_NOTES
      ? t('notes.general')
      : (() => {
          const bundle = caseById.get(id);
          return bundle
            ? `${bundle.manifest.id} · ${localized(bundle.manifest.title, locale)}`
            : id;
        })();

  return (
    <div className="notes">
      <WindowHeaderItems side="start">
        <select
          className="dropdown"
          aria-label={t('notes.notebook')}
          value={notebook}
          onChange={(event) => setPicked(event.target.value)}
        >
          {[...accepted, GENERAL_NOTES].map((id) => (
            <option key={id} value={id}>
              {label(id)}
            </option>
          ))}
        </select>
      </WindowHeaderItems>
      <WindowHeaderItems side="end">
        <div className="segmented" role="tablist" aria-label={t('notes.mode')}>
          {(['edit', 'preview'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
            >
              {t(`notes.${value}`)}
            </button>
          ))}
        </div>
      </WindowHeaderItems>

      {mode === 'edit' ? (
        <textarea
          className="notes__editor"
          aria-label={t('notes.editorLabel', { notebook: label(notebook) })}
          placeholder={t('notes.placeholder')}
          value={text}
          spellCheck
          onChange={(event) =>
            gameStore.getState().setNote(notebook, event.target.value)
          }
        />
      ) : text.trim() === '' ? (
        <div className="status-page status-page--inline">
          <Notebook
            weight="duotone"
            className="status-page__glyph"
            aria-hidden
          />
          <h3>{t('notes.emptyTitle')}</h3>
          <p>{t('notes.emptyBody')}</p>
        </div>
      ) : (
        <article
          className="notes__preview message__body"
          tabIndex={0}
          role="region"
          aria-label={label(notebook)}
          // O HTML da prévia passa pelo DOMPurify (sanitizeCaseHtml).
          dangerouslySetInnerHTML={{ __html: preview ?? '' }}
        />
      )}
    </div>
  );
}
