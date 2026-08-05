import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
} from 'react-native';
import { colors, radius } from '../lib/theme';

interface Props {
  width?: DimensionValue;
  height?: number;
  /** Raggio del blocco (default radius.sm). */
  round?: number;
}

/** Estremi della pulsazione: il blocco respira fra Rilievo e Linea. */
const DIM = 0.18;
const BRIGHT = 0.95;
/** Valore fermo quando il sistema chiede movimento ridotto. */
const STILL = 0.5;

/**
 * Blocco segnaposto sul livello FERRO: fondo opaco (Rilievo) e una lastra più
 * chiara (Linea) che pulsa in opacità — solo opacity, quindi 60fps sul driver
 * nativo. Da comporre nelle schermate per skeleton che ricalcano il layout reale.
 */
export function Skeleton({ width = '100%', height = 14, round = radius.sm }: Props) {
  const pulse = useRef(new Animated.Value(DIM)).current;
  const [reduced, setReduced] = useState(false);

  // Il movimento rispetta la preferenza di sistema (DESIGN.md § Do's).
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (alive) setReduced(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      pulse.setValue(STILL);
      return;
    }
    const breathe = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: 820,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([breathe(BRIGHT), breathe(DIM)]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <View style={[styles.block, { width, height, borderRadius: round }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.sheen, { opacity: pulse }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.raised,
    overflow: 'hidden',
  },
  sheen: {
    backgroundColor: colors.line,
  },
});
