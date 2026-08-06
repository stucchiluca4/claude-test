import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../lib/theme';
import { prefersReducedMotion } from '../lib/a11y';

interface BlobProps {
  size: number;
  color: string;
  opacity: number;
  /** Posizione iniziale rispetto all'angolo alto-sinistro. */
  left: number;
  top: number;
  /** Spostamento massimo della deriva. */
  driftX: number;
  driftY: number;
  duration: number;
  id: string;
}

/** Una massa di colore che deriva lentamente: il gradiente radiale è già morbido. */
function Blob({ size, color, opacity, left, top, driftX, driftY, duration, id }: BlobProps) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, driftX] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, driftY] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Animated.View
      style={[styles.blob, { left, top, width: size, height: size, transform: [{ translateX }, { translateY }, { scale }] }]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Il campo luminoso che vive DIETRO tutta l'app.
 *
 * Serve al vetro: senza qualcosa di vivo e colorato sotto, una superficie
 * traslucida legge come grigio piatto e il materiale sparisce. È il livello
 * che rende visibile il Liquid Glass (DESIGN.md § Elevation & Depth).
 */
export function Aurora() {
  const { width, height } = useWindowDimensions();
  const base = Math.max(width, height);

  return (
    <View style={styles.field} pointerEvents="none">
      <Blob
        id="aurora-blue"
        size={base * 1.05}
        color={colors.accent}
        opacity={0.42}
        left={width * 0.22}
        top={-base * 0.34}
        driftX={-width * 0.2}
        driftY={height * 0.1}
        duration={16000}
        />
      <Blob
        id="aurora-cyan"
        size={base * 0.85}
        color={colors.cyan}
        opacity={0.3}
        left={-width * 0.35}
        top={height * 0.42}
        driftX={width * 0.22}
        driftY={-height * 0.12}
        duration={21000}
      />
      <Blob
        id="aurora-violet"
        size={base * 0.72}
        color={colors.violet}
        opacity={0.22}
        left={width * 0.34}
        top={height * 0.22}
        driftX={-width * 0.16}
        driftY={height * 0.16}
        duration={26000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  blob: {
    position: 'absolute',
  },
});
