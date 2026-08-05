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
import { PrimaryButton } from '../../components/PrimaryButton';
import { Press } from '../../components/Press';
import { tapError } from '../../lib/haptics';

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

/** Stessa lingua della schermata d'accesso: marchio, ferro, una sola azione blu. */
export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'athlete' | 'coach'>('athlete');
  const [loading, setLoading] = useState(false);
  // Solo presentazione: bordo blu sul campo attivo e password in chiaro.
  const [focused, setFocused] = useState<'firstName' | 'lastName' | 'email' | 'password' | null>(null);
  const [reveal, setReveal] = useState(false);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();

  async function handleRegister() {
    if (!firstName.trim() || !email.trim() || !password) {
      tapError();
      Alert.alert('Campi mancanti', 'Nome, email e password sono obbligatori.');
      return;
    }
    if (password.length < 8) {
      tapError();
      Alert.alert('Password troppo corta', 'Usa almeno 8 caratteri.');
      return;
    }
    setLoading(true);
    // first_name/last_name/role finiscono nei metadata: il trigger DB crea il profilo.
    const { data, error } = await supabase.auth.signUp({
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
    if (error) {
      tapError();
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
    <View style={sharedStyles.screen}>
      {/* La stessa luce ambientale dell'accesso: blu al 6%, nient'altro. */}
      <LinearGradient
        colors={['rgba(10,132,255,0.06)', 'rgba(10,132,255,0.02)', 'rgba(10,132,255,0)']}
        locations={[0, 0.55, 1]}
        style={styles.ambient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Ionicons name="barbell" size={24} color={colors.accent} />
              </View>
              <Text style={styles.wordmark}>Workout Companion AI</Text>
            </View>

            <View style={styles.heading}>
              <Text style={type.display}>Crea il tuo account</Text>
              <Text style={sharedStyles.muted}>Inizia il tuo percorso con Workout Companion AI.</Text>
            </View>

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
                          <Text style={[styles.roleLabel, on && styles.roleLabelOn]}>{option.label}</Text>
                          <Text style={styles.roleCaption}>{option.caption}</Text>
                          {on ? (
                            <View style={styles.roleCheck}>
                              <Ionicons name="checkmark" size={13} color={colors.textPrimary} />
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
                      onChangeText={setFirstName}
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
                      onChangeText={setLastName}
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
              </View>

              <PrimaryButton label="Crea account" onPress={handleRegister} loading={loading} style={styles.cta} />
            </View>

            <View style={styles.footer}>
              <Text style={sharedStyles.muted}>Hai già un account?</Text>
              <Press
                onPress={() => router.push('/(auth)/login')}
                style={styles.linkHit}
                hitSlop={8}
                accessibilityLabel="Accedi"
              >
                <Text style={styles.link}>Accedi</Text>
              </Press>
            </View>
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.lg,
  },
  roleOn: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(10,132,255,0.12)',
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
