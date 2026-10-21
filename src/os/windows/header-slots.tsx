import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface HeaderSlots {
  start: HTMLElement | null;
  end: HTMLElement | null;
}

export const HeaderSlotsContext = createContext<HeaderSlots>({
  start: null,
  end: null,
});

/**
 * Põe botões do app na header bar da janela, como os apps GNOME fazem.
 * createPortal renderiza os filhos em outro nó do DOM (o encaixe da barra)
 * sem tirá-los da árvore React do app: estado e contexto continuam iguais.
 */
export function WindowHeaderItems({
  side,
  children,
}: {
  side: keyof HeaderSlots;
  children: ReactNode;
}) {
  const target = useContext(HeaderSlotsContext)[side];
  return target ? createPortal(children, target) : null;
}
