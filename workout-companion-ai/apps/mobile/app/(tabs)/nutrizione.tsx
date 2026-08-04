import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { macrosToKcal } from '@wc/shared';
import type { Food, NutritionDay } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getActiveCoachClient, getTodayNutritionDay, getUserId } from '../../lib/queries';
import { demoNutrition, isDemo } from '../../lib/demo';
import { Card } from '../../components/Card';
import { MacroBar } from '../../components/MacroBar';
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
  const [data, setData] = useState<NutritionData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isDemo()) {
        const { day, meals } = demoNutrition();
        setData({ hasCoach: true, day, meals });
        return;
      }

      const uid = await getUserId();
      if (!uid) return;

      const cc = await getActiveCoachClient(uid);
      if (!cc) {
        setData({ hasCoach: false, day: null, meals: [] });
        return;
      }

      const day = await getTodayNutritionDay(cc.id);
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

      setData({ hasCoach: true, day, meals });
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

  if (!data) {
    return <NutritionSkeleton />;
  }

  const day = data.day;
  const macroKcal = day
    ? macrosToKcal({ proteinG: day.protein_g, carbsG: day.carbs_g, fatG: day.fat_g })
    : 0;
  const plannedKcal = data.meals.reduce((acc, m) => acc + mealKcal(m), 0);
  const coverage = day && day.kcal > 0 ? Math.min(plannedKcal / day.kcal, 1) : 0;

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <Text style={sharedStyles.screenTitle}>Nutrizione</Text>
          {day ? (
            <View style={styles.dayChip}>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: day.day_type === 'training' ? colors.accent : colors.textSecondary },
                ]}
              />
              <Text style={styles.dayChipText}>
                {day.day_type === 'training' ? 'Giorno di allenamento' : 'Giorno di riposo'}
              </Text>
            </View>
          ) : null}
        </View>

        {!data.hasCoach ? (
          <EmptyState
            emoji="🤝"
            title="Nessun coach collegato"
            message="Quando il tuo coach ti aggiungerà, qui troverai il piano nutrizionale con calorie, macro e pasti del giorno."
          />
        ) : !day ? (
          <EmptyState
            emoji="🥗"
            title="Nessun piano per oggi"
            message="Il tuo coach lo sta preparando. Appena pronto, qui vedrai obiettivo calorico, macro e pasti."
          />
        ) : (
          <>
            <Card title="Obiettivo di oggi">
              <View style={styles.kcalRow}>
                <Text style={sharedStyles.bigNumber}>{day.kcal.toLocaleString('it-IT')}</Text>
                <Text style={styles.kcalUnit}>kcal</Text>
              </View>
              {data.meals.length > 0 ? (
                <>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${coverage * 100}%` }]} />
                  </View>
                  <View style={styles.plannedRow}>
                    <Text style={sharedStyles.muted}>Pianificate nei pasti</Text>
                    <Text style={styles.plannedValue}>
                      {Math.round(plannedKcal).toLocaleString('it-IT')} kcal · {Math.round(coverage * 100)}%
                    </Text>
                  </View>
                </>
              ) : null}
              <MacroBar
                label="Proteine"
                grams={day.protein_g}
                fraction={macroKcal > 0 ? (day.protein_g * 4) / macroKcal : 0}
                color={colors.accent}
                showShare
              />
              <MacroBar
                label="Carboidrati"
                grams={day.carbs_g}
                fraction={macroKcal > 0 ? (day.carbs_g * 4) / macroKcal : 0}
                color={colors.avio}
                showShare
              />
              <MacroBar
                label="Grassi"
                grams={day.fat_g}
                fraction={macroKcal > 0 ? (day.fat_g * 9) / macroKcal : 0}
                color={colors.celeste}
                showShare
              />
            </Card>

            {data.meals.length === 0 ? (
              <EmptyState
                emoji="🍽️"
                title="Pasti non ancora dettagliati"
                message="Per oggi segui i macro qui sopra: quando il coach inserirà i pasti, li troverai elencati qui."
              />
            ) : (
              data.meals.map((meal) => (
                <Card key={meal.id}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    {meal.meal_time ? (
                      <View style={styles.timeChip}>
                        <Text style={styles.timeChipText}>{meal.meal_time.slice(0, 5)}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.mealKcal}>{Math.round(mealKcal(meal))} kcal</Text>
                  </View>
                  {meal.meal_foods.length === 0 ? (
                    <Text style={sharedStyles.muted}>Nessun alimento indicato.</Text>
                  ) : (
                    <View>
                      {meal.meal_foods.map((mf, i) => (
                        <View key={mf.id} style={[styles.foodRow, i > 0 && styles.foodRowDivider]}>
                          <Text style={styles.foodName} numberOfLines={1}>
                            {mf.food?.name ?? 'Alimento'}
                          </Text>
                          <Text style={styles.foodQty}>{Math.round(mf.quantity_g)} g</Text>
                          <Text style={styles.foodKcal}>{Math.round(foodKcal(mf))} kcal</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              ))
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
        <Skeleton width={170} height={30} />
        <Skeleton width={150} height={22} round={radius.md} />
        <Card>
          <Skeleton width={104} height={12} />
          <Skeleton width={150} height={38} />
          <Skeleton height={10} round={5} />
          <Skeleton height={8} round={4} />
          <Skeleton height={8} round={4} />
          <Skeleton height={8} round={4} />
        </Card>
        {[0, 1].map((i) => (
          <Card key={i}>
            <View style={styles.mealHeader}>
              <Skeleton width={110} height={16} />
              <Skeleton width={60} height={16} />
            </View>
            <Skeleton height={12} />
            <Skeleton width="72%" height={12} />
          </Card>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  kcalUnit: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  plannedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plannedValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timeChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  mealKcal: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 7,
  },
  foodRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  foodName: {
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  foodQty: {
    color: colors.textSecondary,
    fontSize: 13,
    minWidth: 48,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  foodKcal: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 62,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
