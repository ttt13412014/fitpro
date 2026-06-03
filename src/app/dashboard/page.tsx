'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getSupabaseClient } from '@/lib/supabase';
import { getRecentPRs, getWeeklyVolume } from '@/services/workout.service';
import { getTodayNutrition, calculateDailyTotals } from '@/services/nutrition.service';
import { calculateStreak, detectFatigue } from '@/lib/utils';
import type { Workout, PersonalRecord, NutritionLog, BodyweightEntry } from '@/types';

import { StatsRow } from '@/components/dashboard/StatsRow';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { NutritionSummary } from '@/components/dashboard/NutritionSummary';
import { AttendanceCalendar } from '@/components/dashboard/AttendanceCalendar';
import { PRCards } from '@/components/dashboard/PRCards';
import { FatigueIndicator } from '@/components/dashboard/FatigueIndicator';
import { RecentWorkouts } from '@/components/dashboard/RecentWorkouts';
import { BodyweightChart } from '@/components/charts/BodyweightChart';
import Link from 'next/link';
import { Plus, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [todayNutrition, setTodayNutrition] = useState<NutritionLog[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<any[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<string[]>([]);
  const [bodyweightData, setBodyweightData] = useState<BodyweightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [workoutsRes, prsRes, nutritionRes, volumeRes, attendanceRes, bwRes] = await Promise.all([
      supabase.from('workouts').select('*').eq('user_id', user!.id).order('started_at', { ascending: false }).limit(10),
      getRecentPRs(user!.id, 4),
      getTodayNutrition(user!.id),
      getWeeklyVolume(user!.id),
      supabase.from('attendance').select('trained_date').eq('user_id', user!.id).order('trained_date', { ascending: false }).limit(90),
      supabase.from('bodyweight').select('*').eq('user_id', user!.id).order('recorded_at', { ascending: false }).limit(30),
    ]);
    setRecentWorkouts(workoutsRes.data || []);
    setPRs(prsRes.data || []);
    setTodayNutrition(nutritionRes.data || []);
    setWeeklyVolume(volumeRes.data || []);
    setAttendanceDates((attendanceRes.data || []).map((a: any) => a.trained_date));
    setBodyweightData(bwRes.data || []);
    setLoading(false);
  }

  const totals = calculateDailyTotals(todayNutrition);
  const streak = calculateStreak(attendanceDates);
  const currentWeight = bodyweightData[0]?.weight_kg;
  const workoutsWeek = recentWorkouts.filter(w => (Date.now() - new Date(w.started_at).getTime()) < 7 * 86400000).length;
  const totalVolumeWeek = weeklyVolume.reduce((acc, w) => acc + (w.total_volume_kg || 0), 0);
  const fatigue = detectFatigue(workoutsWeek, recentWorkouts.slice(0, 4).map(w => w.total_volume_kg));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header — solo desktop, en mobile lo pone el MobileHeader */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">
            {greeting()}, {profile?.full_name?.split(' ')[0] || 'Atleta'} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Link href="/workout" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo entrenamiento
        </Link>
      </div>

      {/* Mobile greeting */}
      <div className="lg:hidden">
        <p className="text-text-primary font-semibold">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'Atleta'} 👋
        </p>
        <p className="text-xs text-text-muted mt-0.5 capitalize">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Fatigue */}
      {fatigue.level !== 'low' && (
        <FatigueIndicator level={fatigue.level} message={fatigue.message} />
      )}

      {/* Stats — scroll horizontal en mobile */}
      <StatsRow
        workoutsWeek={workoutsWeek}
        streak={streak}
        volumeWeek={totalVolumeWeek}
        currentWeight={currentWeight}
        calories={totals.calories}
        targetCalories={profile?.target_calories || 2500}
        protein={totals.protein_g}
        targetProtein={profile?.target_protein_g || 150}
      />

      {/* CTA mobile: iniciar entrenamiento */}
      <div className="lg:hidden">
        <Link href="/workout" className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base">
          <Plus className="w-5 h-5" />
          Iniciar entrenamiento
        </Link>
      </div>

      {/* Charts row — desktop 2+1, mobile stack */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <VolumeChart data={weeklyVolume} loading={loading} />
        </div>
        <div>
          <NutritionSummary
            calories={totals.calories}
            protein={totals.protein_g}
            carbs={totals.carbs_g}
            fat={totals.fat_g}
            targetCalories={profile?.target_calories || 2500}
            targetProtein={profile?.target_protein_g || 150}
          />
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentWorkouts workouts={recentWorkouts.slice(0, 5)} loading={loading} />
        </div>
        <div>
          <AttendanceCalendar dates={attendanceDates} />
        </div>
      </div>

      {/* PRs + weight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PRCards prs={prs} loading={loading} />
        </div>
        <div>
          <BodyweightChart data={bodyweightData} userId={user?.id || ''} />
        </div>
      </div>
    </div>
  );
}
