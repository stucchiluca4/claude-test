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

/** Cifre tabulari: i numeri non cambiano larghezza mentre scorrono. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Taglio arrotondato per le metriche (SF Pro Rounded su iOS). */
const roundedFace = Platform.select({ ios: 'SF Pro Rounded', default: undefined });

/** Scala tipografica. Il corpo non scende mai sotto 17px sul mobile. */
export const type = StyleSheet.create({
  metric: {
    fontFamily: roundedFace,
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 66,
    letterSpacing: -1.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricSm: {
    fontFamily: roundedFace,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.6,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  display: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
    color: colors.textPrimary,
  },
  callout: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
});

/** Materia del livello vetro. */
export const glass = {
  intensity: 42,
  tint: colors.glassTint,
  border: colors.glassBorder,
  /** Gradiente della luce speculare sul bordo alto. */
  edge: [colors.glassEdge, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] as const,
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

/** Movimento a molla, mai lineare. */
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
  screenTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  bigNumber: {
    fontFamily: roundedFace,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 58,
    letterSpacing: -1.2,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
    color: colors.textPrimary,
  },
  muted: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    color: colors.textSecondary,
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
});
