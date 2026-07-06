import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';
import { formatClock } from '../lib/utils';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  /** Durata del recupero in secondi. */
  seconds: number;
  /** Cambia questo valore per far ripartire il timer (es. Date.now()). */
  resetToken: number;
  onFinish: () => void;
  onSkip: () => void;
}

export function RestTimer({ seconds, resetToken, onFinish, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [seconds, resetToken]);

  useEffect(() => {
    if (remaining <= 0) onFinish();
  }, [remaining, onFinish]);

  const fraction = seconds > 0 ? Math.max(remaining, 0) / seconds : 0;

  return (
    <View style={styles.banner}>
      <View style={styles.info}>
        <Text style={styles.label}>RECUPERO</Text>
        <Text style={styles.clock}>{formatClock(remaining)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
        </View>
      </View>
      <PrimaryButton label="Salta" variant="ghost" onPress={onSkip} style={styles.skip} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    marginTop: 0,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  clock: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  skip: {
    minHeight: 44,
    paddingVertical: 10,
  },
});
