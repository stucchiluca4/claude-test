import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Profile, UserRole } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getUserId } from '../../lib/queries';
import { Appear, appearDelay } from '../../components/Appear';
import { Card } from '../../components/Card';
import { Press } from '../../components/Press';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StatPill } from '../../components/StatPill';
import { LoadingState } from '../../components/States';
import { isDemo, setDemo } from '../../lib/demo';

type IconName = keyof typeof Ionicons.glyphMap;

/** Ruolo dell'account: etichetta e icona (il testo non viaggia mai da solo). */
const ROLE_META: Record<UserRole, { label: string; icon: IconName }> = {
  athlete: { label: 'Atleta', icon: 'barbell-outline' },
  coach: { label: 'Coach', icon: 'clipboard-outline' },
  gym_owner: { label: 'Titolare palestra', icon: 'business-outline' },
  admin: { label: 'Admin', icon: 'shield-checkmark-outline' },
};

const SETTINGS_ROWS: { label: string; icon: IconName }[] = [
  { label: 'Unità di misura', icon: 'speedometer-outline' },
  { label: 'Notifiche', icon: 'notifications-outline' },
  { label: 'Privacy e dati', icon: 'lock-closed-outline' },
];

interface ProfileData {
  profile: Profile;
  totalWorkouts: number;
  totalVolumeKg: number;
}

export default function ProfiloScreen() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isDemo()) {
        setData({
          profile: {
            id: 'demo-athlete',
            role: 'athlete',
            first_name: 'Atleta',
            last_name: 'Demo',
            avatar_url: null,
            date_of_birth: null,
            sex: null,
            height_cm: null,
            locale: 'it',
            unit_system: 'metric',
            onboarding_completed: true,
          },
          totalWorkouts: 8,
          totalVolumeKg: 39900,
        });
        return;
      }

      const uid = await getUserId();
      if (!uid) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      if (profileError) throw new Error(profileError.message);

      const { count, error: countError } = await supabase
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', uid)
        .not('completed_at', 'is', null);
      if (countError) throw new Error(countError.message);

      const { data: volumes, error: volumesError } = await supabase
        .from('workout_logs')
        .select('total_volume_kg')
        .eq('client_id', uid)
        .not('total_volume_kg', 'is', null);
      if (volumesError) throw new Error(volumesError.message);
      const totalVolumeKg = ((volumes ?? []) as { total_volume_kg: number }[]).reduce(
        (acc, row) => acc + row.total_volume_kg,
        0
      );

      setData({
        profile: profile as Profile,
        totalWorkouts: count ?? 0,
        totalVolumeKg,
      });
    } catch (e) {
      showError(e, 'Errore di caricamento');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmLogout() {
    if (isDemo()) {
      setDemo(false);
      router.replace('/(auth)/login');
      return;
    }
    Alert.alert('Uscire dall’account?', 'Potrai rientrare quando vuoi.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          const { error } = await supabase.auth.signOut();
          setSigningOut(false);
          if (error) Alert.alert('Errore', error.message);
          // Il redirect al login lo gestisce il layout radice.
        },
      },
    ]);
  }

  if (!data) {
    return <LoadingState message="Carico il tuo profilo…" />;
  }

  const { profile } = data;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Atleta';
  const initials = fullName
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  const tons = Math.round(data.totalVolumeKg / 100) / 10; // tonnellate con 1 decimale
  const role = ROLE_META[profile.role];
  const demo = isDemo();

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* L'identità è il titolo della schermata: compare una volta, in alto.
            Cascata d'entrata: rientra a ogni ritorno sulla scheda. */}
        <Appear delay={appearDelay(0)} style={styles.hero} replayOnFocus>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
              {fullName}
            </Text>
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Ionicons name={role.icon} size={15} color={colors.textSecondary} />
                <Text style={styles.chipText}>{role.label}</Text>
              </View>
              {demo ? (
                <View style={styles.chip}>
                  <Ionicons name="flask-outline" size={15} color={colors.amber} />
                  <Text style={[styles.chipText, styles.chipTextDemo]}>Modalità demo</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Appear>

        <Appear delay={appearDelay(1)} replayOnFocus>
          <Card title="I tuoi numeri">
            <View style={styles.pillRow}>
              <StatPill label="Allenamenti" value={String(data.totalWorkouts)} color={colors.mint} />
              <StatPill label="Tonnellate" value={tons.toLocaleString('it-IT')} color={colors.amber} />
            </View>
            <View style={styles.volumeRow}>
              <Text style={type.label}>Volume totale sollevato</Text>
              <Text style={styles.volumeValue}>
                {Math.round(data.totalVolumeKg).toLocaleString('it-IT')} kg
              </Text>
            </View>
          </Card>
        </Appear>

        <Appear delay={appearDelay(2)} replayOnFocus>
          <Card title="Salute e dispositivi">
            <Press
              style={styles.row}
              onPress={() => router.push('/salute')}
              accessibilityLabel="Integrazioni salute"
            >
              <View style={[styles.rowIcon, styles.rowIconBody]}>
                <Ionicons name="pulse" size={20} color={colors.cyan} />
              </View>
              <Text style={styles.rowLabel}>Integrazioni salute</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </Press>
          </Card>
        </Appear>

        <Appear delay={appearDelay(3)} replayOnFocus>
          <Card title="Impostazioni">
            <View style={styles.rowGroup}>
              {SETTINGS_ROWS.map((item) => (
                <Press
                  key={item.label}
                  style={styles.row}
                  onPress={() => Alert.alert(item.label, 'Disponibile in un prossimo aggiornamento.')}
                  accessibilityLabel={item.label}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </Press>
              ))}
            </View>
          </Card>
        </Appear>

        {/* Ultimo gradino della cascata: l'uscita entra per ultima. */}
        <Appear delay={appearDelay(4)} replayOnFocus>
          <PrimaryButton label="ESCI" variant="danger" onPress={confirmLogout} loading={signingOut} />
        </Appear>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Raggio degli elementi dentro una card (regola concentrica). */
const innerRadius = concentric(radius.lg, spacing.lg);

const styles = StyleSheet.create({
  // --- Identità ---
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xs,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,132,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroText: {
    flex: 1,
    gap: spacing.sm,
  },
  name: {
    ...type.display,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexShrink: 1,
  },
  chipText: {
    ...type.callout,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  chipTextDemo: {
    color: colors.amber,
  },

  // --- Numeri ---
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  volumeValue: {
    ...type.body,
    ...tabular,
    fontWeight: '700',
  },

  // --- Righe di comando ---
  rowGroup: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: concentric(innerRadius, spacing.sm),
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconBody: {
    backgroundColor: 'rgba(100,210,255,0.14)',
  },
  rowLabel: {
    ...type.body,
    flex: 1,
  },
});
