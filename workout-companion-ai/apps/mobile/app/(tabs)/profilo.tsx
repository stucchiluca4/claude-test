import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { Skeleton } from '../../components/Skeleton';
import { StatPill } from '../../components/StatPill';
import { EmptyState } from '../../components/States';
import { demoProfile, isDemo, setDemo } from '../../lib/demo';

type IconName = keyof typeof Ionicons.glyphMap;

/** Ruolo dell'account: etichetta e icona (il testo non viaggia mai da solo). */
const ROLE_META: Record<UserRole, { label: string; icon: IconName }> = {
  athlete: { label: 'Atleta', icon: 'barbell-outline' },
  coach: { label: 'Coach', icon: 'clipboard-outline' },
  gym_owner: { label: 'Titolare palestra', icon: 'business-outline' },
  admin: { label: 'Admin', icon: 'shield-checkmark-outline' },
};

/** Le tre voci del sesso, come le scrive il database. */
const SEX_LABEL: Record<NonNullable<Profile['sex']>, string> = {
  male: 'Uomo',
  female: 'Donna',
  other: 'Altro',
};

/** Tetto di righe di PostgREST: oltre questo la risposta viene troncata. */
const PAGE = 1000;

interface ProfileData {
  profile: Profile;
  totalWorkouts: number;
  totalVolumeKg: number;
}

/** Numero all'italiana: virgola decimale, al massimo un decimale. */
function itNum(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 1 });
}

