'use client';

import { useWorkoutStore } from '@/context/workout-store';
import { X, Plus, Minus } from 'lucide-react';

export function RestTimer() {
  const { timerSeconds, restTimerTarget, stopTimer, startRestTimer } = useWorkoutStore();
  const progress = restTimerTarget > 0 ? (timerSeconds / restTimerTarget) * 100 : 0;
  const circ = 2 * Math.PI * 26;

  return (
    <div className="card bg-accent-green/5 border-accent-green/20 flex items-center gap-4 py-3.5">
      {/* Circle */}
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 60 60" className="-rotate-90 w-14 h-14">
          <circle cx="30" cy="30" r="26" fill="none" stroke="#1e1e2e" strokeWidth="5" />
          <circle cx="30" cy="30" r="26" fill="none" stroke="#22d3a5" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress / 100)}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono font-bold text-base text-accent-green">{timerSeconds}</span>
        </div>
      </div>

      {/* Label */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-accent-green">Descanso</p>
        <p className="text-xs text-text-muted">{timerSeconds > 0 ? `${timerSeconds}s restantes` : '¡Listo!'}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        <button onClick={() => startRestTimer(Math.max(10, timerSeconds - 15))}
          className="w-9 h-9 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center active:scale-90 transition-all">
          <Minus className="w-3.5 h-3.5 text-text-secondary" />
        </button>
        <button onClick={() => startRestTimer(timerSeconds + 15)}
          className="w-9 h-9 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center active:scale-90 transition-all">
          <Plus className="w-3.5 h-3.5 text-text-secondary" />
        </button>
        <button onClick={stopTimer}
          className="w-9 h-9 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center active:scale-90 transition-all">
          <X className="w-3.5 h-3.5 text-accent-red" />
        </button>
      </div>
    </div>
  );
}
