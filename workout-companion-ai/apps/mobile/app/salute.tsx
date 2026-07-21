import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HEALTH_PROVIDERS } from '@wc/shared';
import { colors, radius, spacing, sharedStyles } from '../lib/theme';
import { localDateString, parseNum, showError } from '../lib/utils';
import { getActiveCoachClient, getBiofeedbackByDate, getUserId, upsertDailyBiofeedback } from '../lib/queries';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';

export default function SaluteScreen() {
  const router = useRouter();
  const [coachClientId, setCoachClientId] = useState<string | null>(null);
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Indietro</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={sharedStyles.content}>
        <Text style={sharedStyles.screenTitle}>Integrazioni salute</Text>

        <Card title="✍️ Inserimento manuale (oggi)">
          {coachClientId ? (
            <>
              <Text style={sharedStyles.muted}>Passi</Text>
              <TextInput style={sharedStyles.input} value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="es. 8500" placeholderTextColor={colors.textSecondary} />
              <Text style={[sharedStyles.muted, styles.spacer]}>Ore di sonno</Text>
              <TextInput style={sharedStyles.input} value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" placeholder="es. 7,5" placeholderTextColor={colors.textSecondary} />
              <Text style={[sharedStyles.muted, styles.spacer]}>Peso (kg)</Text>
              <TextInput style={sharedStyles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="es. 72,5" placeholderTextColor={colors.textSecondary} />
              <PrimaryButton label={saved ? '✓ Salvato' : 'Salva'} loading={saving} onPress={saveManual} style={styles.saveBtn} />
            </>
          ) : (
            <Text style={sharedStyles.body}>
              Collega un coach per registrare i tuoi dati di salute giornalieri.
            </Text>
          )}
        </Card>

        <Card title="Connetti un'app o un dispositivo">
          <Text style={[sharedStyles.muted, styles.spacer]}>
            La sincronizzazione automatica arriverà con l'app installata dagli store. Per ora puoi
            inserire i dati a mano qui sopra.
          </Text>
          {providers.map((p) => (
            <Pressable
              key={p.id}
              style={styles.providerRow}
              onPress={() =>
                Alert.alert(
                  p.label,
                  p.available
                    ? 'Collegamento disponibile.'
                    : 'Disponibile a breve: la connessione automatica richiede l\'app installata dallo store (build nativa).',
                )
              }
            >
              <Text style={styles.providerEmoji}>{p.emoji || '🩺'}</Text>
              <Text style={styles.providerLabel}>{p.label}</Text>
              <View style={[styles.badge, p.available ? styles.badgeOn : styles.badgeSoon]}>
                <Text style={[styles.badgeText, { color: p.available ? colors.accent : colors.textSecondary }]}>
                  {p.available ? 'Disponibile' : 'Presto'}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  spacer: {
    marginTop: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.lg,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  providerEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  providerLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeOn: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(56,189,248,0.10)',
  },
  badgeSoon: {
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
