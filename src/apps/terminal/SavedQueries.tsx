import { BookmarkSimple, PencilSimple, Trash } from '@phosphor-icons/react';
import { useId, useState, type FormEvent } from 'react';

import { useT } from '@/os/i18n';
import { SAVED_NAME_LIMIT, type SavedQuery } from '@/store/terminal-store';

interface SavedQueriesProps {
  saved: SavedQuery[];
  /** Há texto no editor para salvar? */
  canSave: boolean;
  onSave: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onPick: (entry: SavedQuery) => void;
}

/** Campo de nome que aparece no lugar, para salvar ou renomear. Enter confirma, Esc desiste. */
function NameField({
  initial,
  label,
  onDone,
}: {
  initial: string;
  label: string;
  onDone: (name: string | null) => void;
}) {
  const t = useT();
  const id = useId();
  const [name, setName] = useState(initial);

  function submit(event: FormEvent) {
    event.preventDefault();
    onDone(name.trim() ? name : null);
  }

  return (
    <form className="saved__form" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        className="saved__input"
        value={name}
        maxLength={SAVED_NAME_LIMIT}
        placeholder={t('terminal.savedNamePlaceholder')}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- o campo aparece por pedido do jogador
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          onDone(null);
        }}
      />
    </form>
  );
}

/**
 * Consultas que o jogador guardou com nome, para reabrir e editar. Úteis para
 * CTEs longas, que ninguém quer digitar de novo.
 */
export function SavedQueries({
  saved,
  canSave,
  onSave,
  onRename,
  onDelete,
  onPick,
}: SavedQueriesProps) {
  const t = useT();
  const [naming, setNaming] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <div className="saved">
      {naming ? (
        <NameField
          initial=""
          label={t('terminal.savedName')}
          onDone={(name) => {
            if (name) onSave(name);
            setNaming(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="pill-button pill-button--small saved__add"
          disabled={!canSave}
          onClick={() => setNaming(true)}
        >
          <BookmarkSimple weight="bold" aria-hidden />
          {t('terminal.saveCurrent')}
        </button>
      )}

      {saved.length === 0 ? (
        <p className="sidebar-panel__empty">
          <BookmarkSimple aria-hidden />
          {t('terminal.savedEmpty')}
        </p>
      ) : (
        <ul className="saved__list">
          {saved.map((entry) => (
            <li key={entry.id} className="saved__item">
              {renaming === entry.id ? (
                <NameField
                  initial={entry.name}
                  label={t('terminal.savedRename', { name: entry.name })}
                  onDone={(name) => {
                    if (name) onRename(entry.id, name);
                    setRenaming(null);
                  }}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="saved__entry"
                    title={entry.sql}
                    onClick={() => onPick(entry)}
                  >
                    <span className="saved__name">{entry.name}</span>
                    <code>{entry.sql}</code>
                  </button>
                  <span className="saved__actions">
                    <button
                      type="button"
                      className="flat-button flat-button--icon"
                      aria-label={t('terminal.savedRename', {
                        name: entry.name,
                      })}
                      title={t('terminal.savedRename', { name: entry.name })}
                      onClick={() => setRenaming(entry.id)}
                    >
                      <PencilSimple aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="flat-button flat-button--icon"
                      aria-label={t('terminal.savedDelete', {
                        name: entry.name,
                      })}
                      title={t('terminal.savedDelete', { name: entry.name })}
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash aria-hidden />
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
