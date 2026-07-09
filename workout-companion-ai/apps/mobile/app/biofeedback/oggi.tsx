import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { DAYS_OF_WEEK } from '@wc/shared';
import type { CoachClient, NutritionDay } from '@wc/shared';
import { colors, radius, spacing, sharedStyles } from '../../lib/theme';
import { localDateString, parseNum, showError } from '../../lib/utils';
import {
  getActiveCoachClient,
  getBiofeedbackBetween,
  getTodayNutritionDay,
  getUserId,
  upsertDailyBiofeedback,
  type DailyBiofeedback,
} from '../../lib/queries';
import { Card } from '../../components/Card';
import { DotScale } from '../../components/DotScale';
import { PrimaryButton } from '../../components/PrimaryButton';

type ScaleKey =
  | 'sleep_quality'
  | 'stress_level'
  | 'energy_level'
  | 'muscle_soreness'
  | 'joint_stress'
  | 'recovery';

const SCALES: { key: ScaleKey; label: string; emoji: string; bands: readonly [string, string, string] }[] = [
  { key: 'sleep_quality', label: 'Qualità del sonno', emoji: '😴', bands: ['Scarsa', 'Buona', 'Ottima'] },
  { key: 'stress_level', label: 'Livello di stress', emoji: '⚡', bands: ['Basso', 'Moderato', 'Alto'] },
  { key: 'energy_level', label: 'Livello di energia', emoji: '🔥', bands: ['Basso', 'Moderato', 'Alto'] },
  { key: 'muscle_soreness', label: 'Dolore muscolare', emoji: '💪', bands: ['Leggero', 'Moderato', 'Alto'] },
  { key: 'joint_stress', label: 'Stress articolare', emoji: '🦴', bands: ['Leggero', 'Moderato', 'Alto'] },
  { key: 'recovery', label: 'Stato di recupero', emoji: '❤️', bands: ['Scarso', 'Buono', 'Ottimo'] },
];

const EMPTY_SCALES: Record<ScaleKey, number | null> = {
  sleep_quality: null,
  stress_level: null,
  energy_level: null,
  muscle_soreness: null,
  joint_stress: null,
  recovery: null,
};

