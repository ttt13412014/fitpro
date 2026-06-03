import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calcular 1RM estimado (fórmula Epley)
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Calcular volumen total de sets
export function calculateVolume(sets: { weight_kg: number; reps: number }[]): number {
  return sets.reduce((acc, set) => acc + set.weight_kg * set.reps, 0);
}

// Formatear peso
export function formatWeight(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
  if (unit === 'lb') {
    return `${(kg * 2.205).toFixed(1)} lb`;
  }
  return `${kg} kg`;
}

// Formatear duración en minutos
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Calcular diferencia de días
export function daysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// Obtener racha actual de asistencia
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = daysDiff(sorted[i - 1], sorted[i]);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Lógica de progresión
export function evaluateProgression(
  recentSets: { weight_kg: number; reps: number; rir?: number; reps_target_max: number }[]
): 'increase' | 'maintain' | 'decrease' {
  if (recentSets.length === 0) return 'maintain';

  const allSetsHitTop = recentSets.every(s => s.reps >= s.reps_target_max);
  const avgRIR = recentSets.reduce((acc, s) => acc + (s.rir ?? 2), 0) / recentSets.length;
  const failedSets = recentSets.filter(s => s.reps < s.reps_target_max * 0.7).length;

  if (allSetsHitTop && avgRIR >= 2) return 'increase';
  if (failedSets >= 2) return 'decrease';
  return 'maintain';
}

// Detectar fatiga
export function detectFatigue(
  workoutsLast7Days: number,
  volumeTrend: number[], // últimas 4 semanas
): { level: 'low' | 'moderate' | 'high'; message: string } {
  if (workoutsLast7Days >= 6) {
    return { level: 'high', message: 'Demasiados días entrenados. Considera un deload.' };
  }
  if (volumeTrend.length >= 2) {
    const recent = volumeTrend[volumeTrend.length - 1];
    const prev = volumeTrend[volumeTrend.length - 2];
    if (recent < prev * 0.8) {
      return { level: 'moderate', message: 'Caída de volumen detectada. Revisa tu descanso.' };
    }
  }
  return { level: 'low', message: 'Rendimiento estable. ¡Seguí así!' };
}

// Parsear número de peso
export function parseWeight(str: string): number {
  return parseFloat(str.replace(',', '.')) || 0;
}

// Obtener semanas del año
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
