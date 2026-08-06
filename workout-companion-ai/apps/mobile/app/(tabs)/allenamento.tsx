import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DAYS_OF_WEEK } from '@wc/shared';
import type { ProgramWorkout } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, shadow, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { mondayOfCurrentWeek, showError, todayDayOfWeek } from '../../lib/utils';
import { currentWeekNumber, getActiveCoachClient, getActiveProgram, getUserId, getWeekWorkouts } from '../../lib/queries';
import { ActivityRing } from '../../components/ActivityRing';
import { Appear, appearDelay } from '../../components/Appear';
import { Card } from '../../components/Card';
import { MetricBlock } from '../../components/MetricBlock';
import { Press } from '../../components/Press';
import { EmptyState, LoadingState } from '../../components/States';

interface WeekData {
  hasCoach: boolean;
  programName: string | null;
  weekNumber: number;
  workouts: ProgramWorkout[];
  doneIds: Set<string>;
}

/** I sette giorni in formato DB: 1 = lunedì … 7 = domenica. */
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Sigla di tre lettere del giorno (LUN, MAR, …). */
function dayAbbr(day: number): string {
  return DAYS_OF_WEEK[day - 1].slice(0, 3).toUpperCase();
}

export default function AllenamentoScreen() {
  const [data, setData] = useState<WeekData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const uid = await getUserId();
      if (!uid) return;

      const empty: WeekData = {
        hasCoach: true,
        programName: null,
        weekNumber: 1,
        workouts: [],
        doneIds: new Set(),
      };
      const cc = await getActiveCoachClient(uid);
      if (!cc) {
        setData({ ...empty, hasCoach: false });
        return;
      }
      const program = await getActiveProgram(cc.id);
      if (!program) {
        setData(empty);
        return;
      }

      const weekNumber = currentWeekNumber(program);
      const workouts = await getWeekWorkouts(program.id, weekNumber);

      // Segna come "fatti" gli allenamenti completati in questa settimana.
      const doneIds = new Set<string>();
      if (workouts.length > 0) {
        const { data: logs, error } = await supabase
          .from('workout_logs')
          .select('program_workout_id')
          .eq('client_id', uid)
          .in('program_workout_id', workouts.map((w) => w.id))
          .not('completed_at', 'is', null)
          .gte('started_at', `${mondayOfCurrentWeek()}T00:00:00`);
        if (error) throw new Error(error.message);
        for (const row of (logs ?? []) as { program_workout_id: string | null }[]) {
          if (row.program_workout_id) doneIds.add(row.program_workout_id);
        }
      }

      setData({ hasCoach: true, programName: program.name, weekNumber, workouts, doneIds });
    } catch (e) {
      showError(e, 'Errore di caricamento');
    }
  }, []);

  // A ogni ritorno sulla scheda, non solo al primo montaggio: chiudendo un
  // allenamento le spunte e il conteggio devono essere già aggiornati.
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

  if (!data) {
    return <LoadingState message="Carico il tuo programma…" />;
  }

  const today = todayDayOfWeek();
  const total = data.workouts.length;
  const doneCount = data.workouts.filter((w) => data.doneIds.has(w.id)).length;
  const remaining = total - doneCount;
  const weekTone = total > 0 && remaining === 0 ? colors.mint : colors.accent;

  // IL FARO della schermata: la riga di oggi, e nient'altro.
  const todayWorkout = data.workouts.find((w) => w.day_of_week === today) ?? null;
  const todayTone = todayWorkout
    ? data.doneIds.has(todayWorkout.id)
      ? colors.mint
      : colors.accent
    : colors.cyan;

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Cascata d'entrata: rientra a ogni ritorno sulla scheda. */}
        <Appear delay={appearDelay(0)} style={styles.header} replayOnFocus>
          <Text style={sharedStyles.screenTitle}>Allenamento</Text>
          {data.programName ? (
            <Text style={[styles.subtitle, tabular]} numberOfLines={1}>
              {data.programName} · Settimana {data.weekNumber}
            </Text>
          ) : null}
        </Appear>

        {!data.hasCoach ? (
          <Appear delay={appearDelay(1)} replayOnFocus>
            <EmptyState
              emoji="🤝"
              title="Nessun coach collegato"
              message="Quando il tuo coach ti aggiungerà, qui troverai la scheda della settimana con tutti gli allenamenti."
            />
          </Appear>
        ) : total === 0 ? (
          <Appear delay={appearDelay(1)} replayOnFocus>
            <EmptyState
              emoji="🗓️"
              title="Nessun allenamento in programma"
              message="Il tuo coach sta preparando la scheda di questa settimana: torna a controllare più tardi!"
            />
          </Appear>
        ) : (
          <>
            {/* IL BLOCCO DOMINANTE: a che punto è la settimana. */}
            <Appear delay={appearDelay(1)} replayOnFocus>
              <Card title="Questa settimana">
                <MetricBlock
                  value={String(doneCount)}
                  unit={`/ ${total}`}
                  color={weekTone}
                  caption={
                    remaining === 0
                      ? 'Settimana completata: bel lavoro!'
                      : `Ancora ${remaining} ${remaining === 1 ? 'seduta' : 'sedute'} da fare`
                  }
                  trailing={
                    <ActivityRing
                      progress={total > 0 ? doneCount / total : 0}
                      color={weekTone}
                      size={88}
                      strokeWidth={12}
                    >
                      <Ionicons name={remaining === 0 ? 'trophy' : 'barbell'} size={30} color={weekTone} />
                    </ActivityRing>
                  }
                />
              </Card>
            </Appear>

            {/* La settimana come scala: sette righe di ferro, una per giorno.
                Entra il contenitore, non le singole righe: sette entrate a
                cascata diventerebbero attesa, non movimento. */}
            <Appear delay={appearDelay(2)} style={styles.week} replayOnFocus>
              <Text style={type.label}>Programma della settimana</Text>
              {WEEK_DAYS.map((day) => {
                const dayWorkouts = data.workouts.filter((w) => w.day_of_week === day);
                const isToday = day === today;

                if (dayWorkouts.length === 0) {
                  return (
                    <RestRow
                      key={`rest-${day}`}
                      day={day}
                      isToday={isToday}
                      // Il faro passa al riposo solo se oggi non c'è nulla in programma.
                      beacon={isToday && !todayWorkout ? todayTone : null}
                    />
                  );
                }

                return dayWorkouts.map((w) => {
                  const done = data.doneIds.has(w.id);
                  return (
                    <WorkoutRow
                      key={w.id}
                      workout={w}
                      done={done}
                      isToday={isToday}
                      // Giorno già passato e seduta non chiusa: è stata saltata.
                      missed={day < today && !done}
                      // Un solo faro per schermata: la prima seduta di oggi.
                      beacon={todayWorkout?.id === w.id ? todayTone : null}
                      onPress={() => router.push(`/workout/${w.id}`)}
                    />
                  );
                });
              })}
            </Appear>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Riga FERRO di un giorno con seduta: apre il tracker. */
function WorkoutRow({
  workout,
  done,
  isToday,
  missed,
  beacon,
  onPress,
}: {
  workout: ProgramWorkout;
  done: boolean;
  isToday: boolean;
  /** Giorno passato senza seduta chiusa. */
  missed: boolean;
  /** Colore del faro: valorizzato solo per la riga di oggi. */
  beacon: string | null;
  onPress: () => void;
}) {
  const tone = done
    ? colors.mint
    : isToday
      ? colors.accent
      : missed
        ? colors.amber
        : colors.textSecondary;
  const meta =
    [workout.goal, workout.estimated_duration_min ? `~${workout.estimated_duration_min} min` : null]
      .filter(Boolean)
      .join(' · ') || 'Tocca per i dettagli';
  const state = done ? ', completato' : missed ? ', saltato' : '';

  return (
    <Press
      onPress={onPress}
      style={[styles.row, beacon ? [{ borderColor: beacon }, shadow.beacon(beacon)] : null]}
      accessibilityLabel={`${DAYS_OF_WEEK[workout.day_of_week - 1]}: ${workout.name}${state}`}
    >
      <View style={styles.badge}>
        <Text style={[styles.badgeText, { color: tone }]}>{dayAbbr(workout.day_of_week)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, missed && styles.nameMissed]} numberOfLines={1}>
          {workout.name}
        </Text>
        <View style={styles.metaRow}>
          {isToday ? <Text style={[styles.tag, { color: tone }]}>Oggi</Text> : null}
          {/* Il colore non viaggia mai da solo: allo stato si aggiunge la parola. */}
          {missed ? <Text style={[styles.tag, { color: colors.amber }]}>Saltato</Text> : null}
          <Text style={[styles.meta, tabular]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>

      {done ? (
        <Ionicons name="checkmark-circle" size={26} color={colors.mint} />
      ) : missed ? (
        <Ionicons name="reload-circle-outline" size={26} color={colors.amber} />
      ) : (
        <Ionicons name="chevron-forward" size={22} color={colors.textTertiary} />
      )}
    </Press>
  );
}

/** Giorno senza seduta: stessa geometria, materia più leggera. */
function RestRow({ day, isToday, beacon }: { day: number; isToday: boolean; beacon: string | null }) {
  const tone = isToday ? colors.cyan : colors.textTertiary;

  return (
    <View style={[styles.row, styles.restRow, beacon ? [{ borderColor: beacon }, shadow.beacon(beacon)] : null]}>
      <View style={[styles.badge, styles.restBadge]}>
        <Text style={[styles.badgeText, { color: tone }]}>{dayAbbr(day)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.restName}>Riposo</Text>
        <View style={styles.metaRow}>
          {isToday ? <Text style={[styles.tag, { color: tone }]}>Oggi</Text> : null}
          <Text style={styles.meta} numberOfLines={1}>
            Nessuna seduta in programma
          </Text>
        </View>
      </View>

      <Ionicons name="moon-outline" size={20} color={colors.textTertiary} />
    </View>
  );
}

/** Raggio interno delle superfici dentro una riga (regola concentrica). */
const innerRadius = concentric(radius.lg, spacing.lg);

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
  },
  week: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    // Ferro al 92%, come le Card: il campo luminoso tinge appena la superficie
    // invece di lasciarla morta. Le righe e le card devono essere lo stesso
    // materiale, non due.
    backgroundColor: 'rgba(21,26,36,0.92)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.lg,
  },
  restRow: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: innerRadius,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    ...type.label,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...type.body,
    fontWeight: '700',
  },
  // Saltato: il nome si spegne, ma resta pienamente leggibile.
  nameMissed: {
    color: colors.textSecondary,
  },
  restName: {
    ...type.body,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  meta: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    color: colors.textSecondary,
    flexShrink: 1,
  },
});
