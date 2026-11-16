import { memo } from 'react';

const WIDTH = 1600;
const HEIGHT = 1000;

/**
 * Uma faixa de ondas: começa na altura `base` à esquerda e sobe até `rise`
 * à direita, ondulando com `amplitude`. Os pontos de controle das curvas de
 * Bézier (C) ficam a um terço do caminho entre os pontos, o que suaviza a onda.
 */
function ridge(base: number, rise: number, amplitude: number, phase: number) {
  const steps = 6;
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const x = t * WIDTH;
    const y =
      base + (rise - base) * t + Math.sin(t * Math.PI * 2 + phase) * amplitude;
    return [x, y] as const;
  });
  let path = `M0 ${HEIGHT} L${points[0][0]} ${points[0][1].toFixed(1)}`;
  for (let index = 1; index < points.length; index += 1) {
    const [x0, y0] = points[index - 1];
    const [x1, y1] = points[index];
    const third = (x1 - x0) / 3;
    path += ` C${(x0 + third).toFixed(1)} ${y0.toFixed(1)} ${(x1 - third).toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return `${path} L${WIDTH} ${HEIGHT} Z`;
}

// Camadas de trás para a frente: cada uma mais baixa, mais escura e mais inclinada.
const layers = [
  { d: ridge(560, 300, 34, 0.4), fill: 'var(--wall-1)' },
  { d: ridge(680, 450, 40, 1.6), fill: 'var(--wall-2)' },
  { d: ridge(800, 600, 30, 2.7), fill: 'var(--wall-3)' },
  { d: ridge(910, 760, 22, 4.1), fill: 'var(--wall-4)' },
];

/** Papel de parede procedural do TraceOS: ondas frias sobre um degradê, nas cores do tema. */
export const Wallpaper = memo(function Wallpaper({
  className = 'wallpaper',
  idPrefix = '',
}: {
  className?: string;
  /** Um segundo papel de parede na página (a tela de bloqueio) precisa de ids próprios. */
  idPrefix?: string;
}) {
  const sky = `${idPrefix}wall-sky`;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-top)" />
          <stop offset="1" stopColor="var(--wall-bottom)" />
        </linearGradient>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${sky})`} />
      {layers.map((layer, index) => (
        <path key={index} d={layer.d} fill={layer.fill} />
      ))}
    </svg>
  );
});
