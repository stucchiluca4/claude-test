import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { macrosToKcal } from '@wc/shared';
import type { Food, NutritionDay } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { localDateString, showError } from '../../lib/utils';
import {
  getActiveCoachClient,
  getBiofeedbackByDate,
  getTodayNutritionDay,
  getUserId,
} from '../../lib/queries';
import { demoNutrition, isDemo } from '../../lib/demo';
import { ActivityRing } from '../../components/ActivityRing';
import { Appear, appearDelay } from '../../components/Appear';
import { Card } from '../../components/Card';
import { MacroBar } from '../../components/MacroBar';
import { MetricBlock } from '../../components/MetricBlock';
import { Press } from '../../components/Press';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/States';

interface MealFoodRow {
  id: string;
  quantity_g: number;
  sort_order: number;
  food: Food | null;
}

interface MealRow {
  id: string;
  name: string;
  meal_time: string | null;
  sort_order: number;
  meal_foods: MealFoodRow[];
}

interface NutritionData {
  hasCoach: boolean;
  day: NutritionDay | null;
  meals: MealRow[];
  /** Quanto l'atleta ha davvero mangiato oggi (dal check giornaliero). */
  eatenKcal: number | null;
}

/** Kcal di un alimento per la quantità indicata (regola per-100g). */
function foodKcal(mf: MealFoodRow): number {
  if (!mf.food) return 0;
  return (mf.quantity_g / 100) * mf.food.kcal_per_100g;
}

function mealKcal(meal: MealRow): number {
  return meal.meal_foods.reduce((acc, mf) => acc + foodKcal(mf), 0);
}

