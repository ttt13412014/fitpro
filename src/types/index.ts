// =============================================
// FitPro - Types completos
// =============================================

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  height_cm?: number;
  birth_date?: string;
  goal?: 'muscle_gain' | 'fat_loss' | 'maintenance' | 'strength' | 'endurance';
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  rest_timer_default_seconds: number;
  weight_unit: 'kg' | 'lb';
  created_at: string;
  updated_at: string;
}

export interface BodyweightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  notes?: string;
  recorded_at: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  user_id?: string;
  name: string;
  muscle_primary: string;
  muscles_secondary: string[];
  category: 'compound' | 'isolation' | 'cardio' | 'mobility' | 'other';
  equipment: string;
  instructions?: string;
  image_url?: string;
  gif_url?: string;
  is_custom: boolean;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  type?: 'PPL' | 'Upper/Lower' | 'Full Body' | 'Bro Split' | 'Custom';
  description?: string;
  days_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  routine_days?: RoutineDay[];
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  day_name: string;
  day_order: number;
  created_at: string;
  // Relations
  routine_exercises?: RoutineExercise[];
}

export interface RoutineExercise {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rir_target: number;
  rest_seconds: number;
  exercise_order: number;
  notes?: string;
  created_at: string;
  // Relations
  exercise?: Exercise;
}

export interface Workout {
  id: string;
  user_id: string;
  routine_day_id?: string;
  name: string;
  notes?: string;
  started_at: string;
  finished_at?: string;
  duration_minutes?: number;
  total_volume_kg: number;
  created_at: string;
  // Relations
  workout_exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_order: number;
  notes?: string;
  created_at: string;
  // Relations
  exercise?: Exercise;
  workout_sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir?: number;
  is_warmup: boolean;
  is_dropset: boolean;
  is_failure: boolean;
  rpe?: number;
  notes?: string;
  completed_at: string;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  workout_set_id?: string;
  pr_type: '1rm' | 'max_weight' | 'max_reps' | 'max_volume';
  value: number;
  previous_value?: number;
  achieved_at: string;
  created_at: string;
  // Relations
  exercise?: Exercise;
}

export interface Attendance {
  id: string;
  user_id: string;
  workout_id?: string;
  trained_date: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  meal_name: string;
  meal_time?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
  logged_date: string;
  created_at: string;
}

export interface FoodItem {
  id: string;
  user_id?: string;
  name: string;
  brand?: string;
  serving_size_g: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  barcode?: string;
  is_custom: boolean;
}

export interface ProgressionSuggestion {
  id: string;
  user_id: string;
  exercise_id: string;
  suggestion: 'increase' | 'maintain' | 'decrease';
  reason: string;
  suggested_weight_kg?: number;
  is_dismissed: boolean;
  created_at: string;
  // Relations
  exercise?: Exercise;
}

// =============================================
// UI State Types
// =============================================

export interface ActiveWorkoutSet {
  id: string; // temp ID
  set_number: number;
  weight_kg: number;
  reps: number;
  rir?: number;
  completed: boolean;
  is_warmup: boolean;
}

export interface ActiveWorkoutExercise {
  exercise: Exercise;
  sets: ActiveWorkoutSet[];
  notes?: string;
}

export interface ActiveWorkout {
  name: string;
  started_at: string;
  exercises: ActiveWorkoutExercise[];
}

// =============================================
// Dashboard/Stats Types
// =============================================

export interface WeeklyStats {
  workouts: number;
  volume_kg: number;
  attendance_rate: number;
  calories_avg: number;
  protein_avg: number;
}

export interface VolumeChartData {
  date: string;
  volume: number;
  label: string;
}

export interface StrengthChartData {
  date: string;
  weight: number;
  exercise: string;
}

export interface NutritionChartData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AttendanceHeatmapData {
  date: string;
  trained: boolean;
}

// =============================================
// Coach/AI Types
// =============================================

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface CoachContext {
  recentWorkouts: Workout[];
  todayNutrition: NutritionLog[];
  currentWeight?: number;
  weeklyStats: WeeklyStats;
  progressionSuggestions: ProgressionSuggestion[];
  profile: Profile;
}

// =============================================
// Import Types
// =============================================

export interface ImportedExercise {
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  notes?: string;
}

export interface ImportedNutrition {
  meal_name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}
