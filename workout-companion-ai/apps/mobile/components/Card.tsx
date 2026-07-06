import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, sharedStyles } from '../lib/theme';

interface Props {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ title, children, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={[sharedStyles.sectionLabel, styles.title]}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
});
