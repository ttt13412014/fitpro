import { getSupabaseClient } from '@/lib/supabase';
import type { NutritionLog } from '@/types';

const supabase = getSupabaseClient();

export async function getTodayNutrition(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', today)
    .order('created_at');

  return { data, error };
}

export async function addNutritionLog(
  userId: string,
  log: Omit<NutritionLog, 'id' | 'user_id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .insert({ ...log, user_id: userId })
    .select()
    .single();

  return { data, error };
}

export async function deleteNutritionLog(logId: string) {
  const { error } = await supabase.from('nutrition_logs').delete().eq('id', logId);
  return { error };
}

export async function getWeeklyNutrition(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('logged_date, calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .gte('logged_date', sevenDaysAgo)
    .order('logged_date');

  if (!data) return { data: [], error };

  // Agrupar por día
  const grouped = data.reduce(
    (acc: Record<string, any>, log) => {
      const d = log.logged_date;
      if (!acc[d]) {
        acc[d] = { date: d, calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      acc[d].calories += log.calories;
      acc[d].protein += log.protein_g;
      acc[d].carbs += log.carbs_g;
      acc[d].fat += log.fat_g;
      return acc;
    },
    {}
  );

  return { data: Object.values(grouped), error };
}

// Parser de texto para agregar comidas con AI
export function parseNutritionFromText(text: string): Partial<NutritionLog> {
  // Patrones simples para parsear texto como "200g de pollo = 300 kcal, 40g proteína"
  const calorieMatch = text.match(/(\d+)\s*(kcal|cal|calorías?)/i);
  const proteinMatch = text.match(/(\d+(?:\.\d+)?)\s*g?\s*(proteína|protein)/i);
  const carbsMatch = text.match(/(\d+(?:\.\d+)?)\s*g?\s*(carbs?|carbohidrato|hidratos?)/i);
  const fatMatch = text.match(/(\d+(?:\.\d+)?)\s*g?\s*(grasa|fat)/i);

  return {
    calories: calorieMatch ? parseInt(calorieMatch[1]) : 0,
    protein_g: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
    carbs_g: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
    fat_g: fatMatch ? parseFloat(fatMatch[1]) : 0,
  };
}

// Totales del día
export function calculateDailyTotals(logs: NutritionLog[]) {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein_g: acc.protein_g + log.protein_g,
      carbs_g: acc.carbs_g + log.carbs_g,
      fat_g: acc.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}
