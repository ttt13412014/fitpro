import { getSupabaseClient } from '@/lib/supabase';
import type { Workout, WorkoutExercise, WorkoutSet, ActiveWorkout } from '@/types';

const supabase = getSupabaseClient();

export async function saveWorkout(
  userId: string,
  activeWorkout: ActiveWorkout
): Promise<{ workout: Workout | null; error: Error | null }> {
  try {
    const startedAt = new Date(activeWorkout.started_at);
    const finishedAt = new Date();
    const durationMinutes = Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000);

    // 1. Crear el workout
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        name: activeWorkout.name,
        started_at: activeWorkout.started_at,
        finished_at: finishedAt.toISOString(),
        duration_minutes: durationMinutes,
      })
      .select()
      .single();

    if (workoutError) throw workoutError;

    // 2. Guardar cada ejercicio y sus series
    for (let i = 0; i < activeWorkout.exercises.length; i++) {
      const ex = activeWorkout.exercises[i];

      const { data: workoutExercise, error: exError } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          exercise_id: ex.exercise.id,
          exercise_order: i + 1,
          notes: ex.notes,
        })
        .select()
        .single();

      if (exError) throw exError;

      const completedSets = ex.sets.filter((s) => s.completed);
      for (const set of completedSets) {
        const { error: setError } = await supabase.from('workout_sets').insert({
          workout_exercise_id: workoutExercise.id,
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          reps: set.reps,
          rir: set.rir,
          is_warmup: set.is_warmup,
          is_dropset: false,
          is_failure: false,
        });

        if (setError) throw setError;
      }
    }

    // 3. Registrar asistencia
    await supabase.from('attendance').upsert({
      user_id: userId,
      workout_id: workout.id,
      trained_date: new Date().toISOString().split('T')[0],
    });

    // 4. Detectar PRs automáticamente
    await detectAndSavePRs(userId, workout.id, activeWorkout);

    return { workout, error: null };
  } catch (err) {
    return { workout: null, error: err as Error };
  }
}

async function detectAndSavePRs(userId: string, workoutId: string, activeWorkout: ActiveWorkout) {
  for (const ex of activeWorkout.exercises) {
    const completedSets = ex.sets.filter((s) => s.completed && s.weight_kg > 0);
    if (completedSets.length === 0) continue;

    const maxWeight = Math.max(...completedSets.map((s) => s.weight_kg));
    const maxReps = Math.max(...completedSets.map((s) => s.reps));
    const totalVolume = completedSets.reduce((acc, s) => acc + s.weight_kg * s.reps, 0);
    const estimated1RM = Math.max(
      ...completedSets.map((s) => s.weight_kg * (1 + s.reps / 30))
    );

    // Obtener PRs actuales
    const { data: currentPRs } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', ex.exercise.id);

    const prMap = new Map(currentPRs?.map((pr) => [pr.pr_type, pr]) || []);

    const prUpdates = [
      { type: 'max_weight', value: maxWeight },
      { type: 'max_reps', value: maxReps },
      { type: 'max_volume', value: totalVolume },
      { type: '1rm', value: Math.round(estimated1RM) },
    ];

    for (const { type, value } of prUpdates) {
      const current = prMap.get(type);
      if (!current || value > current.value) {
        await supabase.from('personal_records').upsert({
          user_id: userId,
          exercise_id: ex.exercise.id,
          pr_type: type,
          value,
          previous_value: current?.value,
          achieved_at: new Date().toISOString(),
        });
      }
    }
  }
}

export async function getWorkoutHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        *,
        exercise:exercises(*),
        workout_sets(*)
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

export async function getRecentPRs(userId: string, limit = 5) {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*, exercise:exercises(name, muscle_primary)')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

export async function getWeeklyVolume(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at, total_volume_kg')
    .eq('user_id', userId)
    .gte('started_at', sevenDaysAgo)
    .order('started_at');

  return { data, error };
}

export async function evaluateProgressionForUser(userId: string) {
  // Obtener los ejercicios entrenados en las últimas 2 semanas
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select(`
      workout_exercises(
        exercise_id,
        workout_sets(weight_kg, reps, rir)
      )
    `)
    .eq('user_id', userId)
    .gte('started_at', twoWeeksAgo);

  if (!recentWorkouts) return [];

  // Agrupar por ejercicio
  const exerciseMap = new Map<string, { weight_kg: number; reps: number; rir?: number }[]>();

  for (const workout of recentWorkouts) {
    for (const ex of (workout.workout_exercises as any[]) || []) {
      const sets = ex.workout_sets || [];
      if (!exerciseMap.has(ex.exercise_id)) {
        exerciseMap.set(ex.exercise_id, []);
      }
      exerciseMap.get(ex.exercise_id)!.push(...sets);
    }
  }

  const suggestions = [];

  for (const [exerciseId, sets] of exerciseMap.entries()) {
    if (sets.length < 3) continue; // No suficientes datos

    const avgRIR = sets.reduce((acc, s) => acc + (s.rir ?? 2), 0) / sets.length;
    const maxReps = Math.max(...sets.map((s) => s.reps));
    const currentWeight = sets[sets.length - 1]?.weight_kg || 0;
    const allHighReps = sets.every((s) => s.reps >= 10);

    let suggestion: 'increase' | 'maintain' | 'decrease' = 'maintain';
    let reason = 'Rendimiento estable';

    if (allHighReps && avgRIR >= 2) {
      suggestion = 'increase';
      reason = `Promedio RIR ${avgRIR.toFixed(1)} — hay margen para subir peso`;
    } else if (sets.filter((s) => s.reps < 6).length >= 2) {
      suggestion = 'decrease';
      reason = 'Varias series con pocas reps — considera reducir el peso';
    }

    suggestions.push({
      exercise_id: exerciseId,
      suggestion,
      reason,
      suggested_weight_kg: suggestion === 'increase' ? currentWeight + 2.5 : undefined,
    });
  }

  return suggestions;
}
