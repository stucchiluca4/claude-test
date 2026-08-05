import { Platform, StyleSheet, type TextStyle } from 'react-native';
import { COLORS } from '@wc/shared';

/**
 * Token del sistema "Glass Over Iron" (DESIGN.md).
 * Il FERRO è opaco e porta il contenuto; il VETRO è traslucido e porta solo i
 * controlli. Qui vivono scala, forma, materia e movimento.
 */
export const colors = COLORS;

/** Ritmo verticale su scala 4. Sopra un'intestazione c'è più spazio che sotto. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/** Raggi concentrici: un contenitore contiene sempre forme meno curve. */
export const radius = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 26,
  xl: 34,
  pill: 999,
} as const;

/**
 * Raggio interno = raggio esterno − padding: le curve restano parallele
 * invece di accavallarsi (regola concentrica del sistema).
 */
export function concentric(outer: number, pad: number): number {
  return Math.max(6, outer - pad);
}

/**
 * Velo colorato su fondo ferro: l'unico modo ammesso per tingere una
 * superficie con un segnale (sfondi di icone, righe a fuoco, chip).
 */
export function wash(hex: string, alpha = 0.12): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Cifre tabulari: i numeri non cambiano larghezza mentre scorrono. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Taglio arrotondato per le metriche (SF Pro Rounded su iOS). */
const roundedFace = Platform.select({ ios: 'SF Pro Rounded', default: undefined });

/**
 * Scala tipografica — sorgente unica. Il corpo non scende mai sotto 17px sul
 * mobile; ogni numero passa dal taglio arrotondato e tabulare.
 */
const SCALE = {
  metric: {
    fontFamily: roundedFace,
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 66,
    letterSpacing: -1.5,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricSm: {
    fontFamily: roundedFace,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.6,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  /** Numeri di supporto: cronometri, campi, pillole. Sempre arrotondati. */
  metricXs: {
    fontFamily: roundedFace,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.4,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  display: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.6,
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.2,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
    color: COLORS.textPrimary,
  },
  callout: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  muted: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
  },
} as const;

export const type = StyleSheet.create(SCALE as never) as Record<keyof typeof SCALE, TextStyle>;

/** Materia del livello vetro. */
export const glass = {
  intensity: 42,
  tint: colors.glassTint,
  /** Gradiente della luce speculare sul bordo alto. */
  edge: [colors.glassEdge, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] as const,
  /** Rifrazione sul bordo basso: il vetro raccoglie luce anche da sotto. */
  edgeBottom: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.10)'] as const,
} as const;

/** Ombre: la profondità nasce dai materiali, non dall'accumulo di ombre. */
export const shadow = {
  /** Stacca il vetro dal contenuto che ci scorre sotto. */
  glass: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  /** Fogli che salgono dal basso. */
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24,
  },
  /** L'unico elemento a fuoco della schermata. Uno solo per schermata. */
  beacon: (color: string) => ({
    shadowColor: color,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  }),
} as const;

/** Movimento a molla, mai lineare. Vedi lib/a11y.ts per la riduzione. */
export const motion = {
  spring: { damping: 26, stiffness: 220, mass: 1, useNativeDriver: true },
  springSoft: { damping: 20, stiffness: 140, mass: 1, useNativeDriver: true },
  pressScale: 0.97,
} as const;

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    // Spazio per la barra schede in vetro flottante.
    paddingBottom: 132,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.raised,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '500',
    minHeight: 52,
  },
  // --- Alias della scala tipografica (stessa sorgente, nessuna deriva) ---
  screenTitle: SCALE.display as TextStyle,
  sectionLabel: SCALE.label as TextStyle,
  body: SCALE.body as TextStyle,
  muted: SCALE.muted as TextStyle,
});
