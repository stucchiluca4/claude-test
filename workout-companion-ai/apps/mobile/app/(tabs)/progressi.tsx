import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  avgFrequencyPerWeek,
  currentStreak,
  DAYS_OF_WEEK,
  estimate1RM,
  generateInsights,
  setVolume,
  volumeTrendPct,
  weeklyActivity,
  type Insight,
  type PersonalRecord,
  type RecordType,
  type WeekBucket,
} from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, shadow, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getActiveCoachClient, getUserId } from '../../lib/queries';
import { ActivityRing } from '../../components/ActivityRing';
import { Appear, appearDelay } from '../../components/Appear';
import { Card } from '../../components/Card';
import { MetricBlock } from '../../components/MetricBlock';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Skeleton } from '../../components/Skeleton';
import { StatPill } from '../../components/StatPill';
import { BarChart, type BarDatum } from '../../components/BarChart';
import { EmptyState } from '../../components/States';
import { demoBiofeedback, demoPRs, demoStrengthPoints, demoWorkoutLogs, isDemo } from '../../lib/demo';

const RECORD_LABELS: Record<RecordType, string> = {
  max_load: 'Carico max',
  max_reps: 'Reps max',
  max_volume: 'Volume serie',
  estimated_1rm: '1RM stimato',
};

/**
 * Colore e icona dell'insight in base alla gravità: il colore non viaggia mai
 * da solo (ambra = attenzione, menta = fatto bene, viola = prodotto dal motore).
 * L'informativo prende il viola dell'AI e non il ciano, che resta riservato ai
 * dati del corpo — nella stessa schermata il ciano è già il peso medio.
 */
const INSIGHT_TONE: Record<Insight['severity'], { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  warning: { color: colors.amber, icon: 'alert-circle' },
  positive: { color: colors.mint, icon: 'checkmark-circle' },
  info: { color: colors.violet, icon: 'information-circle' },
};

interface StrengthSeries {
  exerciseName: string;
  points: BarDatum[];
}

interface Analytics {
  totalWorkouts: number;
  totalVolumeKg: number;
  streak: number;
  frequency: number;
  avgWeight: number | null;
  buckets: WeekBucket[];
  trendPct: number | null;
  prs: PersonalRecord[];
  /** Record totali dell'atleta: la lista ne mostra solo i più recenti. */
  prTotal: number;
  strength: StrengthSeries | null;
  strengthDeltaPct: number | null;
  insights: Insight[];
}

/**
 * Quante settimane guarda la schermata. Vale sia per i grafici sia per i
 * confronti: tenerlo in un posto solo evita che testata e calcoli divergano.
 */
const WEEKS_BACK = 8;

/** Record personali scaricati per la lista: il conteggio vero arriva a parte. */
const PR_PAGE = 12;

/**
 * Cima minima della scala del grafico attività. Senza, una settimana da un solo
 * allenamento disegnerebbe una barra piena quanto una da sei.
 */
const FREQ_SCALE_MIN = 3;

/** Numero all'italiana: virgola decimale, al massimo un decimale. */
function itNum(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 1 });
}

