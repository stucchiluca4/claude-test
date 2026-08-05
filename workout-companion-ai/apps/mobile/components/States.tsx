import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, sharedStyles } from '../lib/theme';

/** Schermata intera di caricamento. */
export function LoadingState({ message = 'Caricamento…' }: { message?: string }) {
  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={sharedStyles.muted}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

/** Stato vuoto: dice cosa manca e cosa fare, mai solo "nessun dato". */
export function EmptyState({
  emoji,
  title,
  message,
  action,
}: {
  emoji: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.badge}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emoji: {
    fontSize: 34,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
