'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { Exercise } from '@/types';
import { Search, X, Dumbbell } from 'lucide-react';

interface Props {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

const MUSCLE_GROUPS = ['Todos', 'pecho', 'espalda', 'hombros', 'bíceps', 'tríceps', 'cuádriceps', 'isquiotibiales', 'glúteos'];

export function ExerciseSelector({ onSelect, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => { loadExercises(); }, []);

  useEffect(() => {
    let r = exercises;
    if (query) r = r.filter(e => e.name.toLowerCase().includes(query.toLowerCase()));
    if (muscleFilter !== 'Todos') r = r.filter(e => e.muscle_primary.toLowerCase().includes(muscleFilter));
    setFiltered(r);
  }, [query, muscleFilter, exercises]);

  async function loadExercises() {
    const { data } = await supabase.from('exercises').select('*').order('name');
    setExercises(data || []);
    setFiltered(data || []);
    setLoading(false);
  }

  return (
    // Full-screen modal en mobile, centered modal en desktop
    <div className="fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center bg-black/60 backdrop-blur-sm">
      <div className="
        flex flex-col bg-bg-card w-full h-full
        lg:h-auto lg:max-h-[80vh] lg:max-w-2xl lg:rounded-3xl lg:border lg:border-border-default lg:shadow-card
        animate-slide-up
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle shrink-0">
          <h2 className="font-display font-bold text-lg text-text-primary">Ejercicios</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input pl-9"
              placeholder="Buscar ejercicio..."
              autoFocus
            />
          </div>
        </div>

        {/* Muscle filter — horizontal scroll */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto shrink-0">
          {MUSCLE_GROUPS.map(m => (
            <button
              key={m}
              onClick={() => setMuscleFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                muscleFilter === m
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-elevated border border-border-subtle text-text-secondary'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Exercise list — scrollable */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Dumbbell className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">Sin resultados</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {filtered.map(exercise => (
                <button
                  key={exercise.id}
                  onClick={() => onSelect(exercise)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-elevated active:bg-bg-hover transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-accent-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{exercise.name}</p>
                    <p className="text-xs text-text-muted capitalize mt-0.5">{exercise.muscle_primary} · {exercise.equipment}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    exercise.category === 'compound'
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'bg-bg-elevated text-text-muted'
                  }`}>
                    {exercise.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
