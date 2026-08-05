import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tabular, type } from '../lib/theme';

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

/**
 * Istogramma essenziale costruito con sole View: vive sul livello FERRO,
 * quindi resta perfettamente leggibile (nessuna sfocatura sotto i dati).
 */
export function BarChart({ data, color = colors.accent, height = 132, showValues = true }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  // Spazio riservato al valore sopra la barra (15 di testo + 4 di distacco).
  const plot = height - 19;

  return (
    <View style={styles.wrap}>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => {
          const isPeak = d.value === max && d.value > 0;
          const barHeight = Math.max(d.value > 0 ? 4 : 0, (d.value / max) * plot);
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              {showValues && d.value > 0 ? (
                <Text style={[styles.value, tabular, isPeak && { color: colors.textPrimary }]} numberOfLines={1}>
                  {d.display ?? Math.round(d.value)}
                </Text>
              ) : (
                <View style={styles.valueSpacer} />
              )}
              <View style={[styles.slot, { height: plot }]}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.55 },
                  ]}
                />
              </View>
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
    gap: 5,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  slot: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '72%',
    borderRadius: 6,
  },
  value: {
    // Numero: taglio arrotondato, 12px e Nebbia per restare leggibile.
    fontFamily: type.metricXs.fontFamily,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  valueSpacer: {
    height: 15,
  },
  labels: {
    flexDirection: 'row',
    gap: 5,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    // Etichetta dell'asse: 12px in Nebbia, non più in Fumo (troppo debole).
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
