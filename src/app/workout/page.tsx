'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useWorkoutStore } from '@/context/workout-store';
import { getSupabaseClient } from '@/lib/supabase';
import { saveWorkout } from '@/services/workout.service';
import type { Exercise, Routine } from '@/types';
import { ExerciseSelector } from '@/components/workout/ExerciseSelector';
import { ActiveExerciseCard } from '@/components/workout/ActiveExerciseCard';
import { RestTimer } from '@/components/workout/RestTimer';
import { Plus, Check, X, Dumbbell, Clock, TrendingUp, ChevronDown, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDuration } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function WorkoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { activeWorkout, startWorkout, endWorkout, addExercise, timerSeconds, isTimerRunning } = useWorkoutStore();
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showRoutineSelector, setShowRoutineSelector] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeWorkout.started_at).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  useEffect(() => { if (user) loadRoutines(); }, [user]);

  async function loadRoutines() {
    const { data } = await supabase
      .from('routines')
      .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
      .eq('user_id', user!.id)
      .order('is_active', { ascending: false });
    setRoutines(data || []);
  }

  async function handleFinishWorkout() {
    if (!activeWorkout || !user) return;
    if (activeWorkout.exercises.length === 0) { toast.error('Agregá al menos un ejercicio'); return; }
    setSaving(true);
    const { error } = await saveWorkout(user.id, activeWorkout);
    if (error) { toast.error('Error al guardar'); } 
    else { toast.success('🎉 ¡Entrenamiento guardado!'); endWorkout(); router.push('/dashboard'); }
    setSaving(false);
  }

  const totalVolume = activeWorkout?.exercises.reduce((acc, ex) =>
    acc + ex.sets.filter(s => s.completed).reduce((a, s) => a + s.weight_kg * s.reps, 0), 0) || 0;

  // ── START SCREEN ──
  if (!activeWorkout) {
    return (
      <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
        {/* Desktop title */}
        <div className="hidden lg:block">
          <h1 className="font-display font-bold text-2xl text-text-primary">Entrenar</h1>
          <p className="text-sm text-text-secondary mt-1">Empezá una sesión nueva</p>
        </div>

        {/* Quick start */}
        <div className="card">
          <h2 className="section-title mb-3">Inicio rápido</h2>
          <input
            type="text"
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            className="input mb-3"
            placeholder="Nombre (ej: Push A, Piernas...)"
          />
          <button
            onClick={() => startWorkout(workoutName || `Entreno ${new Date().toLocaleDateString('es-AR')}`)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-base font-semibold">Empezar entrenamiento</span>
          </button>
        </div>

        {/* From routine */}
        <div className="card">
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setShowRoutineSelector(!showRoutineSelector)}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-accent-primary" />
              <span className="font-semibold text-sm">Empezar desde rutina</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showRoutineSelector ? 'rotate-180' : ''}`} />
          </button>

          {showRoutineSelector && (
            <div className="mt-4 space-y-3 animate-slide-up">
              {routines.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-3">
                  No tenés rutinas. <a href="/routines" className="text-accent-primary">Crear →</a>
                </p>
              ) : (
                routines.map(routine => (
                  <div key={routine.id} className="bg-bg-elevated rounded-xl p-3 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-sm text-text-primary">{routine.name}</p>
                      {routine.is_active && <span className="badge-green text-[10px]">Activa</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(routine.routine_days || []).map((day: any) => (
                        <button
                          key={day.id}
                          onClick={() => {
                            startWorkout(day.day_name);
                            (day.routine_exercises || []).forEach((re: any) => { if (re.exercise) addExercise(re.exercise); });
                          }}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          {day.day_name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ACTIVE WORKOUT ──
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Sticky workout header */}
      <div className="card sticky top-0 lg:top-4 z-30 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-3">
            <p className="font-display font-bold text-base text-text-primary truncate">{activeWorkout.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="w-3 h-3" />
                <span className="font-mono">{formatDuration(Math.floor(elapsed / 60))}</span>
              </span>
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <TrendingUp className="w-3 h-3" />
                {(totalVolume / 1000).toFixed(2)}t
              </span>
              {isTimerRunning && (
                <span className="text-xs text-accent-green font-mono font-bold">⏱ {timerSeconds}s</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { if (confirm('¿Descartar el entrenamiento?')) endWorkout(); }}
              className="p-2 text-text-muted hover:text-accent-red transition-colors rounded-xl hover:bg-accent-red/10"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleFinishWorkout}
              disabled={saving}
              className="btn-primary text-sm py-2 px-3 flex items-center gap-1.5 bg-accent-green"
            >
              <Check className="w-4 h-4" />
              {saving ? '...' : 'Finalizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Rest timer */}
      {isTimerRunning && <RestTimer />}

      {/* Exercise cards */}
      {activeWorkout.exercises.map((ex, index) => (
        <ActiveExerciseCard key={`${ex.exercise.id}-${index}`} exercise={ex} exerciseIndex={index} />
      ))}

      {/* Add exercise button */}
      <button
        onClick={() => setShowExerciseSelector(true)}
        className="w-full border-2 border-dashed border-border-default hover:border-accent-primary rounded-2xl py-5 flex items-center justify-center gap-2 text-text-muted hover:text-accent-primary transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-medium">Agregar ejercicio</span>
      </button>

      {showExerciseSelector && (
        <ExerciseSelector
          onSelect={ex => { addExercise(ex); setShowExerciseSelector(false); }}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}
    </div>
  );
}
