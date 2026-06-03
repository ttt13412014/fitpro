'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getSupabaseClient } from '@/lib/supabase';
import type { Routine, Exercise } from '@/types';
import { Plus, Trash2, BookOpen, Star, ChevronDown, X, Dumbbell } from 'lucide-react';
import toast from 'react-hot-toast';
import { ExerciseSelector } from '@/components/workout/ExerciseSelector';

const ROUTINE_TYPES = ['PPL', 'Upper/Lower', 'Full Body', 'Bro Split', 'Custom'];

export default function RoutinesPage() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exSelectorDay, setExSelectorDay] = useState<string | null>(null);
  const [newRoutine, setNewRoutine] = useState({ name: '', type: 'PPL', days_per_week: 4 });
  const supabase = getSupabaseClient();

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase
      .from('routines')
      .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
      .eq('user_id', user!.id)
      .order('is_active', { ascending: false });
    setRoutines(data || []); setLoading(false);
  }

  async function create() {
    if (!newRoutine.name) { toast.error('Ingresá un nombre'); return; }
    await supabase.from('routines').insert({ ...newRoutine, user_id: user!.id });
    toast.success('Rutina creada'); setShowCreate(false);
    setNewRoutine({ name: '', type: 'PPL', days_per_week: 4 }); load();
  }

  async function deleteRoutine(id: string) {
    if (!confirm('¿Eliminar rutina?')) return;
    await supabase.from('routines').delete().eq('id', id);
    toast.success('Eliminada'); load();
  }

  async function setActive(id: string) {
    await supabase.from('routines').update({ is_active: false }).eq('user_id', user!.id);
    await supabase.from('routines').update({ is_active: true }).eq('id', id);
    toast.success('Rutina activada'); load();
  }

  async function addDay(routineId: string, name: string) {
    const r = routines.find(r => r.id === routineId);
    await supabase.from('routine_days').insert({ routine_id: routineId, day_name: name, day_order: (r?.routine_days?.length || 0) + 1 });
    load();
  }

  async function addExToDay(dayId: string, ex: Exercise) {
    const day = routines.flatMap(r => r.routine_days || []).find(d => d.id === dayId);
    await supabase.from('routine_exercises').insert({
      routine_day_id: dayId, exercise_id: ex.id,
      sets_target: 3, reps_min: 8, reps_max: 12, rir_target: 2, rest_seconds: 90,
      exercise_order: (day?.routine_exercises?.length || 0) + 1,
    });
    setExSelectorDay(null); load();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="hidden lg:block">
          <h1 className="font-display font-bold text-2xl">Rutinas</h1>
          <p className="text-sm text-text-secondary mt-0.5">Tus programas de entrenamiento</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 lg:ml-auto">
          <Plus className="w-4 h-4" /> Nueva rutina
        </button>
      </div>

      {/* Create form — bottom sheet */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="w-full lg:max-w-md bg-bg-card rounded-t-3xl lg:rounded-3xl border border-border-default p-5 animate-slide-up">
            <div className="w-10 h-1 bg-border-default rounded-full mx-auto mb-4 lg:hidden" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Nueva rutina</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="label">Nombre *</label><input className="input" placeholder="Mi rutina PPL" value={newRoutine.name} onChange={e => setNewRoutine({ ...newRoutine, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={newRoutine.type} onChange={e => setNewRoutine({ ...newRoutine, type: e.target.value })}>
                    {ROUTINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Días/semana</label>
                  <input type="number" inputMode="numeric" className="input" min={1} max={7} value={newRoutine.days_per_week} onChange={e => setNewRoutine({ ...newRoutine, days_per_week: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
            <button onClick={create} className="btn-primary w-full mt-4 py-3.5">Crear rutina</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
      ) : routines.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">Sin rutinas. ¡Creá la primera!</p>
        </div>
      ) : (
        routines.map(routine => (
          <div key={routine.id} className="card">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${routine.is_active ? 'bg-accent-green/10' : 'bg-accent-primary/10'}`}>
                <BookOpen className={`w-4.5 h-4.5 ${routine.is_active ? 'text-accent-green' : 'text-accent-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display font-bold text-sm text-text-primary">{routine.name}</p>
                  {routine.is_active && <span className="badge-green text-[10px]">Activa</span>}
                </div>
                <p className="text-xs text-text-muted">{routine.type} · {routine.days_per_week} días</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!routine.is_active && (
                  <button onClick={() => setActive(routine.id)} className="p-2 text-text-muted hover:text-accent-yellow transition-colors">
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setExpanded(expanded === routine.id ? null : routine.id)} className="p-2 text-text-muted hover:text-text-primary">
                  <ChevronDown className={`w-4 h-4 transition-transform ${expanded === routine.id ? 'rotate-180' : ''}`} />
                </button>
                <button onClick={() => deleteRoutine(routine.id)} className="p-2 text-text-muted hover:text-accent-red">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expanded === routine.id && (
              <div className="mt-4 space-y-3 animate-slide-up">
                {(routine.routine_days || []).map((day: any) => (
                  <div key={day.id} className="bg-bg-elevated rounded-xl p-3 border border-border-subtle">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{day.day_name}</p>
                      <div className="flex gap-1">
                        <button onClick={() => setExSelectorDay(day.id)} className="p-1.5 text-accent-primary hover:bg-accent-primary/10 rounded-lg">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { await supabase.from('routine_days').delete().eq('id', day.id); load(); }} className="p-1.5 text-text-muted hover:text-accent-red">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {(day.routine_exercises || []).length === 0 ? (
                      <button onClick={() => setExSelectorDay(day.id)} className="w-full border border-dashed border-border-default rounded-xl py-3 text-xs text-text-muted hover:text-accent-primary hover:border-accent-primary transition-colors flex items-center justify-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Agregar ejercicio
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        {(day.routine_exercises || []).map((re: any) => (
                          <div key={re.id} className="flex items-center gap-2 group">
                            <Dumbbell className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span className="text-xs font-medium flex-1 truncate">{re.exercise?.name}</span>
                            <span className="text-[10px] text-text-muted font-mono">{re.sets_target}×{re.reps_min}-{re.reps_max}</span>
                            <button onClick={async () => { await supabase.from('routine_exercises').delete().eq('id', re.id); load(); }} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setExSelectorDay(day.id)} className="text-xs text-accent-primary flex items-center gap-1 mt-1">
                          <Plus className="w-3 h-3" /> Más
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add day */}
                <AddDay onAdd={name => addDay(routine.id, name)} />
              </div>
            )}
          </div>
        ))
      )}

      {exSelectorDay && (
        <ExerciseSelector
          onSelect={ex => addExToDay(exSelectorDay, ex)}
          onClose={() => setExSelectorDay(null)}
        />
      )}
    </div>
  );
}

function AddDay({ onAdd }: { onAdd: (n: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="flex gap-2">
      <input className="input flex-1 text-sm" placeholder="Nombre del día (ej: Push A)" value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); setName(''); } }}
      />
      <button onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }} className="btn-secondary px-3">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
