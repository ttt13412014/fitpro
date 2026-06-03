'use client';

import { formatDuration } from '@/lib/utils';
import type { Workout } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dumbbell, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Props {
  workouts: Workout[];
  loading?: boolean;
}

export function RecentWorkouts({ workouts, loading }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">Entrenamientos recientes</h3>
          <p className="text-xs text-text-muted mt-0.5">Últimas sesiones</p>
        </div>
        <Link href="/history" className="text-xs text-accent-primary hover:underline">
          Ver todo →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-8">
          <Dumbbell className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">Sin entrenamientos registrados</p>
          <Link href="/workout" className="btn-primary mt-3 inline-flex items-center gap-2 text-xs">
            Empezar ahora
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <Link
              key={w.id}
              href={`/history/${w.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-elevated transition-colors group"
            >
              <div className="w-9 h-9 bg-accent-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Dumbbell className="w-4 h-4 text-accent-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{w.name}</p>
                <p className="text-xs text-text-muted capitalize">
                  {format(parseISO(w.started_at), "EEEE d 'de' MMM", { locale: es })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <TrendingUp className="w-3 h-3" />
                  {(w.total_volume_kg / 1000).toFixed(1)}t
                </div>
                {w.duration_minutes && (
                  <div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDuration(w.duration_minutes)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
