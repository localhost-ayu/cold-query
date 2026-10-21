import { Copy, Minus, Square, X } from '@phosphor-icons/react';
import { m } from 'framer-motion';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { play } from '@/os/audio';
import { useT } from '@/os/i18n';
import { motionTokens } from '@/os/motion';
import type { OverviewSlot } from '@/os/overview/layout';
import { shellStore } from '@/store/shell-store';
import {
  type Bounds,
  type TraceWindow,
  windowStore,
} from '@/store/window-store';

import { HeaderSlotsContext } from './header-slots';

interface FloatingWindowProps {
  window: TraceWindow;
  active: boolean;
  /** No overview: para onde a janela encolhe. null fora do overview. */
  overviewSlot: OverviewSlot | null;
  /** Some de cena (busca das Atividades com texto). */
  hidden: boolean;
  children: ReactNode;
}

const resizeDirections = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'] as const;
type ResizeDirection = (typeof resizeDirections)[number];

/** Distância mínima para um clique na barra de título virar arrasto. */
const DRAG_THRESHOLD = 4;
/** Soltar a janela a esta distância da borda da tela encaixa ou maximiza. */
const EDGE = 16;

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function FloatingWindow({
  window: item,
  active,
  overviewSlot,
  hidden,
  children,
}: FloatingWindowProps) {
  const t = useT();
  const titleId = useId();
  // Nós da header bar onde o app pode pôr botões (ver header-slots.tsx).
  const [headerStart, setHeaderStart] = useState<HTMLElement | null>(null);
  const [headerEnd, setHeaderEnd] = useState<HTMLElement | null>(null);
  const slots = useMemo(
    () => ({ start: headerStart, end: headerEnd }),
    [headerStart, headerEnd],
  );
  const inOverview = overviewSlot !== null;
  const drag = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const actions = windowStore.getState();

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      inOverview ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest('button, select, input')
    )
      return;
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: item.x,
      y: item.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.pointerX;
    const dy = event.clientY - state.pointerY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!state.moved && item.maximized) {
      // Puxar uma janela maximizada a restaura sob o cursor.
      actions.toggleMaximize(item.id, viewport());
      const restored = windowStore
        .getState()
        .windows.find((w) => w.id === item.id);
      if (restored) {
        state.x = event.clientX - restored.width / 2;
        state.y = event.clientY - 18;
        state.pointerX = event.clientX;
        state.pointerY = event.clientY;
      }
    }
    state.moved = true;
    actions.moveWindow(
      item.id,
      state.x + event.clientX - state.pointerX,
      state.y + event.clientY - state.pointerY,
      viewport(),
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved) return;
    if (event.clientY <= EDGE + 34) actions.toggleMaximize(item.id, viewport());
    else if (event.clientX <= EDGE)
      actions.snapWindow(item.id, 'left', viewport());
    else if (event.clientX >= window.innerWidth - EDGE)
      actions.snapWindow(item.id, 'right', viewport());
  }

  function startResize(
    event: ReactPointerEvent<HTMLDivElement>,
    direction: ResizeDirection,
  ) {
    if (event.button !== 0) return;
    event.stopPropagation();
    actions.focusWindow(item.id);
    const start = {
      x: event.clientX,
      y: event.clientY,
      bounds: { x: item.x, y: item.y, width: item.width, height: item.height },
    };
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;
      const next: Bounds = { ...start.bounds };
      if (direction.includes('e')) next.width += dx;
      if (direction.includes('s')) next.height += dy;
      if (direction.includes('w')) {
        next.x += dx;
        next.width -= dx;
      }
      if (direction.includes('n')) {
        next.y += dy;
        next.height -= dy;
      }
      actions.resizeWindow(item.id, next, viewport());
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

  return (
    <m.section
      className="window"
      data-active={active || undefined}
      data-maximized={item.maximized || undefined}
      data-overview={inOverview || undefined}
      aria-labelledby={titleId}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
        // A escala do overview parte do canto superior esquerdo, como no cálculo da grade.
        transformOrigin: '0 0',
        // Inverso da escala: o CSS usa para o rótulo e o contorno não encolherem junto.
        ['--unscale' as string]: overviewSlot ? 1 / overviewSlot.scale : 1,
      }}
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={
        overviewSlot
          ? {
              opacity: hidden ? 0 : 1,
              x: overviewSlot.x - item.x,
              y: overviewSlot.y - item.y,
              scale: overviewSlot.scale,
              transition: motionTokens.spatial,
            }
          : {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              transition: motionTokens.enter,
            }
      }
      exit={{ opacity: 0, scale: 0.97, transition: motionTokens.exit }}
      onPointerDownCapture={() => !inOverview && actions.focusWindow(item.id)}
      onFocusCapture={() => !inOverview && actions.focusWindow(item.id)}
    >
      {inOverview ? (
        // No overview a janela inteira vira um botão: escolhe e volta ao desktop.
        <button
          type="button"
          className="window__picker"
          tabIndex={hidden ? -1 : 0}
          aria-label={t(`app.${item.id}`)}
          onClick={() => {
            actions.focusWindow(item.id);
            shellStore.getState().setOverview(false);
          }}
        >
          <span className="window__picker-label">{t(`app.${item.id}`)}</span>
        </button>
      ) : null}
      <div
        className="window__titlebar"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest('button'))
            actions.toggleMaximize(item.id, viewport());
        }}
      >
        <div className="window__header-start" ref={setHeaderStart} />
        <h2 className="window__title" id={titleId}>
          {t(`app.${item.id}`)}
        </h2>
        <div className="window__header-end">
          <div className="window__header-slot" ref={setHeaderEnd} />
          <div className="window__controls">
            <button
              type="button"
              aria-label={t('window.minimize')}
              title={t('window.minimize')}
              onClick={() => {
                actions.minimizeWindow(item.id);
                play('minimize');
              }}
            >
              <Minus aria-hidden weight="bold" />
            </button>
            <button
              type="button"
              aria-label={t(
                item.maximized ? 'window.restore' : 'window.maximize',
              )}
              title={t(item.maximized ? 'window.restore' : 'window.maximize')}
              onClick={() => {
                actions.toggleMaximize(item.id, viewport());
                play('click');
              }}
            >
              {item.maximized ? (
                <Copy aria-hidden weight="bold" />
              ) : (
                <Square aria-hidden weight="bold" />
              )}
            </button>
            <button
              type="button"
              className="window__close"
              aria-label={t('window.close')}
              title={t('window.close')}
              onClick={() => {
                actions.closeWindow(item.id);
                play('close');
              }}
            >
              <X aria-hidden weight="bold" />
            </button>
          </div>
        </div>
      </div>
      <HeaderSlotsContext.Provider value={slots}>
        {/* inert: no overview o conteúdo não recebe foco nem clique. */}
        <div className="window__content" inert={inOverview}>
          {children}
        </div>
      </HeaderSlotsContext.Provider>
      {/* Alças só de mouse; pelo teclado, Super+setas encaixa e maximiza. */}
      {item.maximized || inOverview
        ? null
        : resizeDirections.map((direction) => (
            <div
              key={direction}
              className={`resize-handle resize-handle--${direction}`}
              aria-hidden
              onPointerDown={(event) => startResize(event, direction)}
            />
          ))}
    </m.section>
  );
}
