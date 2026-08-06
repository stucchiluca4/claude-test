import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { HEALTH_PROVIDERS } from '@wc/shared';
import type { HealthSource } from '@wc/shared';
import {
  colors,
  concentric,
  radius,
  shadow,
  spacing,
  sharedStyles,
  tabular,
  type,
  wash,
} from '../lib/theme';
import { localDateString, parseNum, showError } from '../lib/utils';
import { getActiveCoachClient, getBiofeedbackByDate, getUserId, upsertDailyBiofeedback } from '../lib/queries';
import { Appear, appearDelay } from '../components/Appear';
import { Card } from '../components/Card';
import { GlassSurface } from '../components/Glass';
import { Press } from '../components/Press';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHead } from '../components/SectionHead';

/** Corsa di scorrimento entro cui il vetro si accende del tutto (px). */
const GLASS_RANGE = 120;

/** Scatto minimo sotto il quale non vale la pena ridisegnare il vetro. */
const GLASS_STEP = 0.05;

/** Un'icona per ogni provider: niente emoji sui controlli. */
const PROVIDER_ICON: Partial<Record<HealthSource, keyof typeof Ionicons.glyphMap>> = {
  apple_health: 'logo-apple',
  health_connect: 'logo-google',
  google_fit: 'logo-google',
  whoop: 'pulse',
  garmin: 'watch',
  fitbit: 'watch',
  oura: 'ellipse-outline',
  withings: 'speedometer',
  samsung_health: 'phone-portrait',
  polar: 'snow',
  coros: 'compass',
  strava: 'bicycle',
};

