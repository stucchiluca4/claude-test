'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Rispetta la preferenza di sistema: il movimento non è mai obbligatorio. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Ritardo in millisecondi, per far entrare gli elementi a cascata. */
  delay?: number;
  /** Come entra: dal basso (default), in scala, o di lato. */
  variant?: 'rise' | 'pop' | 'slide';
  /** Quanto dell'elemento deve essere visibile prima di partire (0-1). */
  amount?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}

/**
 * Entrata guidata dallo SCORRIMENTO: l'elemento resta invisibile finché non
 * entra nel campo visivo, poi sale e si mette a fuoco. Una volta entrato non
 * torna indietro — lo scorrimento non deve far lampeggiare la pagina.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = 'rise',
  amount = 0.15,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: amount, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount, reduced]);

  return (
    <Tag
      ref={ref as never}
      data-shown={shown ? 'true' : 'false'}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn('reveal', `reveal-${variant}`, className)}
    >
      {children}
    </Tag>
  );
}

/**
 * Strato che si muove più lentamente dello scorrimento: dà profondità reale
 * al fondo, così il vetro sopra ha qualcosa che gli scorre sotto.
 */
export function Parallax({
  children,
  speed = 0.18,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed, reduced]);

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  );
}

/**
 * Il campo luminoso che vive DIETRO tutto: tre masse di colore che derivano
 * lentamente. Serve al vetro — senza qualcosa di vivo sotto, una superficie
 * traslucida legge come grigio piatto e il materiale sparisce.
 */
export function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="aurora-blob aurora-a" />
      <span className="aurora-blob aurora-b" />
      <span className="aurora-blob aurora-c" />
      <span className="aurora-grain" />
    </div>
  );
}
