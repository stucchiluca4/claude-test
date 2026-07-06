import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

interface Props {
  label: string;
  value: string;
  color?: string;
}

export function StatPill({ label, value, color = colors.textPrimary }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