/** Variazione percentuale fra il primo e l'ultimo punto di una serie. */
function seriesDeltaPct(points: BarDatum[]): number | null {
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  if (!first || first <= 0 || last == null) return null;
  return Math.round(((last - first) / first) * 100);
}

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** Data "solo giorno" (YYYY-MM-DD) formattata in it-IT senza sfasamenti di fuso. */
function formatDay(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProgressiScreen() {
  const [data, setData] = useState<Analytics | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      if (isDemo()) {
        const logs = demoWorkoutLogs(new Date());
        const buckets = weeklyActivity(logs, WEEKS_BACK, new Date());
        const points = demoStrengthPoints();
        // Un solo calcolo del delta: prima la card e il motore ne mostravano due
        // diversi sulla stessa serie (la card +9%, l'insight un 8 scritto a mano).
        const demoDelta = seriesDeltaPct(points);
        const demoPrs = demoPRs();
        setData({
          totalWorkouts: logs.length,
          totalVolumeKg: logs.reduce((a, l) => a + l.total_volume_kg, 0),
          streak: currentStreak(buckets),
          frequency: avgFrequencyPerWeek(buckets),
          avgWeight: 74.5,
          buckets,
          trendPct: volumeTrendPct(buckets),
          prs: demoPrs,
          prTotal: demoPrs.length,
          strength: { exerciseName: 'Squat con bilanciere', points },
          strengthDeltaPct: demoDelta,
          insights: generateInsights({
            totalWorkouts: logs.length,
            trendPct: volumeTrendPct(buckets),
            countFirstHalfAvg: 2,
            countLateHalfAvg: 3,
            streak: currentStreak(buckets),
            recovery: [demoBiofeedback()],
            strengthDeltaPct: demoDelta,
            strengthExerciseName: 'Squat con bilanciere',
            muscleVolume: [
              { group: 'quadricipiti', volumeKg: 12000 },
              { group: 'petto', volumeKg: 6000 },
              { group: 'dorso', volumeKg: 4000 },
            ],
            bestDay: 'Lunedì',
          }),
        });
        return;
      }

      const uid = await getUserId();
      if (!uid) return;

      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('id, started_at, total_volume_kg')
        .eq('client_id', uid)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false });
      throwIf(logsError);
      const logs = (logsData ?? []) as { id: string; started_at: string; total_volume_kg: number | null }[];

      const totalVolumeKg = logs.reduce((acc, l) => acc + Number(l.total_volume_kg ?? 0), 0);
      const buckets = weeklyActivity(logs, WEEKS_BACK, new Date());

      // Record personali recenti. Il conteggio esatto arriva dal server: la lista
      // ne mostra solo gli ultimi, e prima il KPI si fermava per sempre a 12.
      const { data: prData, error: prError, count: prCount } = await supabase
        .from('personal_records')
        .select('*, exercise:exercises(name)', { count: 'exact' })
        .eq('client_id', uid)
        .order('achieved_at', { ascending: false })
        .limit(PR_PAGE);
      throwIf(prError);
      const prs = (prData ?? []) as PersonalRecord[];
      const prTotal = prCount ?? prs.length;

      // Peso medio recente (biofeedback se collegato a un coach, altrimenti check-in).
      const cc = await getActiveCoachClient(uid);
      let avgWeight: number | null = null;
      if (cc) {
        const { data: w } = await supabase
          .from('daily_biofeedback')
          .select('weight_kg')
          .eq('coach_client_id', cc.id)
          .not('weight_kg', 'is', null)
          .order('log_date', { ascending: false })
          .limit(10);
        const vals = ((w ?? []) as { weight_kg: number }[]).map((r) => Number(r.weight_kg));
        if (vals.length > 0) avgWeight = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }

      // Recupero recente (per gli insight sul sovrallenamento).
      let recovery: { recovery: number | null; muscle_soreness: number | null; sleep_quality: number | null }[] = [];
      if (cc) {
        const { data: rec } = await supabase
          .from('daily_biofeedback')
          .select('recovery, muscle_soreness, sleep_quality')
          .eq('coach_client_id', cc.id)
          .order('log_date', { ascending: false })
          .limit(6);
        recovery = (rec ?? []) as typeof recovery;
      }

      // Progressione forza + volume per gruppo muscolare (dalle serie recenti).
      let strength: StrengthSeries | null = null;
      let strengthDeltaPct: number | null = null;
      let strengthExerciseName: string | null = null;
      const muscleMap = new Map<string, number>();
      const recentLogIds = logs.slice(0, 20).map((l) => l.id);
      const dateByLog = new Map(logs.map((l) => [l.id, l.started_at]));
      if (recentLogIds.length > 0) {
        const { data: setData2, error: setError } = await supabase
          .from('set_logs')
          .select('workout_log_id, exercise_id, load_kg, reps, exercise:exercises(name, muscle_group)')
          .in('workout_log_id', recentLogIds)
          .eq('completed', true);
        throwIf(setError);
        const rows = (setData2 ?? []) as unknown as {
          workout_log_id: string;
          exercise_id: string;
          load_kg: number | null;
          reps: number | null;
          exercise: { name: string; muscle_group: string | null } | null;
        }[];

        const byExercise = new Map<string, { name: string; bestByLog: Map<string, number> }>();
        for (const s of rows) {
          if (s.load_kg == null || s.reps == null) continue;
          const group = s.exercise?.muscle_group;
          if (group) muscleMap.set(group, (muscleMap.get(group) ?? 0) + setVolume(Number(s.load_kg), Number(s.reps)));
          const e1 = estimate1RM(Number(s.load_kg), Math.round(Number(s.reps)));
          if (!(e1 > 0)) continue;
          const rec = byExercise.get(s.exercise_id) ?? { name: s.exercise?.name ?? 'Esercizio', bestByLog: new Map() };
          const prev = rec.bestByLog.get(s.workout_log_id);
          if (prev == null || e1 > prev) rec.bestByLog.set(s.workout_log_id, e1);
          byExercise.set(s.exercise_id, rec);
        }

        let top: { name: string; bestByLog: Map<string, number> } | null = null;
        for (const rec of byExercise.values()) {
          if (!top || rec.bestByLog.size > top.bestByLog.size) top = rec;
        }
        if (top && top.bestByLog.size >= 2) {
          const points = [...top.bestByLog.entries()]
            .map(([logId, e1]) => ({ date: dateByLog.get(logId) ?? '', e1 }))
            .filter((p) => p.date)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-8)
            .map((p) => {
              const d = new Date(p.date);
              return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: Math.round(p.e1), display: `${Math.round(p.e1)}` };
            });
          strength = { exerciseName: top.name, points };
          strengthExerciseName = top.name;
          strengthDeltaPct = seriesDeltaPct(points);
        }
      }

      // Giorno della settimana in cui l'atleta RENDE di più: volume MEDIO per
      // seduta, non somma. Con la somma vinceva sempre il giorno più frequentato,
      // e il consiglio usciva rovesciato. Le sedute senza ferro (cardio, corpo
      // libero) restano fuori: non dicono nulla sul rendimento.
      const dayVolume = new Array(7).fill(0) as number[];
      const dayCount = new Array(7).fill(0) as number[];
      for (const l of logs) {
        const vol = Number(l.total_volume_kg ?? 0);
        if (!(vol > 0)) continue;
        const t = new Date(l.started_at).getTime();
        if (!Number.isFinite(t)) continue;
        const idx = (new Date(t).getDay() + 6) % 7; // 0 = lunedì
        dayVolume[idx] += vol;
        dayCount[idx] += 1;
      }
      let bestIdx = -1;
      let bestAvg = 0;
      for (let i = 0; i < 7; i++) {
        if (dayCount[i] < 2) continue; // un colpo fortunato non è una tendenza
        const a = dayVolume[i] / dayCount[i];
        if (a > bestAvg) {
          bestAvg = a;
          bestIdx = i;
        }
      }
      const bestDay = bestIdx >= 0 ? DAYS_OF_WEEK[bestIdx] : null;

      // Confronto di costanza solo sulle settimane davvero osservate: fuori le
      // settimane precedenti alla prima attività (l'atleta non era iscritto, e
      // quello zero produceva un «Costanza in aumento» inventato) e fuori la
      // settimana in corso, che è parziale e falserebbe la seconda metà.
      const halfAvg = (arr: WeekBucket[]) =>
        arr.length ? Math.round((arr.reduce((a, b) => a + b.count, 0) / arr.length) * 10) / 10 : 0;
      const closed = buckets.slice(0, -1);
      const firstActive = closed.findIndex((b) => b.count > 0);
      const observedWeeks = firstActive === -1 ? [] : closed.slice(firstActive);
      const comparable = observedWeeks.length >= 4;
      const mid = Math.floor(observedWeeks.length / 2);

      const trendPct = volumeTrendPct(buckets);
      const streak = currentStreak(buckets);

      const insights = generateInsights({
        totalWorkouts: logs.length,
        trendPct,
        countFirstHalfAvg: comparable ? halfAvg(observedWeeks.slice(0, mid)) : 0,
        countLateHalfAvg: comparable ? halfAvg(observedWeeks.slice(mid)) : 0,
        streak,
        recovery,
        strengthDeltaPct,
        strengthExerciseName,
        muscleVolume: [...muscleMap.entries()].map(([group, volumeKg]) => ({ group, volumeKg })),
        bestDay,
      });

      setData({
        totalWorkouts: logs.length,
        totalVolumeKg,
        streak,
        frequency: avgFrequencyPerWeek(buckets),
        avgWeight,
        buckets,
        trendPct,
        prs,
        prTotal,
        strength,
        strengthDeltaPct,
        insights,
      });
    } catch (e) {
      // Se il wifi della palestra cade, la schermata deve dirlo e offrire un
      // modo di riprovare: prima restava sullo scheletro per sempre.
      setFailed(true);
      showError(e, 'Errore di caricamento');
    }
  }, []);

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

  // Il caricamento fallito ha la sua schermata, con la via d'uscita dentro.
  // La guardia è `!data && failed`: se a cadere è un aggiornamento quando i
  // numeri sono già a schermo, l'atleta continua a vederli.
  if (!data && failed) {
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <ScrollView
          contentContainerStyle={sharedStyles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <Appear delay={appearDelay(0)} replayOnFocus>
            <Text style={sharedStyles.screenTitle}>Progressi</Text>
          </Appear>
          <Appear delay={appearDelay(1)} replayOnFocus>
            <EmptyState
              emoji="📡"
              title="Dati non disponibili"
              message="Non riesco a caricare i progressi. Controlla la connessione e riprova."
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!data) return <ProgressiSkeleton />;

  if (data.totalWorkouts === 0) {
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <ScrollView
          contentContainerStyle={sharedStyles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <Appear delay={appearDelay(0)} replayOnFocus>
            <Text style={sharedStyles.screenTitle}>Progressi</Text>
          </Appear>
          <Appear delay={appearDelay(1)} replayOnFocus>
            <EmptyState
              emoji="📈"
              title="Ancora nessun dato"
              message="Completa il tuo primo allenamento e qui vedrai volume, record, streak e la progressione della forza. Tira su un po' di ferro! 💪"
            />
          </Appear>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const tons = Math.round(data.totalVolumeKg / 100) / 10;
  const tonsLabel = tons.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // L'anello dello streak si riempie sull'intera finestra osservata (8 settimane).
  const streakProgress = Math.min(1, data.streak / Math.max(1, data.buckets.length));
  const trendTone = data.trendPct == null ? colors.textSecondary : data.trendPct >= 0 ? colors.mint : colors.amber;

  // Un'unità sola per tutta la serie, scelta sul picco: prima due barre vicine
  // potevano dire «900» e «1.2t», col numero più piccolo sopra la barra più alta.
  // E il separatore decimale segue l'italiano, come il faro qui sopra.
  const maxBucketKg = Math.max(0, ...data.buckets.map((b) => b.volumeKg));
  const volumeInTons = maxBucketKg >= 1000;
  const volumeUnit = volumeInTons ? 't' : 'kg';
  const volumeBars: BarDatum[] = data.buckets.map((b) => ({
    label: b.label,
    value: Math.round(b.volumeKg),
    display: volumeInTons
      ? // Un decimale sempre, anche quando è zero: in colonna le cifre devono
        // stare ferme. Il minimo a 0,1 evita che una settimana leggera stampi
        // «0» sopra una barra visibile — ma solo se la settimana esiste: una
        // settimana vuota resta zero, o la lettura vocale annuncerebbe 0,1 t.
        (b.volumeKg > 0 ? Math.max(0.1, b.volumeKg / 1000) : 0).toLocaleString('it-IT', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : Math.round(b.volumeKg).toLocaleString('it-IT'),
  }));

  const freqBars: BarDatum[] = data.buckets.map((b) => ({ label: b.label, value: b.count }));
  const freqMax = Math.max(FREQ_SCALE_MIN, ...freqBars.map((b) => b.value));

  // L'asse della forza parte poco sotto il minimo: su variazioni del 2-5% le
  // barre da zero sono un muro piatto. Il taglio lo dichiara il grafico stesso.
  const strengthPoints = data.strength?.points ?? [];
  const strengthBaseline =
    strengthPoints.length > 0 ? Math.floor(Math.min(...strengthPoints.map((p) => p.value)) * 0.97) : undefined;
  const strengthTone =
    data.strengthDeltaPct == null
      ? colors.textSecondary
      : data.strengthDeltaPct >= 0
        ? colors.mint
        : colors.amber;

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* La testata apre la cascata: tornando sulla scheda rientra per prima. */}
        {/* La finestra delle 8 settimane vive sulle card dei grafici, non qui:
            volume totale e record sono di sempre, e la testata li scavalcava. */}
        <Appear delay={appearDelay(0)} replayOnFocus style={styles.header}>
          <Text style={sharedStyles.screenTitle}>Progressi</Text>
        </Appear>

        {/* IL BLOCCO DOMINANTE: tutto il ferro spostato, con l'anello dello streak accanto.
            È l'unico faro della schermata (ambra = sforzo accumulato).
            Cascata d'entrata 0/60/120/180 ms, ripetuta a ogni ritorno sulla scheda:
            prima la testata, poi il dominante, poi i KPI e infine i grafici. */}
        <Appear delay={appearDelay(1)} replayOnFocus>
          <Card beacon={colors.amber} style={shadow.beacon(colors.amber)}>
            <MetricBlock
              value={tonsLabel}
              unit="t"
              label="Volume totale"
              caption="Il ferro che hai spostato finora."
              color={colors.amber}
              trailing={
                <View style={styles.streak}>
                  <ActivityRing
                    progress={streakProgress}
                    color={colors.mint}
                    size={96}
                    strokeWidth={12}
                    a11yLabel={`Settimane di fila con almeno un allenamento: ${data.streak}`}
                  >
                    <Text style={styles.streakValue}>{data.streak}</Text>
                  </ActivityRing>
                  <Text style={styles.streakLabel} numberOfLines={2}>
                    Sett. di fila
                  </Text>
                </View>
              }
            />
          </Card>
        </Appear>

        {/* KPI di supporto: due righe pulite, un colore per ogni significato.
            Entrano insieme perché sono un unico blocco di lettura, e comunque
            prima dei grafici. */}
        <Appear delay={appearDelay(2)} replayOnFocus style={styles.pillRow}>
          <StatPill label="Allenamenti" value={String(data.totalWorkouts)} color={colors.mint} />
          <StatPill label="Freq./sett." value={itNum(data.frequency)} />
        </Appear>
        <Appear delay={appearDelay(2)} replayOnFocus style={styles.pillRow}>
          <StatPill
            label="Peso medio"
            value={data.avgWeight != null ? `${itNum(data.avgWeight)} kg` : '—'}
            color={colors.cyan}
          />
          <StatPill label="Record" value={String(data.prTotal)} color={colors.rose} />
        </Appear>

        {data.insights.length > 0 ? (
          <Appear delay={appearDelay(3)} replayOnFocus>
            <Card>
              <View style={styles.cardHead}>
                <Ionicons name="sparkles" size={18} color={colors.violet} />
                <Text style={[type.label, styles.aiLabel]}>Insight per te</Text>
              </View>
              <View style={styles.insightList}>
                {data.insights.map((ins) => {
                  const tone = INSIGHT_TONE[ins.severity];
                  return (
                    <View key={ins.id} style={styles.insight}>
                      <Ionicons name={tone.icon} size={22} color={tone.color} style={styles.insightIcon} />
                      <View style={styles.insightBody}>
                        <Text style={[styles.insightTitle, { color: tone.color }]}>{ins.title}</Text>
                        <Text style={styles.insightText}>{ins.body}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          </Appear>
        ) : null}

        {/* I grafici chiudono la cascata: entrano dopo i KPI, alla coda dei 180 ms. */}
        <Appear delay={appearDelay(4)} replayOnFocus>
          <Card title="Volume settimanale">
            <Text style={styles.cardSub}>
              {volumeInTons
                ? `Tonnellate spostate nelle ultime ${WEEKS_BACK} settimane.`
                : `Chili spostati nelle ultime ${WEEKS_BACK} settimane.`}
            </Text>
            <BarChart
              data={volumeBars}
              color={colors.amber}
              height={152}
              unit={volumeUnit}
              a11yLabel="Volume spostato per settimana"
            />
            {data.trendPct != null ? (
              <View style={styles.delta}>
                <Ionicons
                  name={data.trendPct >= 0 ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={trendTone}
                />
                <Text style={styles.deltaText}>
                  <Text style={[styles.deltaValue, tabular, { color: trendTone }]}>
                    {data.trendPct >= 0 ? '+' : ''}
                    {data.trendPct}%
                  </Text>
                  {" rispetto all'inizio del periodo"}
                </Text>
              </View>
            ) : null}
          </Card>
        </Appear>

        <Appear delay={appearDelay(5)} replayOnFocus>
          <Card title="Attività settimanale">
            <Text style={styles.cardSub}>Allenamenti completati nelle ultime {WEEKS_BACK} settimane.</Text>
            <BarChart
              data={freqBars}
              color={colors.mint}
              height={112}
              maxValue={freqMax}
              // Nessuna unità: il sostantivo sta già nell'etichetta, e appenderlo
              // a ogni valore farebbe dire «1 allenamenti».
              a11yLabel="Allenamenti completati per settimana"
            />
          </Card>
        </Appear>

        {data.strength ? (
          <Appear delay={appearDelay(6)} replayOnFocus>
            <Card title="Progressione forza">
              <Text style={styles.cardTitleStrong} numberOfLines={2}>
                {data.strength.exerciseName}
              </Text>
              <Text style={styles.cardSub}>1RM stimato per seduta (kg).</Text>
              {/* Serie temporale di carico: è sforzo, non un record — quindi ambra.
                  Il rosa resta riservato ai record personali. */}
              <BarChart
                data={data.strength.points}
                color={colors.amber}
                height={152}
                baseline={strengthBaseline}
                unit="kg"
                a11yLabel={`1RM stimato su ${data.strength.exerciseName}, seduta per seduta`}
              />
              {/* La risposta a «sto diventando più forte?» in cifre, non solo in
                  forma: la stessa riga del trend usata dalla card del volume. */}
              {data.strengthDeltaPct != null ? (
                <View style={styles.delta}>
                  <Ionicons
                    name={data.strengthDeltaPct >= 0 ? 'trending-up' : 'trending-down'}
                    size={20}
                    color={strengthTone}
                  />
                  <Text style={styles.deltaText}>
                    <Text style={[styles.deltaValue, tabular, { color: strengthTone }]}>
                      {data.strengthDeltaPct >= 0 ? '+' : ''}
                      {data.strengthDeltaPct}%
                    </Text>
                    {' dalla prima seduta del periodo'}
                  </Text>
                </View>
              ) : null}
            </Card>
          </Appear>
        ) : null}

        {/* La lista dei record entra come blocco unico: mai riga per riga. */}
        <Appear delay={appearDelay(7)} replayOnFocus>
          <Card title="Record personali">
            {data.prs.length > 0 ? (
              <View style={styles.prList}>
                {data.prs.map((pr, i) => (
                  <View key={pr.id} style={[styles.prRow, i === data.prs.length - 1 && styles.prRowLast]}>
                    <View style={styles.prBadge}>
                      <Ionicons name="trophy" size={18} color={colors.rose} />
                    </View>
                    <View style={styles.prInfo}>
                      <Text style={styles.prExercise} numberOfLines={1}>
                        {pr.exercise?.name ?? 'Esercizio'}
                      </Text>
                      <Text style={styles.prMeta} numberOfLines={1}>
                        {RECORD_LABELS[pr.record_type]} · {formatDay(pr.achieved_at)}
                      </Text>
                    </View>
                    <Text style={styles.prValue}>
                      {pr.record_type === 'max_reps' ? `${Math.round(pr.value)}` : `${itNum(pr.value)} kg`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                Nessun record ancora: continua così e cominceranno ad arrivare. 💪
              </Text>
            )}
            {/* La lista è troncata: dirlo, invece di lasciar credere che manchino. */}
            {data.prTotal > data.prs.length ? (
              <Text style={[styles.prNote, tabular]}>
                I {data.prs.length} più recenti, su {data.prTotal} record totali.
              </Text>
            ) : null}
          </Card>
        </Appear>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Scheletro di caricamento che ricalca il layout reale, come nelle sorelle:
 * uno spinner centrato non dice quanto manca né cosa sta arrivando, e questa
 * è la schermata più lenta dell'app (sette interrogazioni al server).
 */
function ProgressiSkeleton() {
  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <View style={sharedStyles.content}>
        <Skeleton width={168} height={34} />
        <Card>
          <Skeleton width={112} height={12} />
          <View style={styles.skeletonMetric}>
            <View style={styles.skeletonMetricMain}>
              <Skeleton width={150} height={58} />
              <Skeleton width={190} height={14} />
            </View>
            <Skeleton width={96} height={96} round={48} />
          </View>
        </Card>
        {[0, 1].map((row) => (
          <View key={row} style={styles.pillRow}>
            <View style={styles.skeletonPill}>
              <Skeleton width={72} height={12} />
              <Skeleton width={90} height={24} />
            </View>
            <View style={styles.skeletonPill}>
              <Skeleton width={72} height={12} />
              <Skeleton width={90} height={24} />
            </View>
          </View>
        ))}
        {[152, 112].map((h, i) => (
          <Card key={i}>
            <Skeleton width={148} height={12} />
            <Skeleton width="76%" height={14} />
            <Skeleton height={h} round={radius.sm} />
          </Card>
        ))}
      </View>
    </SafeAreaView>
  );
}

/**
 * Raggio interno delle superfici dentro una card (regola concentrica).
 * La Card ha padding `spacing.xl`: è quello il valore da sottrarre, non `lg`.
 */
const innerRadius = concentric(radius.lg, spacing.xl);

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  streak: {
    width: 96,
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakValue: {
    ...type.metricSm,
    ...tabular,
    fontSize: 30,
    lineHeight: 34,
    color: colors.mint,
  },
  streakLabel: {
    ...type.label,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  aiLabel: {
    color: colors.violet,
  },
  cardSub: {
    ...sharedStyles.muted,
  },
  cardTitleStrong: {
    ...type.title,
  },
  insightList: {
    gap: spacing.sm,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    padding: spacing.lg,
  },
  insightIcon: {
    marginTop: 2,
  },
  insightBody: {
    flex: 1,
    gap: spacing.xs,
  },
  insightTitle: {
    ...type.body,
    fontWeight: '700',
  },
  insightText: {
    ...type.body,
    color: colors.textSecondary,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deltaText: {
    ...sharedStyles.muted,
    flex: 1,
  },
  deltaValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  prList: {
    gap: 0,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  prRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  prBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prInfo: {
    flex: 1,
    gap: 2,
  },
  prExercise: {
    ...type.body,
    fontWeight: '700',
  },
  prMeta: {
    ...sharedStyles.muted,
  },
  prValue: {
    ...tabular,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.rose,
  },
  prNote: {
    ...sharedStyles.muted,
  },
  emptyText: {
    ...type.body,
    color: colors.textSecondary,
  },
  skeletonMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  skeletonMetricMain: {
    flex: 1,
    gap: spacing.sm,
  },
  skeletonPill: {
    flex: 1,
    gap: spacing.sm,
    backgroundColor: 'rgba(21,26,36,0.92)',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
