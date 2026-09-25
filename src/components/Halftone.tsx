import { useMemo } from 'react';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type Props = {
  corner?: Corner;
  size?: number;
  spacing?: number;
  maxRadius?: number;
  opacity?: number;
  className?: string;
};

/** Brand halftone: dots that shrink away from a corner. Decorative only. */
export function Halftone({ corner = 'top-right', size = 260, spacing = 14, maxRadius = 4.2, opacity = 0.5, className = '' }: Props) {
  const dots = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    const ox = corner.endsWith('right') ? size : 0;
    const oy = corner.startsWith('bottom') ? size : 0;
    for (let y = spacing / 2; y < size; y += spacing) {
      for (let x = spacing / 2; x < size; x += spacing) {
        const d = Math.hypot(x - ox, y - oy) / size;
        const r = maxRadius * (1 - d * 1.05);
        if (r > 0.45) out.push([x, y, r]);
      }
    }
    return out;
  }, [corner, size, spacing, maxRadius]);

  const pos: React.CSSProperties = {
    width: size,
    height: size,
    opacity,
    ...(corner.startsWith('top') ? { top: 0 } : { bottom: 0 }),
    ...(corner.endsWith('right') ? { right: 0 } : { left: 0 }),
  };

  return (
    <svg className={`halftone ${className}`} style={pos} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        {dots.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
    </svg>
  );
}
