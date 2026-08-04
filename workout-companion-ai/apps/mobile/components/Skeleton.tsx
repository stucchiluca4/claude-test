import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, type DimensionValue } from 'react-native';
import { colors, radius } from '../lib/theme';

interface Props {
  width?: DimensionValue;
  height?: number;
  /** Raggio del blocco (default radius.sm). */
  round?: number;
}

/** Blocco segnaposto con pulsazione di opacità (solo opacity → 60fps).
 *  Da comporre nelle schermate per skeleton che ricalcano il layout reale. */
export function Skeleton({ width = '100%', height = 14, round = radius.sm }: Props) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: round, opacity: pulse }]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.border,
  },
});
