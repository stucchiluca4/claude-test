import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../lib/theme';
import { spring as reduceAware } from '../lib/a11y';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** Completamento da 0 a 1. */
  progress: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
  /** Contenuto al centro dell'anello (numero, icona). */
  children?: ReactNode;
  /**
   * Cosa misura l'anello. Senza, VoiceOver legge solo la cifra al centro —
   * un «3» nudo che non dice di cosa.
   */
  a11yLabel?: string;
}

/**
 * Anello di completamento a tratto tondo: il modo in cui Apple racconta
 * "quanto ne hai fatto". Si riempie a molla dal valore precedente.
 */
export function ActivityRing({
  progress,
  color = colors.accent,
  size = 92,
  strokeWidth = 12,
  children,
  a11yLabel,
}: Props) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Con "riduci movimento" l'anello arriva subito al valore finale.
    Animated.spring(anim, {
      toValue: clamped,
      useNativeDriver: false,
      ...reduceAware({ damping: 20, stiffness: 140, mass: 1 }),
    }).start();
  }, [clamped, anim]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={{ width: size, height: size }}
      accessible={a11yLabel ? true : undefined}
      accessibilityRole={a11yLabel ? 'progressbar' : undefined}
      accessibilityLabel={a11yLabel}
      accessibilityValue={a11yLabel ? { min: 0, max: 100, now: Math.round(clamped * 100) } : undefined}
    >
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeOpacity={0.14}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
          />
        </G>
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
