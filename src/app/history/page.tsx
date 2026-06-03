'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getWorkoutHistory } from '@/services/workout.service';
import type { Workout } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, TrendingUp, Dumbbell, ChevronDown, Calendar } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';

export default function HistoryPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await getWorkoutHistory(user!.id, 50);
    setWorkouts(data || []);
    setLoading(false);
  }

  const grouped = workouts.reduce((acc: Record<string, Workout[]>, w) => {
    const month = format(parseISO(w.started_at), 'MMMM yyyy', { locale: es });
    if (!acc[month]) acc[month] = [];
    acc[month].push(w);
    return acc;
  }, {});

  const totalVolume = workouts.reduce((acc, w) => acc + w.total_volume_kg, 0);
  const avgDuration = workouts.filter(w => w.duration_minutes).reduce((acc, w, _, arr) => acc + (w.duration_minutes || 0) / arr.length, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Desktop title */}
      <div className="hidden lg:block">
        <h1 className="font-display font-bold text-2xl text-text-primary">Historial</h1>
        <p className="text-sm text-text-secondary mt-0.5">{workouts.length} entrenamientos registrados</p>
      </div>

      {/* Summary pills — horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[
          { label: 'Sesiones', value: workouts.length, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
          { label: 'Volumen total', value: `${(totalVolume / 1000).toFixed(0)}t`, color: 'text-accent-green', bg: 'bg-accent-green/10' },
          { label: 'Duración prom.', value: formatDuration(Math.round(avgDuration)), color: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
        ].map(s => (
          <div key={s.label} className={`card shrink-0 flex-1 min-w-[100px] text-center py-3 px-3`}>
            <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Workout list */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}</div>
      ) : workouts.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">Sin entrenamientos todavía</p>
          <Link href="/workout" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            <Dumbbell className="w-4 h-4" /> Empezar
          </Link>
        </div>
      ) : (
        Object.entries(grouped).map(([month, monthWorkouts]) => (
          <div key={month}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className="font-display font-semibold text-sm text-text-secondary capitalize">{month}</h3>
              <span className="text-xs text-text-muted">({monthWorkouts.length})</span>
            </div>
            <div className="space-y-2">
              {monthWorkouts.map(w => (
                <div key={w.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                    className="w-full card text-left flex items-center gap-3 py-3.5 hover:border-border-default transition-all active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 bg-accent-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Dumbbell className="w-4.5 h-4.5 text-accent-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate">{w.name}</p>
                      <p className="text-xs text-text-muted capitalize">
                        {format(parseISO(w.started_at), "EEE d MMM", { locale: es })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {(w.total_volume_kg / 1000).toFixed(1)}t
                      </span>
                      {w.duration_minutes && (
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(w.duration_minutes)}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${expandedId === w.id ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedId === w.id && (
                    <div className="mt-1 ml-3 pl-3 border-l-2 border-border-subtle space-y-2 animate-slide-up pb-2">
                      {((w as any).workout_exercises || []).map((we: any) => (
                        <div key={we.id} className="bg-bg-elevated rounded-xl p-3">
                          <p className="text-sm font-semibold text-text-primary mb-2">{we.exercise?.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(we.workout_sets || []).map((s: any, i: number) => (
                              <span key={i} className="text-[11px] bg-bg-base border border-border-subtle px-2 py-1 rounded-lg text-text-secondary font-mono">
                                {s.weight_kg}kg×{s.reps}{s.rir != null ? ` R${s.rir}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
