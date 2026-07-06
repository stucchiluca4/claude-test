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
import type { CoachClient } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, spacing, sharedStyles } from '../../lib/theme';
import { mondayOfCurrentWeek, parseNum, showError } from '../../lib/utils';
import { getActiveCoachClient, getUserId } from '../../lib/queries';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';

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

const SCALES: { key: ScaleKey; label: string }[] = [
  { key: 'sleep_quality', label: 'Qualità del sonno' },
  { key: 'energy_level', label: 'Energia' },
  { key: 'stress_level', label: 'Stress' },
  { key: 'hunger_level', label: 'Fame' },
  { key: 'muscle_soreness', label: 'Dolori muscolari (DOMS)' },
  { key: 'joint_stress', label: 'Stress articolare' },
  { key: 'recovery', label: 'Recupero' },
  { key: 'training_adherence', label: 'Aderenza agli allenamenti' },
  { key: 'nutrition_adherence', label: 'Aderenza alla dieta' },
];

/** Scala 1-10 con dieci pallini tappabili (niente librerie esterne). */
function DotScale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.scaleBox}>
      <View style={styles.scaleHeader}>
        <Text style={styles.scaleLabel}>{label}</Text>
        <Text style={styles.scaleValue}>{value != null ? `${value}/10` : '—'}</Text>
      </View>
      <View style={styles.dotsRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value != null && n <= value;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.dot, active && styles.dotActive]}
              hitSlop={4}
            />
          );
        })}
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
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Preparo il check-in…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹ Indietro</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Check-in settimanale</Text>
        </View>

        {!coachClient ? (
          <View style={sharedStyles.center}>
            <Text style={sharedStyles.body}>
              Il check-in si sblocca quando sei collegato a un coach.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={sharedStyles.content} keyboardShouldPersistTaps="handled">
            <Card title="Peso">
              <TextInput
                style={sharedStyles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="Peso in kg (es. 72,5)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </Card>

            <Card title="Come è andata la settimana?">
              {SCALES.map(({ key, label }) => (
                <DotScale
                  key={key}
                  label={label}
                  value={scales[key]}
                  onChange={(v) => setScales((prev) => ({ ...prev, [key]: v }) as typeof prev)}
                />
              ))}
            </Card>

            <Card title="Passi e note">
              <TextInput
                style={sharedStyles.input}
                value={steps}
                onChangeText={setSteps}
                placeholder="Passi medi giornalieri (es. 8000)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />
              <TextInput
                style={[sharedStyles.input, styles.notes]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Note per il coach (facoltative)"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </Card>

            <PrimaryButton label="INVIA CHECK-IN" onPress={submit} loading={saving} />
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
  scaleBox: {
    gap: spacing.sm,
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  scaleValue: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  notes: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
