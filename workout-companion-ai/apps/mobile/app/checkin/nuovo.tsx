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
import type { CoachClient } from '@wc/shared';
import { supabase } from '../../lib/supabase';
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
import { mondayOfCurrentWeek, parseNum, showError } from '../../lib/utils';
import { getActiveCoachClient, getUserId } from '../../lib/queries';
import { Card } from '../../components/Card';
import { DotScale } from '../../components/DotScale';
import { GlassSurface } from '../../components/Glass';
import { Press } from '../../components/Press';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SectionHead } from '../../components/SectionHead';
import { EmptyState, LoadingState } from '../../components/States';

type ScaleKey =
  | 'sleep_quality'
  | 'stress_level'
  | 'energy_level'
  | 'hunger_level'
  | 'muscle_soreness'
  | 'joint_stress'
  | 'recovery'
  | 'training_adherence'
  | 'nutrition_adherence';

/**
 * Ogni scala porta il segnale del suo significato: ciano per il corpo che
 * recupera, ambra per lo sforzo e il disagio, menta per ciò che è andato fatto.
 */
const SCALES: { key: ScaleKey; label: string; tint: string }[] = [
  { key: 'sleep_quality', label: 'Qualità del sonno', tint: colors.cyan },
  { key: 'energy_level', label: 'Energia', tint: colors.mint },
  { key: 'stress_level', label: 'Stress', tint: colors.amber },
  { key: 'hunger_level', label: 'Fame', tint: colors.amber },
  { key: 'muscle_soreness', label: 'Dolori muscolari (DOMS)', tint: colors.amber },
  { key: 'joint_stress', label: 'Stress articolare', tint: colors.amber },
  { key: 'recovery', label: 'Recupero', tint: colors.cyan },
  { key: 'training_adherence', label: 'Aderenza agli allenamenti', tint: colors.mint },
  { key: 'nutrition_adherence', label: 'Aderenza alla dieta', tint: colors.mint },
];

/** "2026-05-12" -> "12 maggio". */
function italianDayMonth(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
  });
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

export default function NuovoCheckinScreen() {
  const [coachClient, setCoachClient] = useState<CoachClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState('');
  const [steps, setSteps] = useState('');
  const [notes, setNotes] = useState('');
  const [scales, setScales] = useState<Record<ScaleKey, number | null>>({
    sleep_quality: null,
    stress_level: null,
    energy_level: null,
    hunger_level: null,
    muscle_soreness: null,
    joint_stress: null,
    recovery: null,
    training_adherence: null,
    nutrition_adherence: null,
  });
  // Altezze dei due livelli in vetro: il ferro scorre sotto senza finirci dietro.
  const [headerH, setHeaderH] = useState(84);
  const [barH, setBarH] = useState(96);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const uid = await getUserId();
      if (!uid) return;
      setCoachClient(await getActiveCoachClient(uid));
    } catch (e) {
      showError(e, 'Errore di caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!coachClient) return;
    const weightKg = parseNum(weight);
    if (weightKg == null) {
      Alert.alert('Peso mancante', 'Inserisci il tuo peso di questa settimana.');
      return;
    }
    setSaving(true);
    try {
      const stepsNum = parseNum(steps);
      // Le aderenze in DB sono 0-100: la scala 1-10 viene moltiplicata per 10.
      const payload = {
        coach_client_id: coachClient.id,
        week_start: mondayOfCurrentWeek(),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        weight_kg: weightKg,
        sleep_quality: scales.sleep_quality,
        stress_level: scales.stress_level,
        energy_level: scales.energy_level,
        hunger_level: scales.hunger_level,
        muscle_soreness: scales.muscle_soreness,
        joint_stress: scales.joint_stress,
        recovery: scales.recovery,
        training_adherence: scales.training_adherence != null ? scales.training_adherence * 10 : null,
        nutrition_adherence: scales.nutrition_adherence != null ? scales.nutrition_adherence * 10 : null,
        avg_steps: stepsNum != null ? Math.round(stepsNum) : null,
        client_notes: notes.trim() || null,
      };
      const { error } = await supabase
        .from('checkins')
        .upsert(payload, { onConflict: 'coach_client_id,week_start' });
      if (error) throw new Error(error.message);
      Alert.alert('Check-in inviato! ✅', 'Il tuo coach lo esaminerà a breve.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      showError(e, 'Invio non riuscito');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState message="Preparo il check-in…" />;
  }

  const answered = SCALES.filter((s) => scales[s.key] != null).length;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!coachClient ? (
          <View style={[styles.emptyWrap, { paddingTop: headerH }]}>
            <EmptyState
              emoji="🤝"
              title="Nessun coach collegato"
              message="Il check-in si sblocca quando sei collegato a un coach."
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
            {/* IL FARO: il peso è il dato che apre il check-in e senza il quale non parte. */}
            <Card beacon={colors.cyan} style={shadow.beacon(colors.cyan)}>
              <Text style={type.label}>Peso di questa settimana</Text>
              <View style={styles.weightBox}>
                <TextInput
                  style={[styles.weightInput, tabular]}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="72,5"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.weightUnit}>kg</Text>
              </View>
              <Text style={styles.note}>
                È il primo dato che il tuo coach guarda: senza peso il check-in non può partire.
              </Text>
            </Card>

            <Card>
              <SectionHead
                icon="pulse"
                tint={colors.cyan}
                title={`Come è andata · ${answered}/${SCALES.length}`}
              />
              <View style={styles.scaleGroup}>
                {SCALES.map(({ key, label, tint }) => (
                  <DotScale
                    key={key}
                    label={label}
                    tint={tint}
                    value={scales[key]}
                    onChange={(v) => setScales((prev) => ({ ...prev, [key]: v }) as typeof prev)}
                  />
                ))}
              </View>
            </Card>

            <Card>
              <SectionHead icon="footsteps" tint={colors.cyan} title="Passi" />
              <NumberField
                label="Passi medi al giorno"
                value={steps}
                onChange={setSteps}
                placeholder="8000"
              />
            </Card>

            <Card>
              <SectionHead icon="create" tint={colors.textSecondary} title="Note per il coach" />
              <TextInput
                style={styles.notes}
                value={notes}
                onChangeText={setNotes}
                placeholder="Come è andata davvero questa settimana? (facoltativo)"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </Card>
          </ScrollView>
        )}

        {/* VETRO 1 — testata compatta ancorata: indietro, titolo, settimana. */}
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
                  Check-in settimanale
                </Text>
                <Text style={styles.headerMeta} numberOfLines={1}>
                  Settimana dal {italianDayMonth(mondayOfCurrentWeek())}
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
              <PrimaryButton label="INVIA CHECK-IN" onPress={submit} loading={saving} />
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

  // --- FERRO: il peso, numero dominante della schermata ---
  weightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingHorizontal: spacing.lg,
    minHeight: 88,
  },
  weightInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    paddingVertical: spacing.md,
    minHeight: 88,
  },
  weightUnit: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
  },

  // --- FERRO: campi ---
  field: {
    gap: spacing.sm,
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