export default function NutrizioneScreen() {
  const router = useRouter();
  const [data, setData] = useState<NutritionData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isDemo()) {
        const { day, meals } = demoNutrition();
        setData({ hasCoach: true, day, meals, eatenKcal: 1850 });
        return;
      }

      const uid = await getUserId();
      if (!uid) return;

      const cc = await getActiveCoachClient(uid);
      if (!cc) {
        setData({ hasCoach: false, day: null, meals: [], eatenKcal: null });
        return;
      }

      const [day, bio] = await Promise.all([
        getTodayNutritionDay(cc.id),
        getBiofeedbackByDate(cc.id, localDateString(new Date())),
      ]);
      let meals: MealRow[] = [];
      if (day) {
        const { data: rows, error } = await supabase
          .from('meals')
          .select('id, name, meal_time, sort_order, meal_foods(id, quantity_g, sort_order, food:foods(*))')
          .eq('nutrition_day_id', day.id)
          .order('sort_order', { ascending: true });
        if (error) throw new Error(error.message);
        meals = ((rows ?? []) as unknown as MealRow[]).map((m) => ({
          ...m,
          meal_foods: [...m.meal_foods].sort((a, b) => a.sort_order - b.sort_order),
        }));
      }

      setData({ hasCoach: true, day, meals, eatenKcal: bio?.kcal_consumed ?? null });
    } catch (e) {
      showError(e, 'Errore di caricamento');
    }
  }, []);

  // Il piano del coach e le calorie registrate cambiano mentre l'app è aperta:
  // si ricarica a ogni ritorno sulla scheda, non solo al primo montaggio.
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
    return <NutritionSkeleton />;
  }

  const day = data.day;
  const macroKcal = day
    ? macrosToKcal({ proteinG: day.protein_g, carbsG: day.carbs_g, fatG: day.fat_g })
    : 0;
  const plannedKcal = data.meals.reduce((acc, m) => acc + mealKcal(m), 0);
  const hasMeals = data.meals.length > 0;

  // La domanda dell'atleta è «quanto posso ancora mangiare», non «il coach ha
  // compilato bene il piano». Se le calorie di oggi sono state registrate, il
  // numero dominante risponde a quella; altrimenti resta l'obiettivo.
  const eaten = data.eatenKcal;
  const tracked = eaten !== null && !!day && day.kcal > 0;
  const ratio = tracked ? eaten! / day!.kcal : 0;
  const left = tracked ? day!.kcal - eaten! : 0;
  const over = left < 0;
  // Menta quando sei nel bersaglio, ambra quando ne sei fuori: due soli stati.
  const tone = tracked && ratio >= 0.9 && ratio <= 1.05 ? colors.mint : colors.amber;
  const fmt = (n: number) => Math.round(n).toLocaleString('it-IT');

  const isTraining = day?.day_type === 'training';
  const dayTone = isTraining ? colors.amber : colors.cyan;

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Cascata d'entrata: rientra a ogni ritorno sulla scheda. */}
        <Appear delay={appearDelay(0)} style={styles.header} replayOnFocus>
          <Text style={sharedStyles.screenTitle}>Nutrizione</Text>
          {day ? (
            <View style={styles.dayChip}>
              <Ionicons name={isTraining ? 'barbell' : 'moon'} size={16} color={dayTone} />
              <Text style={[styles.dayChipText, { color: dayTone }]}>
                {isTraining ? 'Giorno di allenamento' : 'Giorno di riposo'}
              </Text>
            </View>
          ) : null}
        </Appear>

        {!data.hasCoach ? (
          <Appear delay={appearDelay(1)} replayOnFocus>
            <EmptyState
              emoji="🤝"
              title="Nessun coach collegato"
              message="Quando il tuo coach ti aggiungerà, qui troverai il piano nutrizionale con calorie, macro e pasti del giorno."
            />
          </Appear>
        ) : !day ? (
          <Appear delay={appearDelay(1)} replayOnFocus>
            <EmptyState
              emoji="🥗"
              title="Nessun piano per oggi"
              message="Il tuo coach lo sta preparando. Appena pronto, qui vedrai obiettivo calorico, macro e pasti."
            />
          </Appear>
        ) : (
          <>
            {/* IL BLOCCO DOMINANTE: quanto resta da mangiare oggi, leggibile in
                tre secondi. Senza calorie registrate mostra l'obiettivo. */}
            <Appear delay={appearDelay(1)} replayOnFocus>
              <Card title={tracked ? (over ? 'Oltre l’obiettivo' : 'Ti restano oggi') : 'Obiettivo di oggi'}>
                <MetricBlock
                  value={tracked ? fmt(Math.abs(left)) : fmt(day.kcal)}
                  unit="kcal"
                  color={tracked ? tone : colors.textPrimary}
                  caption={
                    tracked
                      ? `Mangiate ${fmt(eaten!)} di ${fmt(day.kcal)} kcal`
                      : hasMeals
                        ? `Obiettivo del giorno · nei pasti pianificati ${fmt(plannedKcal)} kcal`
                        : 'Obiettivo calorico del giorno'
                  }
                  trailing={
                    tracked ? (
                      <ActivityRing progress={Math.min(ratio, 1)} color={tone} size={88} strokeWidth={12}>
                        <Text style={[styles.ringValue, tabular, { color: tone }]}>
                          {Math.round(ratio * 100)}%
                        </Text>
                      </ActivityRing>
                    ) : undefined
                  }
                />

                {/* Una sola azione, sempre nello stesso posto: da qui si registra
                    o si corregge quanto hai mangiato. */}
                <Press
                  onPress={() => router.push('/biofeedback/oggi')}
                  style={styles.action}
                  accessibilityLabel={tracked ? 'Aggiorna le calorie di oggi' : 'Registra cosa hai mangiato'}
                >
                  <Ionicons
                    name={tracked ? 'create-outline' : 'add-circle-outline'}
                    size={19}
                    color={colors.accent}
                  />
                  <Text style={styles.actionText}>
                    {tracked ? 'Aggiorna le calorie di oggi' : 'Registra cosa hai mangiato'}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
                </Press>
              </Card>
            </Appear>

            {/* I macro sono dati categoriali, non segnali: scala neutra per densità
                (bianco → nebbia → fumo), così non rubano il mestiere ai sei segnali. */}
            <Appear delay={appearDelay(2)} replayOnFocus>
              <Card title="Macro del giorno">
                <MacroBar
                  label="Proteine"
                  grams={day.protein_g}
                  fraction={macroKcal > 0 ? (day.protein_g * 4) / macroKcal : 0}
                  color={colors.macroProtein}
                  showShare
                />
                <MacroBar
                  label="Carboidrati"
                  grams={day.carbs_g}
                  fraction={macroKcal > 0 ? (day.carbs_g * 4) / macroKcal : 0}
                  color={colors.macroCarbs}
                  showShare
                />
                <MacroBar
                  label="Grassi"
                  grams={day.fat_g}
                  fraction={macroKcal > 0 ? (day.fat_g * 9) / macroKcal : 0}
                  color={colors.macroFat}
                  showShare
                />
              </Card>
            </Appear>

            {!hasMeals ? (
              <Appear delay={appearDelay(3)} replayOnFocus>
                <EmptyState
                  emoji="🍽️"
                  title="Pasti non ancora dettagliati"
                  message="Per oggi segui i macro qui sopra: quando il coach inserirà i pasti, li troverai elencati qui."
                />
              </Appear>
            ) : (
              // Entra l'elenco dei pasti come blocco: le card interne non si
              // muovono una per una, altrimenti la cascata diventa attesa.
              <Appear delay={appearDelay(3)} style={styles.section} replayOnFocus>
                <Text style={type.label}>Pasti del giorno</Text>
                {data.meals.map((meal) => (
                  <Card key={meal.id}>
                    <View style={styles.mealHeader}>
                      <View style={styles.mealTitle}>
                        <Text style={styles.mealName} numberOfLines={1}>
                          {meal.name}
                        </Text>
                        {meal.meal_time ? (
                          <View style={styles.timeChip}>
                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.timeChipText, tabular]}>{meal.meal_time.slice(0, 5)}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.mealKcal, tabular]}>
                        {Math.round(mealKcal(meal))}
                        <Text style={styles.mealKcalUnit}> kcal</Text>
                      </Text>
                    </View>

                    {meal.meal_foods.length === 0 ? (
                      <Text style={styles.muted}>Nessun alimento indicato.</Text>
                    ) : (
                      <View style={styles.foods}>
                        {meal.meal_foods.map((mf, i) => (
                          <View key={mf.id} style={[styles.foodRow, i > 0 && styles.foodDivider]}>
                            <View style={styles.foodMain}>
                              <Text style={styles.foodName} numberOfLines={1}>
                                {mf.food?.name ?? 'Alimento'}
                              </Text>
                              <Text style={[styles.foodQty, tabular]}>{Math.round(mf.quantity_g)} g</Text>
                            </View>
                            <Text style={[styles.foodKcal, tabular]}>
                              {Math.round(foodKcal(mf))}
                              <Text style={styles.foodKcalUnit}> kcal</Text>
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card>
                ))}
              </Appear>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Skeleton di caricamento che ricalca il layout reale della schermata. */
function NutritionSkeleton() {
  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <View style={sharedStyles.content}>
        <Skeleton width={190} height={34} />
        <Skeleton width={210} height={36} round={radius.pill} />
        <Card>
          <Skeleton width={104} height={12} />
          <View style={styles.skeletonMetric}>
            <View style={styles.skeletonMetricMain}>
              <Skeleton width={168} height={58} />
              <Skeleton width={140} height={14} />
            </View>
            <Skeleton width={88} height={88} round={44} />
          </View>
        </Card>
        <Card>
          <Skeleton width={124} height={12} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonMacro}>
              <Skeleton width="46%" height={13} />
              <Skeleton height={8} round={4} />
            </View>
          ))}
        </Card>
        {[0, 1].map((i) => (
          <Card key={i}>
            <View style={styles.mealHeader}>
              <Skeleton width={124} height={22} />
              <Skeleton width={72} height={22} />
            </View>
            <Skeleton height={14} />
            <Skeleton width="72%" height={14} />
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
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dayChipText: {
    ...type.callout,
    fontWeight: '700',
  },
  ringValue: {
    ...type.body,
    fontWeight: '800',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: innerRadius,
    backgroundColor: colors.raised,
  },
  actionText: {
    ...type.body,
    flex: 1,
    fontWeight: '600',
    color: colors.accent,
  },
  section: {
    gap: spacing.md,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mealTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealName: {
    ...type.title,
    flexShrink: 1,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  timeChipText: {
    ...type.callout,
    color: colors.textSecondary,
  },
  mealKcal: {
    ...type.title,
    fontWeight: '800',
  },
  mealKcalUnit: {
    ...type.callout,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
  foods: {
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingHorizontal: spacing.lg,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  foodDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  foodMain: {
    flex: 1,
    gap: 2,
  },
  foodName: {
    ...type.body,
  },
  foodQty: {
    ...type.callout,
    color: colors.textSecondary,
  },
  foodKcal: {
    ...type.body,
    fontWeight: '700',
  },
  foodKcalUnit: {
    ...type.callout,
    color: colors.textSecondary,
    fontWeight: '600',
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
  skeletonMacro: {
    gap: spacing.sm,
  },
});