/** Data "solo giorno" (YYYY-MM-DD) in it-IT, senza sfasamenti di fuso. */
function formatBirth(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProfiloScreen() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      if (isDemo()) {
        setData({ profile: demoProfile(), totalWorkouts: 8, totalVolumeKg: 39900 });
        return;
      }

      const uid = await getUserId();
      if (!uid) return;

      // maybeSingle, non single: su profilo assente `single` solleva un PGRST116
      // grezzo, che finirebbe in faccia all'atleta come messaggio d'errore.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile) throw new Error('Profilo non trovato.');

      // Conteggio e volume dalla STESSA interrogazione, con lo stesso filtro:
      // prima erano due query con predicati diversi, e il volume scaricava tutto
      // lo storico fermandosi in silenzio al tetto di righe di PostgREST.
      let from = 0;
      let totalWorkouts = 0;
      let totalVolumeKg = 0;
      for (;;) {
        const { data: page, count, error: pageError } = await supabase
          .from('workout_logs')
          .select('total_volume_kg', { count: 'exact' })
          .eq('client_id', uid)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (pageError) throw new Error(pageError.message);
        const rows = (page ?? []) as { total_volume_kg: number | null }[];
        // La colonna è nullable: senza il ?? 0 basta un null per stampare «NaN kg».
        totalVolumeKg += rows.reduce((acc, r) => acc + Number(r.total_volume_kg ?? 0), 0);
        totalWorkouts = count ?? totalWorkouts;
        from += rows.length;
        if (rows.length < PAGE || from >= totalWorkouts) break;
      }

      setData({
        profile: profile as Profile,
        totalWorkouts,
        totalVolumeKg,
      });
    } catch (e) {
      // Senza questo la schermata resterebbe sul caricamento all'infinito — e
      // con lei l'unico pulsante di uscita dall'account di tutta l'app.
      setFailed(true);
      showError(e, 'Errore di caricamento');
    }
  }, []);

  // A ogni ritorno sulla scheda: i due numeri qui sopra cambiano a ogni
  // allenamento chiuso, e la scheda resta montata fra una visita e l'altra.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  // Il caricamento fallito ha la sua schermata, con DUE vie d'uscita: riprovare
  // e, soprattutto, uscire dall'account. `signOut` vive solo qui: senza questo
  // ramo un errore di rete chiudeva l'atleta dentro il proprio account, con
  // l'unico rimedio di terminare l'app.
  if (!data && failed) {
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <ScrollView
          contentContainerStyle={sharedStyles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <Appear delay={appearDelay(0)} replayOnFocus>
            <Text style={sharedStyles.screenTitle}>Profilo</Text>
          </Appear>
          <Appear delay={appearDelay(1)} replayOnFocus>
            <EmptyState
              emoji="📡"
              title="Dati non disponibili"
              message="Non riesco a caricare il profilo. Controlla la connessione e riprova."
              action={
                <PrimaryButton
                  label="Riprova"
                  onPress={() => {
                    void load();
                  }}
                />
              }
            />
          </Appear>
          <Appear delay={appearDelay(2)} replayOnFocus>
            <PrimaryButton label="ESCI" variant="danger" onPress={confirmLogout} loading={signingOut} />
          </Appear>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!data) {
    return <ProfiloSkeleton />;
  }

  const { profile } = data;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Atleta';
  const initials = fullName
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  const tons = Math.round(data.totalVolumeKg / 100) / 10; // tonnellate con 1 decimale
  // Un decimale sempre, anche quando è zero: passando da 39,9 a 40 la cifra non
  // deve perdere una posizione e cambiare larghezza (Regola delle Cifre Ferme).
  const tonsLabel = tons.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // La guardia sullo zero non è teorica: un account nuovo darebbe 0/0 = NaN.
  const avgKg = data.totalWorkouts > 0 ? Math.round(data.totalVolumeKg / data.totalWorkouts) : null;
  const role = ROLE_META[profile.role];
  const demo = isDemo();

  // Righe di sola lettura dei dati anagrafici: si mostrano solo se compilate,
  // e da qui si va a correggerle.
  const details: { label: string; value: string }[] = [];
  if (profile.sex) details.push({ label: 'Sesso', value: SEX_LABEL[profile.sex] });
  if (profile.date_of_birth) details.push({ label: 'Data di nascita', value: formatBirth(profile.date_of_birth) });
  if (profile.height_cm != null) details.push({ label: 'Altezza', value: `${itNum(profile.height_cm)} cm` });

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
              <StatPill label="Volume totale" value={`${tonsLabel} t`} color={colors.amber} />
            </View>
            {/* La riga di ferro porta un dato che le pastiglie sopra non
                contengono: prima ripeteva le stesse tonnellate in chili. */}
            <View style={styles.volumeRow}>
              <Text style={type.label}>Media per allenamento</Text>
              <Text style={styles.volumeValue}>
                {avgKg != null ? `${avgKg.toLocaleString('it-IT')} kg` : '—'}
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

        {/* Qui prima c'erano tre righe con la freccia che aprivano un avviso
            «Disponibile in un prossimo aggiornamento»: promettevano navigazione
            e restituivano un'ammissione di software incompiuto. Ora la card
            mostra i dati veri e porta all'unico posto dove si cambiano. */}
        <Appear delay={appearDelay(3)} replayOnFocus>
          <Card title="Il tuo account">
            {details.length > 0 ? (
              <View style={styles.detailList}>
                {details.map((d, i) => (
                  <View key={d.label} style={[styles.detailRow, i > 0 && styles.detailDivider]}>
                    <Text style={type.label}>{d.label}</Text>
                    <Text style={[styles.detailValue, tabular]}>{d.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.detailEmpty}>
                Sesso, data di nascita e altezza non sono ancora compilati: servono al coach per
                calcolare fabbisogno e macro.
              </Text>
            )}
            <Press
              style={styles.row}
              onPress={() => router.push('/account/modifica')}
              accessibilityLabel="Modifica profilo"
            >
              <View style={[styles.rowIcon, styles.rowIconAction]}>
                <Ionicons name="create" size={20} color={colors.accent} />
              </View>
              <Text style={styles.rowLabel}>Modifica profilo</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </Press>
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

/**
 * Scheletro di caricamento che ricalca il layout reale, come nelle sorelle:
 * uno spinner centrato non dice cosa sta arrivando.
 */
function ProfiloSkeleton() {
  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <View style={sharedStyles.content}>
        <View style={styles.hero}>
          <Skeleton width={76} height={76} round={radius.pill} />
          <View style={styles.skeletonHeroText}>
            <Skeleton width={186} height={34} />
            <Skeleton width={104} height={30} round={radius.pill} />
          </View>
        </View>
        <Card>
          <Skeleton width={104} height={12} />
          <View style={styles.pillRow}>
            <Skeleton height={64} round={radius.md} />
            <Skeleton height={64} round={radius.md} />
          </View>
          <Skeleton height={44} round={innerRadius} />
        </Card>
        {[0, 1].map((i) => (
          <Card key={i}>
            <Skeleton width={132} height={12} />
            <Skeleton height={56} round={innerRadius} />
          </Card>
        ))}
      </View>
    </SafeAreaView>
  );
}

/**
 * Raggio degli elementi dentro una card (regola concentrica).
 * La Card ha padding `spacing.xl`: è quello il valore da sottrarre, non `lg`.
 */
const innerRadius = concentric(radius.lg, spacing.xl);

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
    // Rilievo come le pastiglie delle schermate sorelle, non `card`: il ferro
    // della Card è al 92%, una pastiglia piena accanto stona.
    backgroundColor: colors.raised,
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

  // --- Dati anagrafici ---
  detailList: {
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingHorizontal: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  detailDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailValue: {
    ...type.body,
    fontWeight: '700',
  },
  detailEmpty: {
    ...sharedStyles.muted,
  },

  // --- Righe di comando ---
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
  rowIconAction: {
    backgroundColor: 'rgba(10,132,255,0.14)',
  },
  rowLabel: {
    ...type.body,
    flex: 1,
  },
  skeletonHeroText: {
    flex: 1,
    gap: spacing.sm,
  },
});
