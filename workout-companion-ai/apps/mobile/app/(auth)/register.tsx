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
import { colors, concentric, radius, spacing, sharedStyles, type, wash } from '../../lib/theme';
import { Appear, appearDelay } from '../../components/Appear';
import { GlassSurface } from '../../components/Glass';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Press } from '../../components/Press';
import { tapError, tapSuccess } from '../../lib/haptics';

interface RoleOption {
  value: 'athlete' | 'coach';
  label: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOn: keyof typeof Ionicons.glyphMap;
}

/** Le due porte d'ingresso al prodotto. Il ruolo lo applica il trigger del DB. */
const ROLES: RoleOption[] = [
  { value: 'athlete', label: 'Atleta', caption: 'Mi alleno io', icon: 'barbell-outline', iconOn: 'barbell' },
  { value: 'coach', label: 'Coach / PT', caption: 'Alleno altri', icon: 'clipboard-outline', iconOn: 'clipboard' },
];

/** I passi della conferma via email, come sul portale web: stessa promessa. */
const CONFIRM_STEPS = [
  'Apri la tua casella di posta (guarda anche nello spam).',
  'Tocca il pulsante di conferma nel messaggio.',
  'Torna qui e accedi con le tue credenziali.',
];

/**
 * Stessa lingua della schermata d'accesso: il modulo vive sul livello VETRO e
 * galleggia sul campo luminoso, i campi dentro restano FERRO opaco.
 */
