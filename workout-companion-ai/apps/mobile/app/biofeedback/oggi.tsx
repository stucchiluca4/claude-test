import { useCallback, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { DAYS_OF_WEEK } from '@wc/shared';
import type { CoachClient, NutritionDay } from '@wc/shared';
import {
  colors,
  concentric,
  radius,
  shadow,
  spacing,
  sharedStyles,
  tabular,
  type,
} from '../../lib/theme';
import { localDateString, parseNum, showError } from '../../lib/utils';
import {
  getActiveCoachClient,
  getBiofeedbackBetween,
  getTodayNutritionDay,
  getUserId,
  upsertDailyBiofeedback,
  type DailyBiofeedback,
} from '../../lib/queries';
import { ActivityRing } from '../../components/ActivityRing';
import { Card } from '../../components/Card';
import { DotScale } from '../../components/DotScale';
import { GlassSurface } from '../../components/Glass';
import { MetricBlock } from '../../components/MetricBlock';
import { Press } from '../../components/Press';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SectionHead } from '../../components/SectionHead';
import { EmptyState, LoadingState } from '../../components/States';

type ScaleKey =
  | 'sleep_quality'
  | 'stress_level'
  | 'energy_level'
  | 'muscle_soreness'
  | 'joint_stress'
  | 'recovery';

/**
 * Ogni scala porta il segnale del suo significato: ciano per il corpo che
 * recupera, ambra per lo sforzo e il dolore, menta per l'energia disponibile.
 */
