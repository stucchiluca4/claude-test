import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../lib/theme';

interface Props {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  /** Emoji opzionale mostrata prima dell'etichetta. */
  emoji?: string;
  /** Descrittori per le fasce 1-3 / 4-6 / 7-10, mostrati accanto al valore. */
  bands?: readonly [string, string, string];
}

function bandLabel(value: number, bands: readonly [string, string, string]): string {
  if (value <= 3) return bands[0];
  if (value <= 6) return bands[1];
  return bands[2];
}

/** Scala 1-10 con dieci pallini tappabili (niente librerie esterne). */
export function DotScale({ label, value, onChange, emoji, bands }: Props) {
  return (
    <View style={styles.scaleBox}>
      <View style={styles.scaleHeader}>
        <Text style={styles.scaleLabel}>
          {emoji ? `${emoji} ` : ''}
          {label}
        </Text>
        <Text style={styles.scaleValue}>
          {value != null
            ? `${value}/10${bands ? ` · ${bandLabel(value, bands)}` : ''}`
            : '—'}
        </Text>
      </View>
      <View style={styles.dotsRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value != null && n <= value;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.dot, active && styles.dotActive]}
              hitSlop={10}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scaleBox: {
    gap: spacing.sm,
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scaleLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  scaleValue: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
