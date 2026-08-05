import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
} from '../lib/theme';
import { localDateString, parseNum, showError } from '../lib/utils';
import { getActiveCoachClient, getBiofeedbackByDate, getUserId, upsertDailyBiofeedback } from '../lib/queries';
import { Card } from '../components/Card';
import { GlassSurface } from '../components/Glass';
import { Press } from '../components/Press';
import { PrimaryButton } from '../components/PrimaryButton';

/** Veli dei segnali: colore al 12%, solo dietro le icone. */
const WASH = {
  cyan: 'rgba(100,210,255,0.12)',
  blue: 'rgba(10,132,255,0.12)',
  neutral: 'rgba(255,255,255,0.06)',
} as const;

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

/** Testata di sezione: icona del segnale + etichetta. Il colore non viaggia mai da solo. */
function SectionHead({
  icon,
  label,
  tint,
  wash,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  wash: string;
}) {
  return (
    <View style={styles.head}>
      <View style={[styles.headIcon, { backgroundColor: wash }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[type.label, styles.headLabel]}>{label}</Text>
    </View>
  );
}

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
      >
        {/* IL FARO: i dati di oggi, l'unica cosa che si compila in questa schermata. */}
        <Card beacon={colors.cyan} style={shadow.beacon(colors.cyan)}>
          <SectionHead icon="create" tint={colors.cyan} wash={WASH.cyan} label="Oggi, a mano" />
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

        <Card>
          <SectionHead
            icon="sync"
            tint={colors.textSecondary}
            wash={WASH.neutral}
            label="Connetti un'app o un dispositivo"
          />
          <Text style={styles.note}>
            La sincronizzazione automatica arriverà con l'app installata dagli store. Per ora puoi
            inserire i dati a mano qui sopra.
          </Text>

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
      </ScrollView>

      {/* VETRO 1 — testata compatta ancorata. */}
      <View
        style={styles.headerAnchor}
        pointerEvents="box-none"
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        <GlassSurface cornerRadius={radius.xl} padding={spacing.md}>
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
          <GlassSurface cornerRadius={radius.xl} padding={spacing.md}>
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
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headLabel: {
    flex: 1,
  },
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
    backgroundColor: WASH.neutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerIconOn: {
    backgroundColor: WASH.blue,
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
    borderColor: 'rgba(10,132,255,0.45)',
    backgroundColor: WASH.blue,
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
