import type { Bounds } from '@/store/window-store';

/** Onde uma janela vai parar no overview: posição final e escala (a partir do canto superior esquerdo). */
export interface OverviewSlot {
  x: number;
  y: number;
  scale: number;
}

/**
 * Distribui as janelas numa grade dentro de `area`, como o overview do GNOME:
 * cada janela encolhe para caber na célula (nunca cresce) e fica centrada nela.
 * A última linha, se incompleta, também fica centrada.
 */
export function layoutOverview(
  windows: Bounds[],
  area: Bounds,
  gap = 32,
): OverviewSlot[] {
  const count = windows.length;
  if (count === 0) return [];

  // A proporção da área guia a grade: área larga, mais colunas.
  const aspect = area.width / Math.max(1, area.height);
  const columns = Math.max(
    1,
    Math.min(count, Math.round(Math.sqrt(count * aspect))),
  );
  const rows = Math.ceil(count / columns);
  const cellWidth = (area.width - gap * (columns + 1)) / columns;
  const cellHeight = (area.height - gap * (rows + 1)) / rows;

  return windows.map((window, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const inRow = row === rows - 1 ? count - row * columns : columns;
    // Desloca a linha incompleta para o centro.
    const rowOffset = ((columns - inRow) * (cellWidth + gap)) / 2;

    const scale = Math.min(
      cellWidth / window.width,
      cellHeight / window.height,
      1,
    );
    const width = window.width * scale;
    const height = window.height * scale;
    const cellX = area.x + gap + column * (cellWidth + gap) + rowOffset;
    const cellY = area.y + gap + row * (cellHeight + gap);

    return {
      x: Math.round(cellX + (cellWidth - width) / 2),
      y: Math.round(cellY + (cellHeight - height) / 2),
      scale,
    };
  });
}
