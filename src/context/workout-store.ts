'use client';

import { create } from 'zustand';
import { ActiveWorkout, ActiveWorkoutExercise, ActiveWorkoutSet, Exercise } from '@/types';

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null;
  timerSeconds: number;
  isTimerRunning: boolean;
  restTimerTarget: number;

  // Actions
  startWorkout: (name: string) => void;
  endWorkout: () => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseIndex: number, set: Omit<ActiveWorkoutSet, 'id'>) => void;
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ActiveWorkoutSet>) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;

  // Timer
  startRestTimer: (seconds: number) => void;
  stopTimer: () => void;
  tickTimer: () => void;
}

let timerInterval: NodeJS.Timeout | null = null;

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,
  timerSeconds: 0,
  isTimerRunning: false,
  restTimerTarget: 90,

  startWorkout: (name) => {
    set({
      activeWorkout: {
        name,
        started_at: new Date().toISOString(),
        exercises: [],
      },
    });
  },

  endWorkout: () => {
    if (timerInterval) clearInterval(timerInterval);
    set({ activeWorkout: null, isTimerRunning: false, timerSeconds: 0 });
  },

  addExercise: (exercise) => {
    const state = get();
    if (!state.activeWorkout) return;
    const newExercise: ActiveWorkoutExercise = {
      exercise,
      sets: [
        {
          id: crypto.randomUUID(),
          set_number: 1,
          weight_kg: 0,
          reps: 0,
          completed: false,
          is_warmup: false,
        },
      ],
    };
    set({
      activeWorkout: {
        ...state.activeWorkout,
        exercises: [...state.activeWorkout.exercises, newExercise],
      },
    });
  },

  removeExercise: (exerciseId) => {
    const state = get();
    if (!state.activeWorkout) return;
    set({
      activeWorkout: {
        ...state.activeWorkout,
        exercises: state.activeWorkout.exercises.filter(
          (e) => e.exercise.id !== exerciseId
        ),
      },
    });
  },

  addSet: (exerciseIndex, setData) => {
    const state = get();
    if (!state.activeWorkout) return;
    const exercises = [...state.activeWorkout.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const newSet: ActiveWorkoutSet = {
      ...setData,
      id: crypto.randomUUID(),
    };
    exercise.sets = [...exercise.sets, newSet];
    exercises[exerciseIndex] = exercise;
    set({ activeWorkout: { ...state.activeWorkout, exercises } });
  },

  updateSet: (exerciseIndex, setIndex, updates) => {
    const state = get();
    if (!state.activeWorkout) return;
    const exercises = [...state.activeWorkout.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], ...updates };
    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;
    set({ activeWorkout: { ...state.activeWorkout, exercises } });
  },

  removeSet: (exerciseIndex, setIndex) => {
    const state = get();
    if (!state.activeWorkout) return;
    const exercises = [...state.activeWorkout.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
    exercises[exerciseIndex] = exercise;
    set({ activeWorkout: { ...state.activeWorkout, exercises } });
  },

  completeSet: (exerciseIndex, setIndex) => {
    const state = get();
    get().updateSet(exerciseIndex, setIndex, { completed: true });
    get().startRestTimer(state.restTimerTarget);
  },

  startRestTimer: (seconds) => {
    if (timerInterval) clearInterval(timerInterval);
    set({ timerSeconds: seconds, isTimerRunning: true, restTimerTarget: seconds });
    timerInterval = setInterval(() => {
      const current = get().timerSeconds;
      if (current <= 1) {
        clearInterval(timerInterval!);
        set({ timerSeconds: 0, isTimerRunning: false });
      } else {
        set({ timerSeconds: current - 1 });
      }
    }, 1000);
  },

  stopTimer: () => {
    if (timerInterval) clearInterval(timerInterval);
    set({ isTimerRunning: false, timerSeconds: 0 });
  },

  tickTimer: () => {},
}));
