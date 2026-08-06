import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, glass, radius, shadow, spacing } from '../lib/theme';
import { spring as reduceAware } from '../lib/a11y';
import { tapLight } from '../lib/haptics';
import { Press } from './Press';

/** Quanto resta visibile a schermo fermo, prima di ritirarsi. */
const IDLE_MS = 2600;

interface Props {
  children: ReactNode;
  /** Altezza occupata dalla barra schede, per posizionarsi appena sopra. */
  bottomOffset: number;
}

/**
 * La chat come bolla flottante, sul modello del tasto assistivo di iOS.
 *
 * Comportamento (richiesto esplicitamente):
 * - mentre si scorre o si tocca, sparisce: non deve dare fastidio;
 * - ricompare alla FINE dello scorrimento, quando il dito lascia lo schermo;
 * - se lo schermo resta fermo si ritira da sola dopo qualche secondo;
 * - torna al primo tocco successivo.
 *
 * Intercetta i tocchi in risalita dai figli, quindi funziona su ogni schermata
 * senza che le schermate debbano saperne nulla.
 */
export function FloatingChatBubble({ children, bottomOffset }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sulla schermata della chat la bolla non ha senso: sei già lì.
  const onChatScreen = pathname?.includes('/chat') ?? false;

  const clearIdle = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  /** Il dito è sullo schermo: la bolla si toglie di mezzo. */
  const hide = useCallback(() => {
    clearIdle();
    setVisible(false);
  }, [clearIdle]);

  /** Il dito ha lasciato lo schermo: la bolla torna e riparte il conto alla rovescia. */
  const showThenIdle = useCallback(() => {
    clearIdle();
    setVisible(true);
    idleTimer.current = setTimeout(() => setVisible(false), IDLE_MS);
  }, [clearIdle]);

  useEffect(() => {
    const animation = Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      ...reduceAware({ damping: 18, stiffness: 180, mass: 1 }),
    });
    animation.start();
    return () => animation.stop();
  }, [visible, anim]);

  useEffect(() => clearIdle, [clearIdle]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View
      style={styles.host}
      // I tocchi risalgono dai figli: non serve toccare le schermate.
      onTouchStart={hide}
      onTouchEnd={showThenIdle}
      onTouchCancel={showThenIdle}
    >
      {children}

      {onChatScreen ? null : (
        <Animated.View
          pointerEvents={visible ? 'box-none' : 'none'}
          style={[
            styles.anchor,
            { bottom: bottomOffset + Math.max(insets.bottom, 10) + spacing.md },
            { opacity: anim, transform: [{ scale }, { translateY }] },
          ]}
        >
          <Press
            onPress={() => {
              tapLight();
              router.push('/(tabs)/chat');
            }}
            haptic="none"
            accessibilityLabel="Apri la chat col coach"
            style={[styles.bubbleShadow, shadow.glass]}
          >
            <View style={styles.bubble}>
              <BlurView intensity={glass.intensity} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.tint }]} />
              <LinearGradient
                colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
                style={styles.sheen}
                pointerEvents="none"
              />
              <View style={styles.ring} pointerEvents="none" />
              <Ionicons name="chatbubble-ellipses" size={23} color={colors.textPrimary} />
            </View>
          </Press>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  anchor: {
    position: 'absolute',
    right: spacing.lg,
  },
  bubbleShadow: {
    borderRadius: radius.pill,
  },
  bubble: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.2,
    backgroundColor: colors.glassEdge,
  },
});
