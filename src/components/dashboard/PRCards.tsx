'use client';

import { Trophy, TrendingUp, ArrowUp } from 'lucide-react';
import type { PersonalRecord } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  prs: PersonalRecord[];
  loading?: boolean;
}

const prTypeLabel: Record<string, string> = {
  '1rm': '1RM Est.',
  max_weight: 'Peso Máx.',
  max_reps: 'Reps Máx.',
  max_volume: 'Volumen Máx.',
};

const prTypeUnit: Record<string, string> = {
  '1rm': 'kg',
  max_weight: 'kg',
  max_reps: 'reps',
  max_volume: 'kg·reps',
};

export function PRCards({ prs, loading }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">PRs Recientes</h3>
          <p className="text-xs text-text-muted mt-0.5">Últimos récords personales</p>
        </div>
        <Trophy className="w-4 h-4 text-accent-yellow" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : prs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Trophy className="w-8 h-8 text-text-muted mb-2" />
          <p className="text-sm text-text-muted">Completá entrenamientos para ver tus PRs</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {prs.map((pr) => {
            const improvement = pr.previous_value
              ? ((pr.value - pr.previous_value) / pr.previous_value) * 100
              : null;

            return (
              <div
                key={pr.id}
                className="bg-bg-elevated rounded-xl p-3 border border-border-subtle flex items-start gap-3"
              >
                <div className="w-8 h-8 bg-accent-yellow/10 rounded-xl flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-accent-yellow" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {(pr.exercise as any)?.name || 'Ejercicio'}
                  </p>
                  <p className="text-[10px] text-text-muted">{prTypeLabel[pr.pr_type]}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm font-bold text-accent-yellow">
                      {pr.pr_type === 'max_volume'
                        ? `${Math.round(pr.value)}`
                        : pr.value}
                    </span>
                    <span className="text-[10px] text-text-muted">{prTypeUnit[pr.pr_type]}</span>
                    {improvement !== null && (
                      <span className="badge-green text-[10px] px-1.5 py-0.5 ml-1">
                        <ArrowUp className="w-2.5 h-2.5" />
                        {improvement.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
