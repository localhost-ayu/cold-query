import { useEffect, useRef, useState } from 'react';

import { useShell } from '@/store/shell-store';

import { Dash } from './Dash';

/** Tempo com o ponteiro na borda antes de mostrar, para não abrir por acidente. */
const REVEAL_DELAY = 120;
/** Tempo depois que o ponteiro sai antes de esconder. */
const HIDE_DELAY = 450;

/**
 * Dock que se esconde, como a extensão Dash to Dock: aparece quando o ponteiro
 * encosta na borda de baixo ou quando o teclado chega nele (Tab), e volta a se
 * esconder quando os dois saem. Nas Atividades ele some, porque o overview tem
 * o próprio dash.
 */
export function AutoHideDock() {
  const overviewOpen = useShell((state) => state.overviewOpen);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const wanted = (hovered || focused) && !overviewOpen;

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setVisible(wanted),
      wanted ? REVEAL_DELAY : HIDE_DELAY,
    );
    return () => window.clearTimeout(timer.current);
  }, [wanted]);

  return (
    <div
      className="dock-region"
      data-visible={(visible && !overviewOpen) || undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setFocused(false);
      }}
    >
      {/* Faixa invisível na borda: é nela que o ponteiro "puxa" o dock. */}
      <div className="dock-region__edge" aria-hidden />
      <Dash className="dash dash--dock" minimizeFocused />
    </div>
  );
}
