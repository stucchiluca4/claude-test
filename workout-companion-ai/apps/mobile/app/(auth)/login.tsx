import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, sharedStyles, type } from '../../lib/theme';
import { Appear, appearDelay } from '../../components/Appear';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Press } from '../../components/Press';
import { setDemo } from '../../lib/demo';
import { tapError } from '../../lib/haptics';

/**
 * Prima schermata del prodotto: marchio, due campi di ferro, una sola azione blu.
 * Nessun vetro qui — non c'è nulla che scorra sotto: il vetro sarebbe una tinta.
 *
 * All'apertura marchio, titolo, modulo e piede salgono a cascata: è la prima
 * impressione del prodotto, e avviene una volta sola (nessun replayOnFocus).
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
      tapError();
      Alert.alert('Accesso non riuscito', error.message);
    }
    // Al successo ci pensa il listener nel layout radice a portarci in app.
  }

  return (
    <View style={sharedStyles.screen}>
      {/* Luce ambientale: blu al 6% che scende dall'alto, l'unica atmosfera concessa. */}
      <LinearGradient
        colors={['rgba(10,132,255,0.06)', 'rgba(10,132,255,0.02)', 'rgba(10,132,255,0)']}
        locations={[0, 0.55, 1]}
        style={styles.ambient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {/* Il marchio: pastiglia blu + logotipo, in alto e piccolo. Entra per primo. */}
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

            <Appear delay={appearDelay(2)} style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={type.label}>Email</Text>
                <View style={[styles.field, focused === 'email' && styles.fieldFocus]}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
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
                    onChangeText={setPassword}
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  ambient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '62%',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.xxl,
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
    backgroundColor: colors.raised,
    borderRadius: radius.sm,
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
  cta: {
    marginTop: spacing.sm,
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
