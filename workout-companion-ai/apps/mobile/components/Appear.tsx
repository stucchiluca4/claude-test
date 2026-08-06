import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../lib/theme';
import { spring as reduceAware } from '../lib/a11y';

interface Props {
  children: ReactNode;
  /** Ritardo d'entrata in ms: le card salgono a cascata, non tutte insieme. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Scala dei ritardi della cascata: dopo il quarto elemento non si allunga più. */
const STAGGER = [0, 60, 120, 180] as const;

/**
 * Ritardo della card in posizione `index`, secondo la scala 0/60/120/180 ms.
 * Oltre il quarto elemento resta a 180: una cascata più lunga si trasformerebbe
 * in attesa invece che in movimento.
 */
export function appearDelay(index: number): number {
  return STAGGER[Math.min(Math.max(0, index), STAGGER.length - 1)];
}

/**
 * Entrata a molla del livello FERRO: al montaggio la card sale di 16px e si
 * accende da opacità 0 a 1 (DESIGN.md § motion — mai curve lineari).
 *
 * Con "riduci movimento" attivo la molla collassa in un salto immediato: lo
 * stato finale è sempre lo stesso, cambia solo il tragitto.
 */
export function Appear({ children, delay = 0, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: 1,
      delay,
      ...reduceAware(motion.springSoft),
    });
    animation.start();
    // Se il componente sparisce prima della fine, la molla si ferma con lui.
    return () => animation.stop();
  }, [progress, delay]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
