import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

export interface BarDatum {
  label: string;
  value: number;
  /** Testo mostrato sopra la barra (default: valore arrotondato). */
  display?: string;
}

interface Props {
  data: BarDatum[];
  color?: string;
  height?: number;
  /** Mostra il valore sopra ogni barra. */
  showValues?: boolean;
}

/** Istogramma essenziale costruito con sole View (nessuna libreria esterna). */
export function BarChart({ data, color = colors.accent, height = 120, showValues = true }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.wrap}>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => {
          const barHeight = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * (height - 18));
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              {showValues && d.value > 0 ? (
                <Text style={styles.value} numberOfLines={1}>
                  {d.display ?? Math.round(d.value)}
                </Text>
              ) : (
                <View style={styles.valueSpacer} />
              )}
              <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={`${d.label}-l-${i}`} style={styles.label} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  bar: {
    width: '68%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  value: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valueSpacer: {
    height: 12,
  },
  labels: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});
