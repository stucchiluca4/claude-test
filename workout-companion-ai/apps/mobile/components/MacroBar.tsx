import { StyleSheet, Text, View } from 'react-native';
import { colors, concentric, radius, spacing, tabular, type } from '../lib/theme';

interface Props {
  label: string;
  grams: number;
  /** Quota 0-1 della barra da riempire (es. quota kcal del macro). */
  fraction: number;
  color: string;
  /** Se true, accanto ai grammi mostra anche la quota kcal in percentuale. */
  showShare?: boolean;
}

/** Tacche della barra: sedici passi si contano a colpo d'occhio. */
const SEGMENTS = 16;

/** Raggio interno della card di contenuto (26 − 20): regola concentrica. */
const TRACK_RADIUS = concentric(radius.lg, spacing.xl);

/**
 * Riga di un macro sul livello FERRO: nome, grammi in cifre tabulari e barra a
 * segmenti nel colore del macro. Si legge come una tacca di livello — pieno,
 * vuoto e quanto manca — invece che come una striscia continua.
 */
export function MacroBar({ label, grams, fraction, color, showShare = false }: Props) {
  const filled = Math.min(Math.max(fraction, 0), 1);
  const pct = filled * 100;
  // Livello del singolo segmento: 1 acceso, 0 spento, in mezzo acceso in parte.
  const segments = Array.from({ length: SEGMENTS }, (_, i) =>
    Math.min(Math.max(filled * SEGMENTS - i, 0), 1)
  );

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${Math.round(grams)} grammi`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
    >
      <View style={styles.row}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[type.callout, styles.label]} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <View style={styles.valueRow}>
          <Text style={[styles.grams, tabular]}>{Math.round(grams)}</Text>
          <Text style={styles.unit}>g</Text>
          {showShare ? (
            <>
              <Text style={styles.separator}>·</Text>
              <Text style={[styles.share, tabular]}>{Math.round(pct)}%</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Gola incassata nel ferro: i segmenti accesi portano il colore del macro. */}
      <View style={styles.track}>
        {segments.map((level, i) => (
          <View key={i} style={styles.slot}>
            {level > 0 ? (
              <View style={[styles.slotFill, { width: `${level * 100}%`, backgroundColor: color }]} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  grams: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  unit: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  separator: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  share: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 2,
    height: 14,
    padding: 3,
    borderRadius: TRACK_RADIUS,
    backgroundColor: colors.raised,
  },
  slot: {
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  slotFill: {
    height: '100%',
    borderRadius: 3,
  },
});
