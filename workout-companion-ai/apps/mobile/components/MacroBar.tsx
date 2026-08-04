import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../lib/theme';

interface Props {
  label: string;
  grams: number;
  /** Quota 0-1 della barra da riempire (es. quota kcal del macro). */
  fraction: number;
  color: string;
  /** Se true, accanto ai grammi mostra anche la quota kcal in percentuale. */
  showShare?: boolean;
}

export function MacroBar({ label, grams, fraction, color, showShare = false }: Props) {
  const pct = Math.min(Math.max(fraction, 0), 1) * 100;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.grams}>
          {Math.round(grams)} g{showShare ? <Text style={styles.share}>  ·  {Math.round(pct)}%</Text> : null}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  share: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  grams: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
