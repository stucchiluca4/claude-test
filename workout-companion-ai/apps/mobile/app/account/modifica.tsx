import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Profile } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { localDateString, parseNum, showError } from '../../lib/utils';
import { getUserId } from '../../lib/queries';
import { demoProfile, isDemo } from '../../lib/demo';
import { Appear, appearDelay } from '../../components/Appear';
import { Card } from '../../components/Card';
import { GlassSurface } from '../../components/Glass';
import { Press } from '../../components/Press';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SectionHead } from '../../components/SectionHead';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/States';
import { tapError } from '../../lib/haptics';

/** Corsa di scorrimento entro cui il vetro si accende del tutto (px). */
const GLASS_RANGE = 120;
/** Scatto minimo sotto il quale non vale la pena ridisegnare il vetro. */
const GLASS_STEP = 0.05;

/** Raggio dei campi dentro la card (regola concentrica: Card padding = xl). */
const FIELD_RADIUS = concentric(radius.lg, spacing.xl);

/**
 * Le tre voci ammesse dal vincolo del database
 * (`check (sex in ('male','female','other'))`): nessun'altra stringa passa.
 */
const SEX_OPTIONS: { value: NonNullable<Profile['sex']>; label: string }[] = [
  { value: 'male', label: 'Uomo' },
  { value: 'female', label: 'Donna' },
  { value: 'other', label: 'Altro' },
];

/** Limiti di buon senso per l'altezza, oltre al `numeric(5,1)` dello schema. */
const HEIGHT_MIN = 90;
const HEIGHT_MAX = 250;

/** Campo di testo su FERRO, dentro la card. */
function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  maxLength,
  autoCapitalize,
  width,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'number-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'words';
  width?: number;
  unit?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldGroup, width ? { width } : styles.fieldGrow]}>
      {/* Le caselle della data non hanno etichetta propria: la porta la riga. */}
      {label ? <Text style={type.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocus]}>
        <TextInput
          style={[styles.input, keyboard === 'number-pad' && tabular]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboard === 'number-pad' ? 'number-pad' : 'default'}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize ?? 'words'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Modifica dei dati anagrafici dell'atleta.
 *
 * Esisteva già nel portale del coach ma non nell'app: chi sbagliava il nome in
 * registrazione se lo teneva per sempre, e altezza, sesso e data di nascita —
 * che servono al coach per calcolare i macro — non erano compilabili da qui.
 *
 * Scrive SOLO le colonne che la RLS concede all'utente su se stesso
 * (00004_security_fixes.sql): un payload con `id` o `role` farebbe fallire
 * l'intera scrittura con «permission denied for table profiles».
 */
