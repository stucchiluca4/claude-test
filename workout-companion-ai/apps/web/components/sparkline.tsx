/**
 * Mini-grafico a linea (SVG puro, renderizzato sul server).
 *
 * Sistema "Glass Over Iron": è contenuto, quindi vive sempre su FERRO opaco.
 * La linea porta il segnale del dato (ciano = corpo, per default), il velo
 * sotto la curva è lo stesso colore molto diluito, e i punti compaiono solo
 * agli estremi: l'inizio in cavo, la fine piena con un alone leggero.
 */
export function Sparkline({
  values,
  color = '#64D2FF',
  width = 120,
  height = 32,
  className,
  ariaLabel,
}: {
  values: number[];
  /** Segnale del dato: ciano corpo · menta fatto · ambra sforzo · rosa record · viola AI. */
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  /** Se presente, il grafico viene descritto a voce invece di essere ignorato. */
  ariaLabel?: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const flat = max === min;
  const range = flat ? 1 : max - min;

  // Margini interni: la linea non tocca mai il bordo e i punti non vengono tagliati.
  const padX = 4;
  const padY = 5;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = innerW / (values.length - 1);

  const px = (i: number) => padX + i * step;
  const py = (v: number) => (flat ? padY + innerH / 2 : padY + innerH - ((v - min) / range) * innerH);

  const coords = values.map((v, i) => [px(i), py(v)] as const);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area =
    `M${coords[0][0].toFixed(1)},${(height - 0.5).toFixed(1)} ` +
    coords.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L${coords[coords.length - 1][0].toFixed(1)},${(height - 0.5).toFixed(1)} Z`;

  const [firstX, firstY] = coords[0];
  const [lastX, lastY] = coords[coords.length - 1];
  // Un gradiente per colore: condiviso fra istanze, stabile fra server e client.
  const gid = `spark-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className ? `block ${className}` : 'block'}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base: la linea del ferro, per dare un appoggio alla curva */}
      <line
        x1="0"
        y1={height - 0.5}
        x2={width}
        y2={height - 0.5}
        stroke="#2A3241"
        strokeWidth="1"
      />

      <path d={area} fill={`url(#${gid})`} />

      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Punti solo agli estremi: da dove si parte, dove si è arrivati */}
      <circle cx={firstX} cy={firstY} r="2" fill="#151A24" stroke={color} strokeWidth="1.5" />
      <circle cx={lastX} cy={lastY} r="5" fill={color} opacity="0.18" />
      <circle cx={lastX} cy={lastY} r="2.6" fill={color} />
    </svg>
  );
}
