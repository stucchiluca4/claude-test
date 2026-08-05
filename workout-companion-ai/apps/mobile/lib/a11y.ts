import { AccessibilityInfo } from 'react-native';

/**
 * Preferenza di sistema "riduci movimento".
 * Il sistema anima a molla ovunque: qui c'è l'unico interruttore che lo spegne
 * (DESIGN.md § Do's — il movimento rispetta la preferenza di sistema).
 */
let reduced = false;

AccessibilityInfo.isReduceMotionEnabled?.()
  .then((value) => {
    reduced = !!value;
  })
  .catch(() => {});

AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
  reduced = !!value;
});

/** True se l'utente ha chiesto di ridurre le animazioni. */
export function prefersReducedMotion(): boolean {
  return reduced;
}

/**
 * Config di molla che collassa in un salto immediato quando il movimento
 * è ridotto: lo stato finale è sempre lo stesso, cambia solo il tragitto.
 */
export function spring<T extends object>(config: T): T & { stiffness?: number; damping?: number } {
  if (!reduced) return config;
  return { ...config, stiffness: 1000, damping: 100 };
}
