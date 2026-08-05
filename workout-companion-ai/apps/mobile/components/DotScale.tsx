import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, tabular } from '../lib/theme';
import { Press } from './Press';

interface Props {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  /** Emoji opzionale mostrata prima dell'etichetta. */
  emoji?: string;
  /** Descrittori per le fasce 1-3 / 4-6 / 7-10, mostrati accanto al valore. */
  bands?: readonly [string, string, string];
  /** Colore del riempimento: usa il segnale che corrisponde al significato. */
  tint?: string;
}

function bandLabel(value: number, bands: readonly [string, string, string]): string {
  if (value <= 3) return bands[0];
  if (value <= 6) return bands[1];
  return bands[2];
}

/**
 * Scala 1-10 a segmenti: bersagli larghi e alti, pensati per essere colpiti
 * con il pollice senza guardare (nessuna libreria esterna).
 */
export function DotScale({ label, value, onChange, emoji, bands, tint = colors.accent }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>
          {emoji ? `${emoji}  ` : ''}
          {label}
        </Text>
        <Text style={[styles.value, tabular, value != null && { color: tint }]}>
          {value != null ? `${value}${bands ? ` · ${bandLabel(value, bands)}` : '/10'}` : '—'}
        </Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value != null && n <= value;
          return (
            <Press
              key={n}
              onPress={() => onChange(n)}
              haptic="light"
              scaleTo={0.9}
              style={[styles.segment, active && { backgroundColor: tint }]}
              accessibilityLabel={`${label}: ${n} su 10`}
            >
              <View />
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  value: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  track: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: radius.xs,
    backgroundColor: colors.raised,
  },
});
