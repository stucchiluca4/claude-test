import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, tabular } from '../lib/theme';
import { formatClock } from '../lib/utils';
import { tapSuccess } from '../lib/haptics';
import { GlassSurface } from './Glass';
import { Press } from './Press';

interface Props {
  /** Durata del recupero in secondi. */
  seconds: number;
  /** Cambia questo valore per far ripartire il timer (es. Date.now()). */
  resetToken: number;
  onFinish: () => void;
  onSkip: () => void;
}

/**
 * Il recupero è il momento in cui l'atleta guarda il telefono più a lungo:
 * vive sul livello VETRO, ancorato in basso, col numero alla scala del gesto.
 */
export function RestTimer({ seconds, resetToken, onFinish, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Timer basato su timestamp: al rientro dal background il tempo resta corretto.
    const endsAt = Date.now() + seconds * 1000;
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [seconds, resetToken]);

  useEffect(() => {
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, damping: 20, stiffness: 140, mass: 1, useNativeDriver: true }).start();
  }, [resetToken, enter]);

  useEffect(() => {
    if (remaining <= 0) {
      tapSuccess();
      onFinish();
    }
  }, [remaining, onFinish]);

  const fraction = seconds > 0 ? Math.max(remaining, 0) / seconds : 0;
  const closing = remaining <= 5;

  return (
    <Animated.View
      style={[
        styles.anchor,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
      pointerEvents="box-none"
    >
      <GlassSurface cornerRadius={radius.xl} padding={spacing.lg}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.label}>RECUPERO</Text>
            <Text
              style={[styles.clock, tabular, closing && { color: colors.amber }]}
              numberOfLines={1}
            >
              {formatClock(remaining)}
            </Text>
          </View>
          <Press onPress={onSkip} style={styles.skip} haptic="light" accessibilityLabel="Salta recupero">
            <Text style={styles.skipText}>Salta</Text>
          </Press>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.round(fraction * 100)}%`, backgroundColor: closing ? colors.amber : colors.accent },
            ]}
          />
        </View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  clock: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
  },
  skip: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