/** Campo numerico su FERRO: cifra grande e tabulare, unità di misura a destra. */
function NumberField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  decimal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  unit?: string;
  decimal?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={type.label} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
      <View style={styles.fieldBox}>
        <TextInput
          style={[styles.fieldInput, tabular]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        />
        {unit ? <Text style={styles.fieldUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function SaluteScreen() {
  const router = useRouter();
  const [coachClientId, setCoachClientId] = useState<string | null>(null);
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Altezze dei due livelli in vetro: il ferro scorre sotto senza finirci dietro.
  const [headerH, setHeaderH] = useState(84);
  const [barH, setBarH] = useState(96);
  // Quanto contenuto sta passando sotto il vetro (0 fermo, 1 dopo ~120px).
  const [glassActivity, setGlassActivity] = useState(0);
  const glassActivityRef = useRef(0);

  /**
   * Accende testata e barra in base a quanto contenuto gli è passato sotto: da 0
   * a 1 nei primi 120px, con scatti di 0.05 così non si ridisegna a ogni frame.
   */
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
      const uid = await getUserId();
      if (!uid) return;
      const cc = await getActiveCoachClient(uid);
      setCoachClientId(cc?.id ?? null);
      if (cc) {
        const bf = await getBiofeedbackByDate(cc.id, localDateString(new Date()));
        if (bf) {
          setSteps(bf.steps != null ? String(bf.steps) : '');
          setSleep(bf.sleep_hours != null ? String(bf.sleep_hours) : '');
          setWeight(bf.weight_kg != null ? String(bf.weight_kg) : '');
        }
      }
    } catch (e) {
      showError(e, 'Errore di caricamento');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveManual() {
    if (!coachClientId) return;
    setSaving(true);
    setSaved(false);
    try {
      await upsertDailyBiofeedback({
        coach_client_id: coachClientId,
        log_date: localDateString(new Date()),
        steps: steps ? Math.round(parseNum(steps) ?? 0) : null,
        sleep_hours: sleep ? parseNum(sleep) : null,
        weight_kg: weight ? parseNum(weight) : null,
      });
      setSaved(true);
    } catch (e) {
      showError(e, 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  }

  const providers = HEALTH_PROVIDERS.filter((p) => p.id !== 'manual');

  return (
    <SafeAreaView style={sharedStyles.screen}>
      {/* FERRO: tutto ciò che si legge e si compila scorre qui sotto, opaco. */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerH + spacing.lg,
            paddingBottom: (coachClientId ? barH : 0) + spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onContentScroll}
        scrollEventThrottle={16}
      >
        {/* IL FARO: i dati di oggi, l'unica cosa che si compila in questa schermata. */}
        <Appear delay={appearDelay(0)}>
          <Card beacon={colors.cyan} style={shadow.beacon(colors.cyan)}>
            <SectionHead icon="create" tint={colors.cyan} title="Oggi, a mano" />
            {coachClientId ? (
              <View style={styles.fieldRow}>
                <NumberField label="Passi" value={steps} onChange={setSteps} placeholder="8500" />
                <NumberField
                  label="Sonno"
                  value={sleep}
                  onChange={setSleep}
                  placeholder="7,5"
                  unit="h"
                  decimal
                />
                <NumberField
                  label="Peso"
                  value={weight}
                  onChange={setWeight}
                  placeholder="72,5"
                  unit="kg"
                  decimal
                />
              </View>
            ) : (
              <Text style={styles.body}>
                Collega un coach per registrare i tuoi dati di salute giornalieri.
              </Text>
            )}
          </Card>
        </Appear>

        {/* Entra dopo il faro: la lista dei provider è il secondo gradino. */}
        <Appear delay={appearDelay(1)}>
          <Card>
            <SectionHead
              icon="sync"
              tint={colors.textSecondary}
              title="Connetti un'app o un dispositivo"
            />
            <Text style={styles.note}>
              La sincronizzazione automatica arriverà con l'app installata dagli store. Per ora puoi
              inserire i dati a mano qui sopra.
            </Text>

            {/* La lista si muove come un blocco solo: nessuna riga anima da sola. */}
            <View style={styles.providerList}>
              {providers.map((p) => (
                <Press
                  key={p.id}
                  haptic="light"
                  style={styles.providerRow}
                  accessibilityLabel={p.label}
                  onPress={() =>
                    Alert.alert(
                      p.label,
                      p.available
                        ? 'Collegamento disponibile.'
                        : 'Disponibile a breve: la connessione automatica richiede l\'app installata dallo store (build nativa).',
                    )
                  }
                >
                  <View style={[styles.providerIcon, p.available && styles.providerIconOn]}>
                    <Ionicons
                      name={PROVIDER_ICON[p.id] ?? 'pulse'}
                      size={20}
                      color={p.available ? colors.accent : colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.providerLabel} numberOfLines={1}>
                    {p.label}
                  </Text>
                  <View style={[styles.badge, p.available ? styles.badgeOn : styles.badgeSoon]}>
                    <Text
                      style={[
                        styles.badgeText,
                        { color: p.available ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {p.available ? 'Disponibile' : 'Presto'}
                    </Text>
                  </View>
                </Press>
              ))}
            </View>
          </Card>
        </Appear>
      </ScrollView>

      {/* VETRO 1 — testata compatta ancorata. */}
      <View
        style={styles.headerAnchor}
        pointerEvents="box-none"
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        {/* Il vetro si accende solo quando il contenuto gli scorre sotto. */}
        <GlassSurface cornerRadius={radius.xl} padding={spacing.md} activity={glassActivity}>
          <View style={styles.headerRow}>
            <Press
              style={styles.glassBtn}
              onPress={() => router.back()}
              accessibilityLabel="Torna indietro"
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Press>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Integrazioni salute
              </Text>
              <Text style={styles.headerMeta} numberOfLines={1}>
                Sonno, passi e peso di oggi
              </Text>
            </View>
          </View>
        </GlassSurface>
      </View>

      {/* VETRO 2 — l'unica azione, ancorata sotto il pollice. */}
      {coachClientId ? (
        <View
          style={styles.barAnchor}
          pointerEvents="box-none"
          onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        >
          <GlassSurface cornerRadius={radius.xl} padding={spacing.md} activity={glassActivity}>
            <PrimaryButton
              label={saved ? 'SALVATO' : 'SALVA I DATI DI OGGI'}
              variant={saved ? 'success' : 'primary'}
              loading={saving}
              onPress={saveManual}
            />
          </GlassSurface>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** Raggio interno delle card (26 − 16): le curve restano parallele. */
const innerRadius = concentric(radius.lg, spacing.lg);

const styles = StyleSheet.create({
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

  // --- FERRO: sezioni ---
  body: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
  },
  note: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
  },

  // --- FERRO: campi ---
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  field: {
    flex: 1,
    gap: spacing.sm,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  fieldInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  fieldUnit: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },

  // --- FERRO: righe dei provider ---
  providerList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 60,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    // Velo neutro: bianco al 6%, l'unico che non porta un segnale.
    backgroundColor: wash(colors.textPrimary, 0.06),
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerIconOn: {
    backgroundColor: wash(colors.accent, 0.12),
  },
  providerLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  badge: {
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeOn: {
    borderColor: wash(colors.accent, 0.45),
    backgroundColor: wash(colors.accent, 0.12),
  },
  badgeSoon: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
