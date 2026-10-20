'use client';

import { CornersIn, CornersOut, Minus, X } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import {
  useId,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { play } from '@/os/audio';
import { useT } from '@/os/i18n';
import { motionTokens } from '@/os/motion';
import {
  type Bounds,
  type TraceWindow,
  windowStore,
} from '@/store/window-store';

interface FloatingWindowProps {
  window: TraceWindow;
  active: boolean;
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
  children,
}: FloatingWindowProps) {
  const t = useT();
  const titleId = useId();
  const drag = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const actions = windowStore.getState();

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button'))
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
    <motion.section
      className="window"
      data-active={active || undefined}
      data-maximized={item.maximized || undefined}
      aria-labelledby={titleId}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: motionTokens.enter }}
      exit={{ opacity: 0, scale: 0.97, transition: motionTokens.exit }}
      onPointerDownCapture={() => actions.focusWindow(item.id)}
      onFocusCapture={() => actions.focusWindow(item.id)}
    >
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
        <h2 className="window__title" id={titleId}>
          {t(`app.${item.id}`)}
        </h2>
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
            <Minus aria-hidden />
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
              <CornersIn aria-hidden />
            ) : (
              <CornersOut aria-hidden />
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
            <X aria-hidden />
          </button>
        </div>
      </div>
      <div className="window__content">{children}</div>
      {/* Alças só de mouse; pelo teclado, Super+setas encaixa e maximiza. */}
      {item.maximized
        ? null
        : resizeDirections.map((direction) => (
            <div
              key={direction}
              className={`resize-handle resize-handle--${direction}`}
              aria-hidden
              onPointerDown={(event) => startResize(event, direction)}
            />
          ))}
    </motion.section>
  );
}
