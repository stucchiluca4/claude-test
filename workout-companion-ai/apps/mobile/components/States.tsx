import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, sharedStyles } from '../lib/theme';

/** Schermata intera di caricamento (spinner + messaggio). */
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

/** Stato vuoto riutilizzabile (emoji + titolo + messaggio). */
export function EmptyState({ emoji, title, message }: { emoji: string; title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
