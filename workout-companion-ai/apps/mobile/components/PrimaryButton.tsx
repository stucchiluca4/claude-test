import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, glass, radius, spacing } from '../lib/theme';
import { Press } from './Press';

type Variant = 'primary' | 'success' | 'danger' | 'ghost' | 'glass';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

const FILL: Record<Variant, string> = {
  primary: colors.accent,
  success: colors.mint,
  danger: colors.rose,
  ghost: 'transparent',
  glass: 'transparent',
};

/**
 * Ogni azione del prodotto è una pillola che cede sotto il dito.
 * `glass` vive solo sul livello vetro (barre d'azione, fogli, testate).
 */
export function PrimaryButton({ label, onPress, disabled, loading, variant = 'primary', style }: Props) {
  const inactive = disabled || loading;
  const isGlass = variant === 'glass';
  const isGhost = variant === 'ghost';
  const textColor = isGhost ? colors.accent : colors.textPrimary;

  return (
    <Press
      onPress={onPress}
      disabled={inactive}
      haptic={variant === 'success' ? 'success' : 'light'}
      style={[styles.wrap, inactive && styles.dimmed, style]}
      accessibilityLabel={label}
    >
      <View style={[styles.button, { backgroundColor: FILL[variant] }, isGlass && styles.glassBorder]}>
        {isGlass ? (
          <>
            <BlurView intensity={glass.intensity} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.tint }]} />
            <View style={styles.specular} pointerEvents="none" />
          </>
        ) : null}
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.pill,
  },
  button: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassEdge,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dimmed: {
    opacity: 0.45,
  },
});
