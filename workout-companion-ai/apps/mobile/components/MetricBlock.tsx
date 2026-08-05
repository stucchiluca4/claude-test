import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tabular, type } from '../lib/theme';

interface Props {
  /** Il numero che domina la schermata. */
  value: string;
  unit?: string;
  label?: string;
  caption?: string;
  color?: string;
  /** Contenuto a destra del numero (anello, badge, azione). */
  trailing?: ReactNode;
}

/**
 * L'elemento dominante di una schermata: un solo numero, alla scala del gesto,
 * leggibile in tre secondi a braccio teso (DESIGN.md § Layout).
 */
export function MetricBlock({ value, unit, label, caption, color = colors.textPrimary, trailing }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.main}>
        {label ? <Text style={type.label}>{label}</Text> : null}
        <View style={styles.numberRow}>
          <Text style={[type.metric, tabular, { color }]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  main: {
    flex: 1,
    gap: spacing.xs,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
