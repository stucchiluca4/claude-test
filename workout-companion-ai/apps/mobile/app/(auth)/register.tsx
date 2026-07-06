import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, spacing, sharedStyles } from '../../lib/theme';
import { PrimaryButton } from '../../components/PrimaryButton';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    if (!firstName.trim() || !email.trim() || !password) {
      Alert.alert('Campi mancanti', 'Nome, email e password sono obbligatori.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password troppo corta', 'Usa almeno 8 caratteri.');
      return;
    }
    setLoading(true);
    // first_name/last_name finiscono nei metadata: il trigger DB crea il profilo.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Registrazione non riuscita', error.message);
      return;
    }
    if (!data.session) {
      Alert.alert(
        'Quasi fatto!',
        'Ti abbiamo inviato una email di conferma. Aprila e poi accedi con le tue credenziali.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Text style={sharedStyles.screenTitle}>Crea il tuo account</Text>
            <Text style={sharedStyles.muted}>Inizia il tuo percorso con Workout Companion AI.</Text>
            <TextInput
              style={sharedStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Nome"
              placeholderTextColor={colors.textSecondary}
              autoComplete="given-name"
            />
            <TextInput
              style={sharedStyles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Cognome"
              placeholderTextColor={colors.textSecondary}
              autoComplete="family-name"
            />
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
              placeholder="Password (min. 8 caratteri)"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoComplete="new-password"
            />
            <PrimaryButton label="REGISTRATI" onPress={handleRegister} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={sharedStyles.muted}>Hai già un account?</Text>
            <Link href="/(auth)/login" style={styles.link}>
              Accedi
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
