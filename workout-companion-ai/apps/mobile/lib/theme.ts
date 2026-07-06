import { StyleSheet } from 'react-native';
import { COLORS } from '@wc/shared';

/** Palette condivisa con il resto della piattaforma (dark mode only). */
export const colors = COLORS;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bigNumber: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  body: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 16,
  },
});