/** Le sette date (lun-dom) della settimana corrente. */
function currentWeekDates(): Date[] {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** "venerdì 17 maggio" -> "Venerdì 17 Maggio". */
function italianDateLabel(d: Date): string {
  return d
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Input numerico con etichetta e (facoltativo) obiettivo sotto. */
function MetricInput({
  label,
  value,
  onChange,
  placeholder,
  target,
  decimal,
  grow,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  target?: string | null;
  decimal?: boolean;
  /** Da attivare quando l'input vive in una riga con altri input. */
  grow?: boolean;
}) {
  return (
    <View style={[styles.metricBox, grow && styles.metricGrow]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <TextInput
        style={sharedStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      />
      {target ? <Text style={styles.metricTarget}>Obiettivo: {target}</Text> : null}
    </View>
  );
}

export default function BiofeedbackOggiScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coachClient, setCoachClient] = useState<CoachClient | null>(null);
  const [nutritionDay, setNutritionDay] = useState<NutritionDay | null>(null);
  const [weekEntries, setWeekEntries] = useState<Record<string, DailyBiofeedback>>({});
  const [selectedDate, setSelectedDate] = useState(localDateString(new Date()));

  const [scales, setScales] = useState<Record<ScaleKey, number | null>>(EMPTY_SCALES);
  const [sleepHours, setSleepHours] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [hydration, setHydration] = useState('');
  const [steps, setSteps] = useState('');
  const [kcal, setKcal] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const router = useRouter();
  const weekDates = currentWeekDates();
  const today = localDateString(new Date());

  const populate = useCallback((entry: DailyBiofeedback | null) => {
    setScales(
      entry
        ? {
            sleep_quality: entry.sleep_quality,
            stress_level: entry.stress_level,
            energy_level: entry.energy_level,
            muscle_soreness: entry.muscle_soreness,
            joint_stress: entry.joint_stress,
            recovery: entry.recovery,
          }
        : EMPTY_SCALES,
    );
    const asText = (n: number | null | undefined) => (n != null ? String(n) : '');
    setSleepHours(asText(entry?.sleep_hours));
    setCarbs(asText(entry?.carbs_g));
    setProtein(asText(entry?.protein_g));
    setFat(asText(entry?.fat_g));
    setHydration(asText(entry?.hydration_l));
    setSteps(asText(entry?.steps));
    setKcal(asText(entry?.kcal_consumed));
    setWeight(asText(entry?.weight_kg));
    setNotes(entry?.notes ?? '');
  }, []);

  const load = useCallback(async () => {
    try {
      const uid = await getUserId();
      if (!uid) return;
      const cc = await getActiveCoachClient(uid);
      setCoachClient(cc);
      if (!cc) return;

      setNutritionDay(await getTodayNutritionDay(cc.id));

      const dates = currentWeekDates();
      const entries = await getBiofeedbackBetween(
        cc.id,
        localDateString(dates[0]),
        localDateString(dates[6]),
      );
      const byDate: Record<string, DailyBiofeedback> = {};
      for (const e of entries) byDate[e.log_date] = e;
      setWeekEntries(byDate);
      populate(byDate[localDateString(new Date())] ?? null);
    } catch (e) {
      showError(e, 'Errore di caricamento');
    } finally {
      setLoading(false);
    }
  }, [populate]);

  useEffect(() => {
    load();
  }, [load]);

  function selectDay(dateStr: string) {
    if (dateStr > today) return; // niente check per i giorni futuri
    setSelectedDate(dateStr);
    populate(weekEntries[dateStr] ?? null);
  }

  async function save() {
    if (!coachClient) return;
    setSaving(true);
    try {
      const asInt = (v: string) => {
        const n = parseNum(v);
        return n != null ? Math.round(n) : null;
      };
      await upsertDailyBiofeedback({
        coach_client_id: coachClient.id,
        log_date: selectedDate,
        sleep_quality: scales.sleep_quality,
        sleep_hours: parseNum(sleepHours),
        stress_level: scales.stress_level,
        energy_level: scales.energy_level,
        muscle_soreness: scales.muscle_soreness,
        joint_stress: scales.joint_stress,
        recovery: scales.recovery,
        carbs_g: asInt(carbs),
        protein_g: asInt(protein),
        fat_g: asInt(fat),
        kcal_consumed: asInt(kcal),
        hydration_l: parseNum(hydration),
        steps: asInt(steps),
        weight_kg: parseNum(weight),
        notes: notes.trim() || null,
      });
      Alert.alert('Check salvato! ✅', 'Grazie: il tuo coach vedrà subito i tuoi dati.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      showError(e, 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Preparo il check di oggi…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selected = new Date(`${selectedDate}T00:00:00`);

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹ Indietro</Text>
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Check Biofeedback</Text>
            <Text style={sharedStyles.muted}>{italianDateLabel(selected)}</Text>
          </View>
        </View>

        {!coachClient ? (
          <View style={sharedStyles.center}>
            <Text style={sharedStyles.body}>
              Il check biofeedback si sblocca quando sei collegato a un coach. Quando il tuo coach ti
              aggiungerà potrai registrare qui sonno, energia, nutrizione e molto altro.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={sharedStyles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.weekStrip}>
              {weekDates.map((d, i) => {
                const dateStr = localDateString(d);
                const isToday = dateStr === today;
                const isFuture = dateStr > today;
                const isSelected = dateStr === selectedDate;
                const hasEntry = weekEntries[dateStr] != null;
                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => selectDay(dateStr)}
                    disabled={isFuture}
                    style={[styles.dayChip, isSelected && styles.dayChipSelected, isFuture && styles.dayChipFuture]}
                  >
                    <Text style={styles.dayAbbrev}>{DAYS_OF_WEEK[i].slice(0, 3).toUpperCase()}</Text>
                    <Text style={styles.dayNumber}>{d.getDate()}</Text>
                    <View style={[styles.dayDotRing, isToday && styles.dayDotRingToday]}>
                      <View style={[styles.dayDot, hasEntry && styles.dayDotDone]} />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Perché è importante?</Text>
              <Text style={styles.bannerText}>
                Le tue risposte ci aiutano ad adattare il programma e migliorare performance e recupero.
              </Text>
            </View>

            <Card title="Stato generale">
              {SCALES.map(({ key, label, emoji, bands }) => (
                <View key={key} style={styles.scaleBlock}>
                  <DotScale
                    label={label}
                    emoji={emoji}
                    bands={bands}
                    value={scales[key]}
                    onChange={(v) => setScales((prev) => ({ ...prev, [key]: v }) as typeof prev)}
                  />
                  {key === 'sleep_quality' ? (
                    <MetricInput
                      label="Ore di sonno"
                      value={sleepHours}
                      onChange={setSleepHours}
                      placeholder="Es. 7,5"
                      decimal
                    />
                  ) : null}
                </View>
              ))}
            </Card>

            <Card title="Nutrizione">
              <View style={styles.metricRow}>
                <MetricInput
                  grow
                  label="Carboidrati (g)"
                  value={carbs}
                  onChange={setCarbs}
                  placeholder="0"
                  target={nutritionDay ? `${nutritionDay.carbs_g}g` : null}
                />
                <MetricInput
                  grow
                  label="Proteine (g)"
                  value={protein}
                  onChange={setProtein}
                  placeholder="0"
                  target={nutritionDay ? `${nutritionDay.protein_g}g` : null}
                />
                <MetricInput
                  grow
                  label="Grassi (g)"
                  value={fat}
                  onChange={setFat}
                  placeholder="0"
                  target={nutritionDay ? `${nutritionDay.fat_g}g` : null}
                />
              </View>
            </Card>

            <Card title="Altre metriche">
              <View style={styles.metricRow}>
                <MetricInput
                  grow
                  label="Idratazione (l)"
                  value={hydration}
                  onChange={setHydration}
                  placeholder="Es. 2,5"
                  decimal
                />
                <MetricInput grow label="Passi" value={steps} onChange={setSteps} placeholder="Es. 8000" />
              </View>
              <View style={styles.metricRow}>
                <MetricInput
                  grow
                  label="Kcal consumate"
                  value={kcal}
                  onChange={setKcal}
                  placeholder="0"
                  target={nutritionDay ? `${nutritionDay.kcal} kcal` : null}
                />
                <MetricInput
                  grow
                  label="Peso (kg, opzionale)"
                  value={weight}
                  onChange={setWeight}
                  placeholder="Es. 72,5"
                  decimal
                />
              </View>
            </Card>

            <Card title="Note libere">
              <TextInput
                style={[sharedStyles.input, styles.notes]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Come ti senti oggi? Scrivi qui qualsiasi cosa utile per il coach."
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </Card>

            <PrimaryButton label="Salva check" onPress={save} loading={saving} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayChipSelected: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
  },
  dayChipFuture: {
    opacity: 0.4,
  },
  dayAbbrev: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  dayNumber: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dayDotRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayDotRingToday: {
    borderColor: colors.accent,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dayDotDone: {
    backgroundColor: colors.success,
  },
  banner: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  bannerTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  bannerText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  scaleBlock: {
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricBox: {
    gap: spacing.xs,
  },
  metricGrow: {
    flex: 1,
  },
  metricLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  metricTarget: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  notes: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
