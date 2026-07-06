import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, spacing, sharedStyles } from '../../lib/theme';
import { PrimaryButton } from '../../components/PrimaryButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Campi mancanti', 'Inserisci email e password per accedere.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Accesso non riuscito', error.message);
    }
    // Al successo ci pensa il listener nel layout radice a portarci in app.
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>Workout Companion AI</Text>
            <Text style={sharedStyles.muted}>Il tuo coach, sempre in tasca.</Text>
          </View>

          <View style={styles.form}>
            <Text style={sharedStyles.screenTitle}>Accedi</Text>
            <TextInput
              style={sharedStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={sharedStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoComplete="password"
            />
            <PrimaryButton label="ACCEDI" onPress={handleLogin} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={sharedStyles.muted}>Non hai ancora un account?</Text>
            <Link href="/(auth)/register" style={styles.link}>
              Registrati
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  form: {
    gap: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  link: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
