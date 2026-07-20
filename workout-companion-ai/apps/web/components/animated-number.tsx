'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Rolling counter: anima il numero contenuto in `value` da 0 al valore finale
 * (es. "48", "€4.250", "87%"), preservando prefisso/suffisso e formato it-IT.
 * Rispetta prefers-reduced-motion.
 */
export function AnimatedNumber({ value, duration = 900 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const match = value.match(/-?[\d.]{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+/);
    if (!match || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    const raw = match[0];
    const target = Number(raw.replace(/\./g, '').replace(',', '.'));
    if (!isFinite(target)) {
      setDisplay(value);
      return;
    }
    const decimals = raw.includes(',') ? raw.split(',')[1].length : 0;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + raw.length);
    const t0 = performance.now();

    const tick = (t: number) => {
      let p = Math.min(1, (t - t0) / duration);
      p = 1 - Math.pow(1 - p, 3); // easing cubico in uscita
      const current = target * p;
      setDisplay(
        prefix +
          current.toLocaleString('it-IT', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix
      );
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <span className="tabular-nums">{display}</span>;
}
