import { StyleSheet, Text, View } from 'react-native';
import { colors, concentric, radius, spacing, tabular } from '../lib/theme';

interface Props {
  label: string;
  value: string;
  color?: string;
}

/** Metrica di supporto: piccola, tabulare, mai in competizione col numero dominante. */
export function StatPill({ label, value, color = colors.textPrimary }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.value, tabular, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.raised,
    borderRadius: concentric(radius.lg, spacing.lg),
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
