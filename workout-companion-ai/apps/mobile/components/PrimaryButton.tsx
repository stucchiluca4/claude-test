import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

type Variant = 'primary' | 'success' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

const BACKGROUNDS: Record<Variant, string> = {
  primary: colors.accent,
  success: colors.success,
  danger: colors.danger,
  ghost: 'transparent',
};

export function PrimaryButton({ label, onPress, disabled, loading, variant = 'primary', style }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: BACKGROUNDS[variant] },
        variant === 'ghost' && styles.ghost,
        (pressed || inactive) && styles.dimmed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && { color: colors.accent }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dimmed: {
    opacity: 0.6,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