export default function ModificaProfiloScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<Profile['sex']>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [height, setHeight] = useState('');

  const [headerH, setHeaderH] = useState(84);
  const [barH, setBarH] = useState(96);
  const [glassActivity, setGlassActivity] = useState(0);
  const glassActivityRef = useRef(0);

  const onContentScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = Math.max(0, Math.min(1, y / GLASS_RANGE));
    const current = glassActivityRef.current;
    if (next === current) return;
    const settled = next === 0 || next === 1;
    if (!settled && Math.abs(next - current) < GLASS_STEP) return;
    glassActivityRef.current = next;
    setGlassActivity(next);
  }, []);

  const load = useCallback(async () => {
    try {
      setFailed(false);

      // In demo si legge dalla stessa sorgente della scheda Profilo, altrimenti
      // i due schermi mostrerebbero due anagrafiche diverse.
      const p = isDemo()
        ? demoProfile()
        : await (async () => {
            const uid = await getUserId();
            if (!uid) return null;
            const { data, error: readError } = await supabase
              .from('profiles')
              .select('first_name, last_name, sex, date_of_birth, height_cm')
              .eq('id', uid)
              .maybeSingle();
            if (readError) throw new Error(readError.message);
            if (!data) throw new Error('Profilo non trovato.');
            return data as Pick<Profile, 'first_name' | 'last_name' | 'sex' | 'date_of_birth' | 'height_cm'>;
          })();
      if (!p) return;

      setFirstName(p.first_name ?? '');
      setLastName(p.last_name ?? '');
      setSex(p.sex ?? null);
      setHeight(p.height_cm != null ? String(p.height_cm).replace('.', ',') : '');
      if (p.date_of_birth) {
        const [y, m, d] = p.date_of_birth.split('-');
        setYear(y ?? '');
        setMonth(m ?? '');
        setDay(d ?? '');
      }
      setLoading(false);
    } catch (e) {
      setFailed(true);
      setLoading(false);
      showError(e, 'Errore di caricamento');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Costruisce la data solo se le tre caselle formano un giorno che esiste
   * davvero: `new Date(1990, 1, 31)` scivolerebbe al 3 marzo in silenzio.
   */
  function buildBirthDate(): { value: string | null; problem: string | null } {
    const filled = [day, month, year].filter((v) => v.trim().length > 0);
    if (filled.length === 0) return { value: null, problem: null };
    if (filled.length < 3) return { value: null, problem: 'Completa giorno, mese e anno della data di nascita.' };

    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    const built = new Date(y, m - 1, d);
    const valid =
      built.getFullYear() === y && built.getMonth() === m - 1 && built.getDate() === d && y >= 1900;
    if (!valid) return { value: null, problem: 'La data di nascita non esiste. Controlla giorno, mese e anno.' };
    if (built.getTime() > Date.now()) return { value: null, problem: 'La data di nascita è nel futuro.' };
    // Data "solo giorno": mai toISOString, che di notte sposta il giorno indietro.
    return { value: localDateString(built), problem: null };
  }

  async function save() {
    setError(null);

    const birth = buildBirthDate();
    if (birth.problem) {
      tapError();
      setError(birth.problem);
      return;
    }

    let heightCm: number | null = null;
    if (height.trim()) {
      const n = parseNum(height);
      if (n == null || n < HEIGHT_MIN || n > HEIGHT_MAX) {
        tapError();
        setError(`L'altezza deve essere fra ${HEIGHT_MIN} e ${HEIGHT_MAX} cm.`);
        return;
      }
      // La colonna è numeric(5,1): un decimale, non di più.
      heightCm = Math.round(n * 10) / 10;
    }

    if (!firstName.trim()) {
      tapError();
      setError('Il nome non può restare vuoto.');
      return;
    }

    if (isDemo()) {
      setError('In modalità demo i dati non vengono salvati: serve un account vero.');
      return;
    }

    setSaving(true);
    try {
      const uid = await getUserId();
      if (!uid) throw new Error('Sessione scaduta, effettua di nuovo l’accesso.');

      // Solo le colonne concesse dalla RLS, più updated_at (nessun trigger la scrive).
      const { error: writeError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          sex,
          date_of_birth: birth.value,
          height_cm: heightCm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uid);
      if (writeError) throw new Error(writeError.message);

      router.back();
    } catch (e) {
      showError(e, 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  }

  return (
    // Toccando fuori dai campi la tastiera si chiude: sul telefono è il gesto atteso.
    <Pressable style={sharedStyles.screen} onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: headerH + spacing.lg, paddingBottom: barH + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onContentScroll}
          scrollEventThrottle={16}
        >
          {loading ? (
            <Card>
              <Skeleton width={140} height={12} />
              <Skeleton height={52} round={FIELD_RADIUS} />
              <Skeleton height={52} round={FIELD_RADIUS} />
            </Card>
          ) : failed ? (
            <EmptyState
              emoji="📡"
              title="Dati non disponibili"
              message="Non riesco a caricare i tuoi dati. Controlla la connessione e riprova."
              action={
                <PrimaryButton
                  label="Riprova"
                  onPress={() => {
                    setLoading(true);
                    void load();
                  }}
                />
              }
            />
          ) : (
            <>
              <Appear delay={appearDelay(0)}>
                <Card>
                  <SectionHead icon="person" title="Come ti chiami" />
                  <Field
                    label="Nome"
                    value={firstName}
                    onChange={(v) => {
                      setFirstName(v);
                      if (error) setError(null);
                    }}
                    placeholder="Il tuo nome"
                  />
                  <Field
                    label="Cognome"
                    value={lastName}
                    onChange={setLastName}
                    placeholder="Il tuo cognome"
                  />
                </Card>
              </Appear>

              {/* Questi tre campi non sono anagrafica per l'anagrafica: il coach
                  ci calcola sopra fabbisogno e macro. */}
              <Appear delay={appearDelay(1)}>
                <Card>
                  <SectionHead
                    icon="body"
                    tint={colors.cyan}
                    title="I tuoi dati"
                    subtitle="Servono al coach per calcolare fabbisogno e macro."
                  />

                  <View style={styles.fieldGroup}>
                    <Text style={type.label}>Sesso</Text>
                    <View style={styles.segments}>
                      {SEX_OPTIONS.map((opt) => {
                        const active = sex === opt.value;
                        return (
                          <Press
                            key={opt.value}
                            style={[styles.segment, active && styles.segmentActive]}
                            // Ritoccare la voce accesa la spegne: si può anche non dirlo.
                            onPress={() => setSex(active ? null : opt.value)}
                            accessibilityLabel={opt.label}
                          >
                            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                              {opt.label}
                            </Text>
                          </Press>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={type.label}>Data di nascita</Text>
                    <View style={styles.dateRow}>
                      <Field
                        label=""
                        value={day}
                        onChange={setDay}
                        placeholder="GG"
                        keyboard="number-pad"
                        maxLength={2}
                        width={72}
                      />
                      <Field
                        label=""
                        value={month}
                        onChange={setMonth}
                        placeholder="MM"
                        keyboard="number-pad"
                        maxLength={2}
                        width={72}
                      />
                      <Field
                        label=""
                        value={year}
                        onChange={setYear}
                        placeholder="AAAA"
                        keyboard="number-pad"
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <Field
                    label="Altezza"
                    value={height}
                    onChange={(v) => {
                      setHeight(v);
                      if (error) setError(null);
                    }}
                    placeholder="178"
                    keyboard="number-pad"
                    maxLength={5}
                    unit="cm"
                  />
                </Card>
              </Appear>

              {/* L'errore vive accanto ai campi, non in una finestra di sistema
                  che copre ciò che hai appena scritto. */}
              {error ? (
                <Appear delay={0}>
                  <View style={styles.error} accessibilityRole="alert">
                    <Ionicons name="alert-circle" size={18} color={colors.rose} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                </Appear>
              ) : null}
            </>
          )}
        </ScrollView>

        {/* VETRO — testata ancorata, si accende col contenuto che le scorre sotto. */}
        <View
          style={styles.headerAnchor}
          pointerEvents="box-none"
          onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        >
          <GlassSurface cornerRadius={radius.xl} padding={spacing.md} activity={glassActivity}>
            <View style={styles.headerRow}>
              <Press style={styles.glassBtn} onPress={() => router.back()} accessibilityLabel="Torna indietro">
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </Press>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Modifica profilo
                </Text>
                <Text style={styles.headerMeta} numberOfLines={1}>
                  Nome, dati corporei
                </Text>
              </View>
            </View>
          </GlassSurface>
        </View>

        {/* VETRO — l'unica azione, ancorata sotto il pollice. */}
        <View
          style={styles.barAnchor}
          pointerEvents="box-none"
          onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        >
          <GlassSurface cornerRadius={radius.xl} padding={spacing.md} activity={glassActivity}>
            <PrimaryButton label="SALVA" onPress={save} loading={saving} disabled={loading || failed} />
          </GlassSurface>
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },

  // --- VETRO: testata e barra d'azione ---
  headerAnchor: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerMeta: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  barAnchor: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },

  // --- FERRO: campi ---
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldGrow: {
    flex: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: colors.raised,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.lg,
  },
  // A fuoco: bordo blu da 1px, nessun cambio di misura — il layout non salta.
  fieldFocus: {
    borderColor: colors.accent,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 14,
  },
  unit: {
    ...type.muted,
    marginLeft: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: 'rgba(10,132,255,0.16)',
    borderColor: colors.accent,
  },
  segmentText: {
    ...type.callout,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.rose,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
});