const SCALES: {
  key: ScaleKey;
  label: string;
  bands: readonly [string, string, string];
  tint: string;
}[] = [
  { key: 'sleep_quality', label: 'Qualità del sonno', bands: ['Scarsa', 'Buona', 'Ottima'], tint: colors.cyan },
  { key: 'stress_level', label: 'Livello di stress', bands: ['Basso', 'Moderato', 'Alto'], tint: colors.amber },
  { key: 'energy_level', label: 'Livello di energia', bands: ['Basso', 'Moderato', 'Alto'], tint: colors.mint },
  { key: 'muscle_soreness', label: 'Dolore muscolare', bands: ['Leggero', 'Moderato', 'Alto'], tint: colors.amber },
  { key: 'joint_stress', label: 'Stress articolare', bands: ['Leggero', 'Moderato', 'Alto'], tint: colors.amber },
  { key: 'recovery', label: 'Stato di recupero', bands: ['Scarso', 'Buono', 'Ottimo'], tint: colors.cyan },
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

/** Campo numerico su FERRO: cifra grande e tabulare, unità di misura a destra. */
function NumberField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  target,
  decimal,
  grow,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  unit?: string;
  target?: string | null;
  decimal?: boolean;
  /** Da attivare quando il campo vive in una riga con altri campi. */
  grow?: boolean;
}) {
  return (
    <View style={[styles.field, grow && styles.fieldGrow]}>
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
      {target ? (
        <Text style={[styles.fieldTarget, tabular]} numberOfLines={1}>
          su {target}
        </Text>
      ) : null}
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

  // Altezze dei due livelli in vetro: il ferro scorre sotto senza finirci dietro.
  const [headerH, setHeaderH] = useState(84);
  const [barH, setBarH] = useState(96);

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
    return <LoadingState message="Preparo il check di oggi…" />;
  }

  const selected = new Date(`${selectedDate}T00:00:00`);

  // L'unico numero dominante: quante scale hai già raccontato.
  const answered = SCALES.filter((s) => scales[s.key] != null).length;
  const complete = answered === SCALES.length;
  const heroTone = complete ? colors.mint : colors.cyan;
  const heroCaption = complete
    ? 'Stato completo: puoi salvare il check.'
    : answered === 0
      ? 'Tocca le barre qui sotto: bastano trenta secondi.'
      : `Manca${SCALES.length - answered === 1 ? '' : 'no'} ${SCALES.length - answered} rispost${SCALES.length - answered === 1 ? 'a' : 'e'}.`;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!coachClient ? (
          <View style={[styles.emptyWrap, { paddingTop: headerH }]}>
            <EmptyState
              emoji="🤝"
              title="Nessun coach collegato"
              message="Il check biofeedback si sblocca quando sei collegato a un coach. Quando il tuo coach ti aggiungerà potrai registrare qui sonno, energia, nutrizione e molto altro."
            />
          </View>
        ) : (
          /* FERRO: tutto ciò che si legge e si compila scorre qui sotto, opaco. */
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: headerH + spacing.lg, paddingBottom: barH + spacing.xxl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.weekStrip}>
              {weekDates.map((d, i) => {
                const dateStr = localDateString(d);
                const isToday = dateStr === today;
                const isFuture = dateStr > today;
                const isSelected = dateStr === selectedDate;
                const hasEntry = weekEntries[dateStr] != null;
                return (
                  <View key={dateStr} style={styles.dayCell}>
                    <Press
                      onPress={() => selectDay(dateStr)}
                      disabled={isFuture}
                      haptic="light"
                      scaleTo={0.94}
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipOn,
                        isFuture && styles.dayChipOff,
                      ]}
                      accessibilityLabel={`${DAYS_OF_WEEK[i]} ${d.getDate()}`}
                    >
                      <Text style={[styles.dayAbbrev, isSelected && styles.dayTextOn]}>
                        {DAYS_OF_WEEK[i].slice(0, 3).toUpperCase()}
                      </Text>
                      <Text style={[styles.dayNumber, tabular]}>{d.getDate()}</Text>
                      <View
                        style={[
                          styles.dayDot,
                          hasEntry && styles.dayDotDone,
                          isToday && !hasEntry && styles.dayDotToday,
                          isSelected && !hasEntry && styles.dayDotOnSelected,
                        ]}
                      />
                    </Press>
                  </View>
                );
              })}
            </View>

            {/* IL FARO: l'avanzamento del check, letto in tre secondi dall'anello. */}
            <Card beacon={heroTone} style={shadow.beacon(heroTone)}>
              <MetricBlock
                value={String(answered)}
                unit={`su ${SCALES.length}`}
                label="Stato del check"
                caption={heroCaption}
                color={heroTone}
                trailing={
                  <ActivityRing
                    progress={answered / SCALES.length}
                    color={heroTone}
                    size={84}
                    strokeWidth={11}
                  >
                    <Ionicons
                      name={complete ? 'checkmark' : 'pulse'}
                      size={28}
                      color={heroTone}
                    />
                  </ActivityRing>
                }
              />
            </Card>

            <Card>
              <SectionHead
                icon="information-circle"
                tint={colors.textSecondary}
                title="Perché è importante"
              />
              <Text style={styles.note}>
                Le tue risposte ci aiutano ad adattare il programma e migliorare performance e
                recupero.
              </Text>
            </Card>

            <Card>
              <SectionHead icon="pulse" tint={colors.cyan} title="Stato generale" />
              <View style={styles.scaleGroup}>
                {SCALES.map(({ key, label, bands, tint }) => (
                  <View key={key} style={styles.scaleBlock}>
                    <DotScale
                      label={label}
                      bands={bands}
                      tint={tint}
                      value={scales[key]}
                      onChange={(v) => setScales((prev) => ({ ...prev, [key]: v }) as typeof prev)}
                    />
                    {key === 'sleep_quality' ? (
                      <NumberField
                        label="Ore di sonno"
                        value={sleepHours}
                        onChange={setSleepHours}
                        placeholder="7,5"
                        unit="h"
                        decimal
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <SectionHead icon="nutrition" tint={colors.amber} title="Nutrizione" />
              <View style={styles.fieldRow}>
                <NumberField
                  grow
                  label="Carboidrati"
                  value={carbs}
                  onChange={setCarbs}
                  placeholder="0"
                  unit="g"
                  target={nutritionDay ? `${nutritionDay.carbs_g} g` : null}
                />
                <NumberField
                  grow
                  label="Proteine"
                  value={protein}
                  onChange={setProtein}
                  placeholder="0"
                  unit="g"
                  target={nutritionDay ? `${nutritionDay.protein_g} g` : null}
                />
                <NumberField
                  grow
                  label="Grassi"
                  value={fat}
                  onChange={setFat}
                  placeholder="0"
                  unit="g"
                  target={nutritionDay ? `${nutritionDay.fat_g} g` : null}
                />
              </View>
            </Card>

            <Card>
              <SectionHead icon="footsteps" tint={colors.cyan} title="Altre metriche" />
              <View style={styles.fieldRow}>
                <NumberField
                  grow
                  label="Idratazione"
                  value={hydration}
                  onChange={setHydration}
                  placeholder="2,5"
                  unit="l"
                  decimal
                />
                <NumberField grow label="Passi" value={steps} onChange={setSteps} placeholder="8000" />
              </View>
              <View style={styles.fieldRow}>
                <NumberField
                  grow
                  label="Kcal consumate"
                  value={kcal}
                  onChange={setKcal}
                  placeholder="0"
                  target={nutritionDay ? `${nutritionDay.kcal} kcal` : null}
                />
                <NumberField
                  grow
                  label="Peso (facoltativo)"
                  value={weight}
                  onChange={setWeight}
                  placeholder="72,5"
                  unit="kg"
                  decimal
                />
              </View>
            </Card>

            <Card>
              <SectionHead icon="create" tint={colors.textSecondary} title="Note libere" />
              <TextInput
                style={styles.notes}
                value={notes}
                onChangeText={setNotes}
                placeholder="Come ti senti oggi? Scrivi qui qualsiasi cosa utile per il coach."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </Card>
          </ScrollView>
        )}

        {/* VETRO 1 — testata compatta ancorata: indietro, titolo, giorno scelto. */}
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
                  Check biofeedback
                </Text>
                <Text style={styles.headerMeta} numberOfLines={1}>
                  {italianDateLabel(selected)}
                </Text>
              </View>
            </View>
          </GlassSurface>
        </View>

        {/* VETRO 2 — l'unica azione, ancorata sotto il pollice. */}
        {coachClient ? (
          <View
            style={styles.barAnchor}
            pointerEvents="box-none"
            onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
          >
            <GlassSurface cornerRadius={radius.xl} padding={spacing.md}>
              <PrimaryButton label="SALVA CHECK" onPress={save} loading={saving} />
            </GlassSurface>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Raggio interno delle card (26 − 16): le curve restano parallele. */
const innerRadius = concentric(radius.lg, spacing.lg);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
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

  // --- FERRO: la settimana ---
  weekStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayCell: {
    flex: 1,
  },
  dayChip: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  /** Selezionato: pieno Blu Segnale, lo stato attivo del sistema. */
  dayChipOn: {
    backgroundColor: colors.accent,
  },
  dayChipOff: {
    opacity: 0.35,
  },
  dayAbbrev: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  dayTextOn: {
    color: colors.textPrimary,
  },
  dayNumber: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  /** Menta: quel giorno è già stato raccontato. */
  dayDotDone: {
    backgroundColor: colors.mint,
  },
  dayDotToday: {
    backgroundColor: colors.accent,
  },
  dayDotOnSelected: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  // --- FERRO: sezioni ---
  note: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
  },
  scaleGroup: {
    gap: spacing.xl,
  },
  scaleBlock: {
    gap: spacing.md,
  },

  // --- FERRO: campi ---
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  field: {
    gap: spacing.sm,
  },
  fieldGrow: {
    flex: 1,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  fieldTarget: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  notes: {
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
    padding: spacing.lg,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
