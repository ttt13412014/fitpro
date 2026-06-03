'use client';

import { useWorkoutStore } from '@/context/workout-store';
import type { ActiveWorkoutExercise, ActiveWorkoutSet } from '@/types';
import { Plus, Trash2, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  exercise: ActiveWorkoutExercise;
  exerciseIndex: number;
}

export function ActiveExerciseCard({ exercise, exerciseIndex }: Props) {
  const { addSet, updateSet, removeSet, completeSet, removeExercise } = useWorkoutStore();
  const [collapsed, setCollapsed] = useState(false);

  function handleAddSet() {
    const last = exercise.sets[exercise.sets.length - 1];
    addSet(exerciseIndex, {
      set_number: exercise.sets.length + 1,
      weight_kg: last?.weight_kg || 0,
      reps: last?.reps || 0,
      completed: false,
      is_warmup: false,
    });
  }

  const completedCount = exercise.sets.filter(s => s.completed).length;

  return (
    <div className="card animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 bg-accent-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-accent-primary text-xs font-bold">{exerciseIndex + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-text-primary truncate">{exercise.exercise.name}</p>
          <p className="text-[10px] text-text-muted capitalize">{exercise.exercise.muscle_primary} · {exercise.exercise.equipment}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Progress pill */}
          {completedCount > 0 && (
            <span className="text-[10px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full">
              {completedCount}/{exercise.sets.length}
            </span>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 text-text-muted hover:text-text-primary">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button onClick={() => removeExercise(exercise.exercise.id)} className="p-1.5 text-text-muted hover:text-accent-red">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-1.5 mb-1.5 px-1">
            <div className="col-span-1 text-[10px] text-text-muted text-center">#</div>
            <div className="col-span-4 text-[10px] text-text-muted text-center">Kg</div>
            <div className="col-span-4 text-[10px] text-text-muted text-center">Reps</div>
            <div className="col-span-2 text-[10px] text-text-muted text-center">RIR</div>
            <div className="col-span-1" />
          </div>

          {/* Sets */}
          <div className="space-y-2">
            {exercise.sets.map((set, i) => (
              <SetRow
                key={set.id}
                set={set}
                onComplete={() => completeSet(exerciseIndex, i)}
                onUpdate={u => updateSet(exerciseIndex, i, u)}
                onRemove={() => removeSet(exerciseIndex, i)}
              />
            ))}
          </div>

          <button
            onClick={handleAddSet}
            className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-border-default hover:border-accent-primary text-text-muted hover:text-accent-primary text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Serie
          </button>
        </>
      )}
    </div>
  );
}

interface SetRowProps {
  set: ActiveWorkoutSet;
  onComplete: () => void;
  onUpdate: (u: Partial<ActiveWorkoutSet>) => void;
  onRemove: () => void;
}

function SetRow({ set, onComplete, onUpdate, onRemove }: SetRowProps) {
  return (
    <div className={cn(
      'grid grid-cols-12 gap-1.5 items-center px-1 py-1 rounded-xl transition-all',
      set.completed ? 'bg-accent-green/5' : ''
    )}>
      <div className="col-span-1 text-center">
        <span className="text-xs font-mono font-bold text-text-muted">{set.set_number}</span>
      </div>

      {/* Weight input — touch-friendly */}
      <div className="col-span-4">
        <input
          type="number"
          inputMode="decimal"
          value={set.weight_kg || ''}
          onChange={e => onUpdate({ weight_kg: parseFloat(e.target.value) || 0 })}
          className={cn(
            'w-full text-center text-sm font-mono py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors',
            set.completed
              ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
              : 'bg-bg-elevated border-border-subtle text-text-primary'
          )}
          placeholder="0"
          step="0.5"
        />
      </div>

      {/* Reps input */}
      <div className="col-span-4">
        <input
          type="number"
          inputMode="numeric"
          value={set.reps || ''}
          onChange={e => onUpdate({ reps: parseInt(e.target.value) || 0 })}
          className={cn(
            'w-full text-center text-sm font-mono py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors',
            set.completed
              ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
              : 'bg-bg-elevated border-border-subtle text-text-primary'
          )}
          placeholder="0"
        />
      </div>

      {/* RIR input */}
      <div className="col-span-2">
        <input
          type="number"
          inputMode="numeric"
          value={set.rir ?? ''}
          onChange={e => onUpdate({ rir: parseInt(e.target.value) })}
          className="w-full text-center text-sm font-mono py-2 rounded-lg border bg-bg-elevated border-border-subtle text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          placeholder="—"
          min="0" max="5"
        />
      </div>

      {/* Complete button */}
      <div className="col-span-1 flex justify-center">
        {!set.completed ? (
          <button
            onClick={onComplete}
            disabled={!set.weight_kg || !set.reps}
            className="w-8 h-8 rounded-xl bg-bg-elevated border border-border-subtle hover:border-accent-green hover:bg-accent-green/10 hover:text-accent-green text-text-muted transition-all disabled:opacity-30 flex items-center justify-center active:scale-90"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-accent-green/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-accent-green" />
          </div>
        )}
      </div>
    </div>
  );
}
