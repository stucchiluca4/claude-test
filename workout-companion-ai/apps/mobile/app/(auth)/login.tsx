import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, spacing, sharedStyles, type } from '../../lib/theme';
import { Appear, appearDelay } from '../../components/Appear';
import { GlassSurface } from '../../components/Glass';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Press } from '../../components/Press';
import { setDemo } from '../../lib/demo';
import { tapError } from '../../lib/haptics';

/**
 * Prima schermata del prodotto, e prima dimostrazione del sistema.
 *
 * Il modulo vive sul livello VETRO — è fatto di soli controlli — e galleggia
 * sul campo luminoso che il layout radice monta dietro ogni schermata. I campi
 * dentro restano FERRO opaco: due materiali affiancati, la tesi in un colpo
 * d'occhio (DESIGN.md § Elevation & Depth).
 *
 * All'apertura marchio, titolo, modulo e piede salgono a cascata: avviene una
 * volta sola, è la prima impressione.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Solo presentazione: bordo blu sul campo attivo e password in chiaro.
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [reveal, setReveal] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  function enterDemo() {
    setDemo(true);
    router.replace('/(tabs)');
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      tapError();
      setError('Inserisci email e password per accedere.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (authError) {
      tapError();
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email o password non corretti.'
          : authError.message,
      );
    }
    // Al successo ci pensa il listener nel layout radice a portarci in app.
  }

  return (
    // Toccando fuori dai campi la tastiera si chiude: sul telefono è il gesto atteso.
    <Pressable style={sharedStyles.screen} onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {/* Il marchio: pastiglia blu + logotipo. Entra per primo. */}
            <Appear delay={appearDelay(0)} style={styles.brand}>
              <View style={styles.mark}>
                <Ionicons name="barbell" size={24} color={colors.accent} />
              </View>
              <Text style={styles.wordmark}>Workout Companion AI</Text>
            </Appear>

            {/* L'elemento dominante: il titolo dell'atto che stai per compiere. */}
            <Appear delay={appearDelay(1)} style={styles.heading}>
              <Text style={type.display}>Bentornato</Text>
              <Text style={sharedStyles.muted}>Il tuo coach, sempre in tasca.</Text>
            </Appear>

            {/* VETRO: il pannello dei controlli galleggia sul campo luminoso. */}
            <Appear delay={appearDelay(2)}>
              <GlassSurface cornerRadius={radius.lg} padding={spacing.xl}>
                <View style={styles.form}>
                  <View style={styles.fieldGroup}>
                    <Text style={type.label}>Email</Text>
                    <View style={[styles.field, focused === 'email' && styles.fieldFocus]}>
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={(v) => {
                          setEmail(v);
                          if (error) setError(null);
                        }}
                        placeholder="nome@email.it"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={type.label}>Password</Text>
                    <View style={[styles.field, focused === 'password' && styles.fieldFocus]}>
                      <TextInput
                        ref={passwordRef}
                        style={styles.input}
                        value={password}
                        onChangeText={(v) => {
                          setPassword(v);
                          if (error) setError(null);
                        }}
                        placeholder="La tua password"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry={!reveal}
                        autoCapitalize="none"
                        autoComplete="password"
                        returnKeyType="go"
                        onSubmitEditing={handleLogin}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused(null)}
                      />
                      <Press
                        onPress={() => setReveal((v) => !v)}
                        style={styles.reveal}
                        hitSlop={8}
                        accessibilityLabel={reveal ? 'Nascondi password' : 'Mostra password'}
                      >
                        <Ionicons
                          name={reveal ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={focused === 'password' ? colors.accent : colors.textSecondary}
                        />
                      </Press>
                    </View>
                  </View>

                  {/* L'errore vive nel modulo, accanto ai campi: niente finestre
                      di sistema che coprono ciò che hai appena scritto. */}
                  {error ? (
                    <View style={styles.error} accessibilityRole="alert">
                      <Ionicons name="alert-circle" size={18} color={colors.rose} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton label="Accedi" onPress={handleLogin} loading={loading} style={styles.cta} />

                  {/* Terza azione: ghost, testo blu, nessun fondo. */}
                  <Press
                    onPress={enterDemo}
                    haptic="medium"
                    style={styles.demo}
                    accessibilityLabel="Prova la demo senza account"
                  >
                    <Ionicons name="flask-outline" size={18} color={colors.accent} />
                    <Text style={styles.demoText}>Prova la demo, senza account</Text>
                  </Press>
                </View>
              </GlassSurface>
            </Appear>

            <Appear delay={appearDelay(3)} style={styles.footer}>
              <Text style={sharedStyles.muted}>Non hai ancora un account?</Text>
              <Press
                onPress={() => router.push('/(auth)/register')}
                style={styles.linkHit}
                hitSlop={8}
                accessibilityLabel="Registrati"
              >
                <Text style={styles.link}>Registrati</Text>
              </Press>
            </Appear>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.xl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(10,132,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  heading: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    // FERRO dentro il vetro: il campo dove si scrive resta opaco e leggibile.
    backgroundColor: colors.raised,
    borderRadius: concentric(radius.lg, spacing.xl),
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.lg,
  },
  // A fuoco: bordo blu da 1px, nessun cambio di misura — il layout non salta.
  fieldFocus: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 14,
  },
  reveal: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.rose,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.xs,
  },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.pill,
  },
  demoText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  linkHit: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  link: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
});
