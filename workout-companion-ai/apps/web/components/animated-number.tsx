'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Rolling counter: anima il numero contenuto in `value` fino al valore finale
 * (es. "48", "€4.250", "87%"), preservando prefisso/suffisso e formato it-IT.
 *
 * Sistema "Glass Over Iron": vale La Regola delle Cifre Ferme — il numero
 * scorre in cifre tabulari, così la larghezza non balla mentre conta.
 * Il movimento è in uscita a molla, mai lineare, e si spegne del tutto quando
 * il sistema chiede meno movimento (prefers-reduced-motion).
 */
export function AnimatedNumber({ value, duration = 900 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number | undefined>(undefined);
  /** Da dove riparte il conteggio: 0 al primo montaggio, poi l'ultimo valore raggiunto. */
  const from = useRef(0);

  useEffect(() => {
    const match = value.match(/-?[\d.]{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+/);
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!match) {
      setDisplay(value);
      return;
    }

    const raw = match[0];
    const target = Number(raw.replace(/\./g, '').replace(',', '.'));
    if (!isFinite(target)) {
      setDisplay(value);
      return;
    }

    const start = from.current;
    from.current = target;

    // Niente animazione: nessun movimento richiesto, durata nulla o valore fermo.
    if (reduced || duration <= 0 || start === target) {
      setDisplay(value);
      return;
    }

    const decimals = raw.includes(',') ? raw.split(',')[1].length : 0;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + raw.length);
    const t0 = performance.now();

    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // uscita morbida, mai lineare
      const current = start + (target - start) * eased;
      setDisplay(
        prefix +
          current.toLocaleString('it-IT', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix
      );
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value); // l'arrivo è sempre il testo esatto, non la sua ricostruzione
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  // Cifre tabulari: il numero conta senza cambiare larghezza (La Regola delle Cifre Ferme).
  return <span className="tnum tabular-nums">{display}</span>;
}
