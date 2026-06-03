import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { Workout, PersonalRecord } from '@/types';

export function useWorkoutHistory(limit = 20) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from('workouts')
        .select(`*, workout_exercises(*, exercise:exercises(*), workout_sets(*))`)
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false })
        .limit(limit);
      setWorkouts(data || []);
      setLoading(false);
    }
    load();
  }, [user, limit]);

  return { workouts, loading };
}

export function usePersonalRecords() {
  const { user } = useAuth();
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from('personal_records')
        .select('*, exercise:exercises(name, muscle_primary)')
        .eq('user_id', user!.id)
        .order('achieved_at', { ascending: false });
      setPRs(data || []);
      setLoading(false);
    }
    load();
  }, [user]);

  return { prs, loading };
}

export function useExerciseProgress(exerciseId: string) {
  const { user } = useAuth();
  const [data, setData] = useState<{ date: string; weight: number; volume: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!user || !exerciseId) return;
    async function load() {
      // Get workout sets for this exercise
      const { data: exercises } = await supabase
        .from('workout_exercises')
        .select(`
          workout:workouts(started_at),
          workout_sets(weight_kg, reps)
        `)
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!exercises) { setLoading(false); return; }

      const points = exercises
        .filter((e: any) => e.workout && e.workout_sets?.length > 0)
        .map((e: any) => {
          const maxWeight = Math.max(...e.workout_sets.map((s: any) => s.weight_kg));
          const totalVolume = e.workout_sets.reduce((acc: number, s: any) => acc + s.weight_kg * s.reps, 0);
          return {
            date: e.workout.started_at.split('T')[0],
            weight: maxWeight,
            volume: totalVolume,
          };
        })
        .reverse();

      setData(points);
      setLoading(false);
    }
    load();
  }, [user, exerciseId]);

  return { data, loading };
}

export function useAttendance() {
  const { user } = useAuth();
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from('attendance')
        .select('trained_date')
        .eq('user_id', user!.id)
        .order('trained_date', { ascending: false })
        .limit(365);
      setDates((data || []).map((a: any) => a.trained_date));
      setLoading(false);
    }
    load();
  }, [user]);

  return { dates, loading };
}
