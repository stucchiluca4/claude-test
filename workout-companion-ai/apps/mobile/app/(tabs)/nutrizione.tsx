import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { macrosToKcal } from '@wc/shared';
import type { Food, NutritionDay } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, spacing, sharedStyles } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getActiveCoachClient, getTodayNutritionDay, getUserId } from '../../lib/queries';
import { Card } from '../../components/Card';
import { MacroBar } from '../../components/MacroBar';

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
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Carico il tuo piano…</Text>
        </View>
      </SafeAreaView>
    );
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
        <View>
          <Text style={sharedStyles.screenTitle}>Nutrizione</Text>
          {day ? (
            <Text style={sharedStyles.muted}>
              Giorno di {day.day_type === 'training' ? 'allenamento' : 'riposo'}
            </Text>
          ) : null}
        </View>

        {!data.hasCoach ? (
          <Card>
            <Text style={sharedStyles.body}>
              Non sei ancora collegato a un coach: il piano nutrizionale apparirà qui appena disponibile.
            </Text>
          </Card>
        ) : !day ? (
          <Card>
            <Text style={sharedStyles.body}>
              Nessun piano nutrizionale attivo per oggi. Il tuo coach lo sta preparando!
            </Text>
          </Card>
        ) : (
          <>
            <Card title="Obiettivo di oggi">
              <View style={styles.kcalRow}>
                <Text style={sharedStyles.bigNumber}>{day.kcal}</Text>
                <Text style={styles.kcalUnit}>kcal</Text>
              </View>
              {data.meals.length > 0 ? (
                <>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${coverage * 100}%` }]} />
                  </View>
                  <Text style={sharedStyles.muted}>
                    {Math.round(plannedKcal)} kcal pianificate nei pasti
                  </Text>
                </>
              ) : null}
              <MacroBar
                label="Proteine"
                grams={day.protein_g}
                fraction={macroKcal > 0 ? (day.protein_g * 4) / macroKcal : 0}
                color={colors.accent}
              />
              <MacroBar
                label="Carboidrati"
                grams={day.carbs_g}
                fraction={macroKcal > 0 ? (day.carbs_g * 4) / macroKcal : 0}
                color={colors.warning}
              />
              <MacroBar
                label="Grassi"
                grams={day.fat_g}
                fraction={macroKcal > 0 ? (day.fat_g * 9) / macroKcal : 0}
                color={colors.success}
              />
            </Card>

            {data.meals.length === 0 ? (
              <Card>
                <Text style={sharedStyles.body}>
                  I pasti di oggi non sono ancora stati dettagliati: segui i macro qui sopra.
                </Text>
              </Card>
            ) : (
              data.meals.map((meal) => (
                <Card key={meal.id}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealName}>
                      {meal.name}
                      {meal.meal_time ? `  ·  ${meal.meal_time.slice(0, 5)}` : ''}
                    </Text>
                    <Text style={styles.mealKcal}>{Math.round(mealKcal(meal))} kcal</Text>
                  </View>
                  {meal.meal_foods.length === 0 ? (
                    <Text style={sharedStyles.muted}>Nessun alimento indicato.</Text>
                  ) : (
                    meal.meal_foods.map((mf) => (
                      <View key={mf.id} style={styles.foodRow}>
                        <Text style={styles.foodName} numberOfLines={1}>
                          {mf.food?.name ?? 'Alimento'}
                        </Text>
                        <Text style={sharedStyles.muted}>
                          {Math.round(mf.quantity_g)} g · {Math.round(foodKcal(mf))} kcal
                        </Text>
                      </View>
                    ))
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

const styles = StyleSheet.create({
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
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  mealKcal: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  foodName: {
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
});