export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'athlete' | 'coach'>('athlete');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Account creato ma in attesa della conferma via email. */
  const [emailSent, setEmailSent] = useState(false);
  // Solo presentazione: bordo blu sul campo attivo e password in chiaro.
  const [focused, setFocused] = useState<'firstName' | 'lastName' | 'email' | 'password' | null>(null);
  const [reveal, setReveal] = useState(false);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();

  /** Cancella l'errore appena l'utente mette mano al modulo. */
  function edit(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      if (error) setError(null);
    };
  }

  async function handleRegister() {
    if (!firstName.trim() || !email.trim() || !password) {
      tapError();
      setError('Nome, email e password sono obbligatori.');
      return;
    }
    if (password.length < 8) {
      tapError();
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }
    setLoading(true);
    setError(null);
    // first_name/last_name/role finiscono nei metadata: il trigger DB crea il profilo.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      tapError();
      setError(
        signUpError.message === 'User already registered'
          ? 'Esiste già un account con questa email. Prova ad accedere.'
          : signUpError.message,
      );
      return;
    }
    if (!data.session) {
      // Conferma via email attiva: lo diciamo con una schermata, non con un
      // avviso di sistema — è il momento in cui l'account è appena nato.
      tapSuccess();
      setEmailSent(true);
    }
    // Con la sessione già attiva ci pensa il listener del layout radice.
  }

  // ---------- Conferma via email ----------
  if (emailSent) {
    return (
      <View style={sharedStyles.screen}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.container}>
            <Appear delay={appearDelay(0)}>
              <GlassSurface cornerRadius={radius.lg} padding={spacing.xl}>
                <View style={styles.sent}>
                  <View style={styles.sentMark}>
                    <Ionicons name="mail-unread" size={28} color={colors.mint} />
                  </View>
                  <Text style={type.display}>Controlla la tua email</Text>
                  <Text style={sharedStyles.muted}>
                    Abbiamo inviato il link di conferma a{' '}
                    <Text style={styles.sentEmail}>{email.trim().toLowerCase()}</Text>.
                  </Text>

                  <View style={styles.steps}>
                    {CONFIRM_STEPS.map((step, i) => (
                      <View key={step} style={styles.step}>
                        <View style={styles.stepIndex}>
                          <Text style={styles.stepIndexText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>

                  <PrimaryButton
                    label="Vai all'accesso"
                    onPress={() => router.replace('/(auth)/login')}
                    style={styles.cta}
                  />
                </View>
              </GlassSurface>
            </Appear>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ---------- Modulo ----------
  return (
    // Toccando fuori dai campi la tastiera si chiude: sul telefono è il gesto atteso.
    <Pressable style={sharedStyles.screen} onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Appear delay={appearDelay(0)} style={styles.brand}>
              <View style={styles.mark}>
                <Ionicons name="barbell" size={24} color={colors.accent} />
              </View>
              <Text style={styles.wordmark}>Workout Companion AI</Text>
            </Appear>

            <Appear delay={appearDelay(1)} style={styles.heading}>
              <Text style={type.display}>Crea il tuo account</Text>
              <Text style={sharedStyles.muted}>Inizia il tuo percorso con Workout Companion AI.</Text>
            </Appear>

            {/* VETRO: il pannello dei controlli galleggia sul campo luminoso. */}
            <Appear delay={appearDelay(2)}>
              <GlassSurface cornerRadius={radius.lg} padding={spacing.xl}>
                <View style={styles.form}>
                  {/* Prima scelta: chi sei. Due bersagli grandi, stato attivo blu. */}
                  <View style={styles.fieldGroup}>
                    <Text style={type.label}>Chi sei?</Text>
                    <View style={styles.roleRow}>
                      {ROLES.map((option) => {
                        const on = role === option.value;
                        return (
                          <View key={option.value} style={styles.roleSlot}>
                            <Press
                              onPress={() => setRole(option.value)}
                              style={[styles.role, on && styles.roleOn]}
                              accessibilityLabel={on ? `${option.label}, selezionato` : option.label}
                            >
                              <Ionicons
                                name={on ? option.iconOn : option.icon}
                                size={26}
                                color={on ? colors.accent : colors.textSecondary}
                              />
                              <Text style={[styles.roleLabel, on && styles.roleLabelOn]}>
                                {option.label}
                              </Text>
                              <Text style={styles.roleCaption}>{option.caption}</Text>
                              {on ? (
                                <View style={styles.roleCheck}>
                                  <Ionicons name="checkmark" size={13} color={colors.void} />
                                </View>
                              ) : null}
                            </Press>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.fieldGroup, styles.rowItem]}>
                      <Text style={type.label}>Nome</Text>
                      <View style={[styles.field, focused === 'firstName' && styles.fieldFocus]}>
                        <TextInput
                          style={styles.input}
                          value={firstName}
                          onChangeText={edit(setFirstName)}
                          placeholder="Marco"
                          placeholderTextColor={colors.textTertiary}
                          autoComplete="given-name"
                          returnKeyType="next"
                          submitBehavior="submit"
                          onSubmitEditing={() => lastNameRef.current?.focus()}
                          onFocus={() => setFocused('firstName')}
                          onBlur={() => setFocused(null)}
                        />
                      </View>
                    </View>

                    <View style={[styles.fieldGroup, styles.rowItem]}>
                      <Text style={type.label}>Cognome</Text>
                      <View style={[styles.field, focused === 'lastName' && styles.fieldFocus]}>
                        <TextInput
                          ref={lastNameRef}
                          style={styles.input}
                          value={lastName}
                          onChangeText={edit(setLastName)}
                          placeholder="Rossi"
                          placeholderTextColor={colors.textTertiary}
                          autoComplete="family-name"
                          returnKeyType="next"
                          submitBehavior="submit"
                          onSubmitEditing={() => emailRef.current?.focus()}
                          onFocus={() => setFocused('lastName')}
                          onBlur={() => setFocused(null)}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={type.label}>Email</Text>
                    <View style={[styles.field, focused === 'email' && styles.fieldFocus]}>
                      <TextInput
                        ref={emailRef}
                        style={styles.input}
                        value={email}
                        onChangeText={edit(setEmail)}
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
                        onChangeText={edit(setPassword)}
                        placeholder="Almeno 8 caratteri"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry={!reveal}
                        autoCapitalize="none"
                        autoComplete="new-password"
                        returnKeyType="go"
                        onSubmitEditing={handleRegister}
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
                    {/* Il requisito si vede mentre scrivi, non dopo aver sbagliato. */}
                    {password.length > 0 && password.length < 8 ? (
                      <Text style={styles.hint}>Ancora {8 - password.length} caratteri.</Text>
                    ) : null}
                  </View>

                  {/* L'errore vive nel modulo, accanto ai campi. */}
                  {error ? (
                    <View style={styles.error} accessibilityRole="alert">
                      <Ionicons name="alert-circle" size={18} color={colors.rose} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    label="Crea account"
                    onPress={handleRegister}
                    loading={loading}
                    style={styles.cta}
                  />
                </View>
              </GlassSurface>
            </Appear>

            <Appear delay={appearDelay(3)} style={styles.footer}>
              <Text style={sharedStyles.muted}>Hai già un account?</Text>
              <Press
                onPress={() => router.push('/(auth)/login')}
                style={styles.linkHit}
                hitSlop={8}
                accessibilityLabel="Accedi"
              >
                <Text style={styles.link}>Accedi</Text>
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
    backgroundColor: wash(colors.accent, 0.14),
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleSlot: {
    flex: 1,
  },
  role: {
    minHeight: 108,
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.raised,
    borderRadius: concentric(radius.lg, spacing.xl),
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.lg,
  },
  roleOn: {
    borderColor: colors.accent,
    backgroundColor: wash(colors.accent, 0.14),
  },
  roleLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  roleLabelOn: {
    color: colors.textPrimary,
  },
  roleCaption: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  // Il colore non viaggia mai da solo: allo stato attivo si aggiunge il segno di spunta.
  roleCheck: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
  // ---------- Conferma via email ----------
  sent: {
    gap: spacing.md,
  },
  sentMark: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: wash(colors.mint, 0.16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sentEmail: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  steps: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: concentric(radius.lg, spacing.xl),
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  stepText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
});
