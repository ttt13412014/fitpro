'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getSupabaseClient } from '@/lib/supabase';
import type { Exercise } from '@/types';
import { Search, Plus, Dumbbell, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const MUSCLES = ['Todos', 'cuádriceps', 'isquiotibiales', 'glúteos', 'pecho', 'espalda', 'hombros', 'bíceps', 'tríceps'];

export default function ExercisesPage() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', muscle_primary: '', equipment: 'barbell', category: 'compound', instructions: '' });
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
    setExercises(data || []); setFiltered(data || []); setLoading(false);
  }

  async function handleSelect(ex: Exercise) {
    setSelected(ex);
    const { data } = await supabase
      .from('workout_exercises')
      .select('workout:workouts(started_at), workout_sets(weight_kg, reps)')
      .eq('exercise_id', ex.id)
      .order('created_at', { ascending: false })
      .limit(15);
    const pts = (data || [])
      .filter((e: any) => e.workout && e.workout_sets?.length > 0)
      .map((e: any) => ({
        date: format(parseISO(e.workout.started_at), 'd MMM', { locale: es }),
        weight: Math.max(...e.workout_sets.map((s: any) => s.weight_kg)),
      }))
      .reverse();
    setHistory(pts);
  }

  async function handleCreate() {
    if (!newEx.name || !newEx.muscle_primary) { toast.error('Nombre y músculo requeridos'); return; }
    const { error } = await supabase.from('exercises').insert({ ...newEx, user_id: user!.id, is_custom: true, muscles_secondary: [] });
    if (error) { toast.error('Error'); return; }
    toast.success('Ejercicio creado'); setShowAddForm(false);
    setNewEx({ name: '', muscle_primary: '', equipment: 'barbell', category: 'compound', instructions: '' });
    loadExercises();
  }

  const catColor: Record<string, string> = {
    compound: 'bg-accent-primary/10 text-accent-primary',
    isolation: 'bg-accent-yellow/10 text-accent-yellow',
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Desktop title */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Ejercicios</h1>
          <p className="text-sm text-text-secondary mt-0.5">{exercises.length} disponibles</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* Search + add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input className="input pl-9" placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-secondary px-3 flex items-center lg:hidden">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Muscle filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MUSCLES.map(m => (
          <button key={m} onClick={() => setMuscleFilter(m)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${muscleFilter === m ? 'bg-accent-primary text-white' : 'bg-bg-elevated border border-border-subtle text-text-secondary'}`}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(ex => (
            <button key={ex.id} onClick={() => handleSelect(ex)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${selected?.id === ex.id ? 'border-accent-primary bg-accent-primary/5' : 'card hover:border-border-default'}`}>
              <div className="w-10 h-10 bg-accent-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Dumbbell className="w-4 h-4 text-accent-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{ex.name}</p>
                <p className="text-xs text-text-muted capitalize">{ex.muscle_primary}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catColor[ex.category] || 'bg-bg-elevated text-text-muted'}`}>
                  {ex.category}
                </span>
                {ex.is_custom && <span className="text-[10px] text-accent-yellow">Custom</span>}
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Exercise detail — bottom sheet on mobile */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full lg:max-w-lg bg-bg-card rounded-t-3xl lg:rounded-3xl border border-border-default p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="w-10 h-1 bg-border-default rounded-full mx-auto mb-4 lg:hidden" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-xl text-text-primary">{selected.name}</h3>
                <p className="text-sm text-text-muted capitalize mt-0.5">{selected.muscle_primary} · {selected.equipment}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selected.muscles_secondary?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2">Músculos secundarios</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.muscles_secondary.map(m => (
                    <span key={m} className="text-xs px-2.5 py-1 bg-bg-elevated border border-border-subtle rounded-full capitalize">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.instructions && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2">Instrucciones</p>
                <p className="text-sm text-text-secondary leading-relaxed bg-bg-elevated rounded-xl p-3">{selected.instructions}</p>
              </div>
            )}

            {history.length > 1 && (
              <div>
                <p className="text-xs text-text-muted mb-3">Progresión de peso</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                    <XAxis dataKey="date" tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#16161f', border: '1px solid #2a2a3e', borderRadius: '8px', fontSize: 11 }} formatter={(v: any) => [`${v}kg`, 'Peso']} />
                    <Line type="monotone" dataKey="weight" stroke="#6c63ff" strokeWidth={2.5} dot={{ fill: '#6c63ff', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add form — bottom sheet */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
          <div className="w-full lg:max-w-md bg-bg-card rounded-t-3xl lg:rounded-3xl border border-border-default p-5 animate-slide-up">
            <div className="w-10 h-1 bg-border-default rounded-full mx-auto mb-4 lg:hidden" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Nuevo ejercicio</h3>
              <button onClick={() => setShowAddForm(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="label">Nombre *</label><input className="input" value={newEx.name} onChange={e => setNewEx({ ...newEx, name: e.target.value })} placeholder="Nombre del ejercicio" /></div>
              <div><label className="label">Músculo principal *</label><input className="input" value={newEx.muscle_primary} onChange={e => setNewEx({ ...newEx, muscle_primary: e.target.value })} placeholder="ej: cuádriceps" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Equipamiento</label>
                  <select className="input" value={newEx.equipment} onChange={e => setNewEx({ ...newEx, equipment: e.target.value })}>
                    {['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'].map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" value={newEx.category} onChange={e => setNewEx({ ...newEx, category: e.target.value })}>
                    {['compound', 'isolation', 'cardio', 'mobility'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Instrucciones</label><textarea className="input resize-none h-20" value={newEx.instructions} onChange={e => setNewEx({ ...newEx, instructions: e.target.value })} placeholder="Cómo realizar..." /></div>
            </div>
            <button onClick={handleCreate} className="btn-primary w-full mt-4 py-3.5">Crear ejercicio</button>
          </div>
        </div>
      )}
    </div>
  );
}
