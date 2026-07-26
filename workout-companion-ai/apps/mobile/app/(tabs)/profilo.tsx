import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Profile, UserRole } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, spacing, sharedStyles } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getUserId } from '../../lib/queries';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StatPill } from '../../components/StatPill';
import { isDemo, setDemo } from '../../lib/demo';

const ROLE_LABELS: Record<UserRole, string> = {
  athlete: 'Atleta',
  coach: 'Coach',
  gym_owner: 'Titolare palestra',
  admin: 'Admin',
};

const SETTINGS_ROWS = ['Unità di misura', 'Notifiche', 'Privacy e dati'] as const;

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
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Carico il tuo profilo…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { profile } = data;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Atleta';
  const initials = fullName
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  const tons = Math.round(data.totalVolumeKg / 100) / 10; // tonnellate con 1 decimale

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={sharedStyles.screenTitle}>Profilo</Text>

        <Card>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.name}>{fullName}</Text>
              <Text style={sharedStyles.muted}>{ROLE_LABELS[profile.role]}</Text>
            </View>
          </View>
        </Card>

        <Card title="I tuoi numeri">
          <View style={styles.pillRow}>
            <StatPill label="Allenamenti" value={String(data.totalWorkouts)} color={colors.accent} />
            <StatPill label="Tonnellate" value={String(tons)} color={colors.success} />
          </View>
          <Text style={sharedStyles.muted}>
            Volume totale sollevato: {Math.round(data.totalVolumeKg).toLocaleString('it-IT')} kg
          </Text>
        </Card>

        <Card title="Salute e dispositivi">
          <Pressable style={styles.settingRow} onPress={() => router.push('/salute')}>
            <Text style={sharedStyles.body}>🩺 Integrazioni salute</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Card>

        <Card title="Impostazioni">
          {SETTINGS_ROWS.map((label) => (
            <Pressable
              key={label}
              style={styles.settingRow}
              onPress={() => Alert.alert(label, 'Disponibile in un prossimo aggiornamento.')}
            >
              <Text style={sharedStyles.body}>{label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </Card>

        <PrimaryButton label="ESCI" variant="danger" onPress={confirmLogout} loading={signingOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  identityInfo: {
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 20,
  },
});
