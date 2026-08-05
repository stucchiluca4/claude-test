import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../lib/theme';
import { tapLight, tapMedium, tapSuccess } from '../lib/haptics';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Colpo aptico alla pressione. */
  haptic?: 'light' | 'medium' | 'success' | 'none';
  scaleTo?: number;
  hitSlop?: number;
  accessibilityLabel?: string;
}

/**
 * Pressione con risposta fisica: la superficie cede a molla e restituisce un
 * colpo aptico. È il gesto base di tutto il prodotto (DESIGN.md § motion).
 */
export function Press({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  haptic = 'light',
  scaleTo = motion.pressScale,
  hitSlop,
  accessibilityLabel,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (to: number) => {
    Animated.spring(scale, { toValue: to, ...motion.spring }).start();
  };

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        spring(scaleTo);
      }}
      onPressOut={() => spring(1)}
      onPress={() => {
        if (disabled) return;
        if (haptic === 'light') tapLight();
        else if (haptic === 'medium') tapMedium();
        else if (haptic === 'success') tapSuccess();
        onPress?.();
      }}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
