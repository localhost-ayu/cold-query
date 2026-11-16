import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

interface ShellPopoverProps {
  open: boolean;
  onClose: () => void;
  /** Botão que abriu o menu: cliques nele não contam como "fora". */
  anchor: RefObject<HTMLElement | null>;
  label: string;
  align: 'center' | 'end';
  className?: string;
  children: ReactNode;
}

/**
 * Menu que desce da barra superior, como os do GNOME Shell. Fecha com Esc ou
 * clique fora; ao fechar com Esc, o foco volta para o botão que o abriu.
 */
export function ShellPopover({
  open,
  onClose,
  anchor,
  label,
  align,
  className,
  children,
}: ShellPopoverProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Leva o foco para dentro do menu, para o teclado já navegar por ele.
    panel.current
      ?.querySelector<HTMLElement>('button, [href], input, select')
      ?.focus();

    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target))
        return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Marca o Esc como usado, para quem escuta depois não fechar mais nada.
      event.preventDefault();
      onClose();
      anchor.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;
  return (
    <div
      ref={panel}
      className={`shell-popover shell-popover--${align} ${className ?? ''}`}
      role="dialog"
      aria-label={label}
    >
      {children}
    </div>
  );
}
