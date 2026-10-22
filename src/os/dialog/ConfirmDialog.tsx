import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Ação destrutiva fica vermelha, como no AdwAlertDialog. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Pergunta de confirmação no estilo do GNOME. Usa o <dialog> nativo: o
 * navegador prende o foco dentro dele e fecha com Esc.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="adw-dialog adw-dialog--alert"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={() => open && onCancel()}
    >
      <div className="alert">
        <h2 id={titleId}>{title}</h2>
        <p id={bodyId}>{body}</p>
      </div>
      <div className="alert__actions">
        <button type="button" className="pill-button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`pill-button ${destructive ? 'pill-button--destructive' : 'pill-button--suggested'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
