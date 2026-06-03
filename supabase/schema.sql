-- =============================================
-- FitPro - Supabase Schema Completo
-- =============================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: profiles (extiende auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  height_cm NUMERIC(5,1),
  birth_date DATE,
  goal TEXT CHECK (goal IN ('muscle_gain', 'fat_loss', 'maintenance', 'strength', 'endurance')),
  -- Objetivos nutricionales diarios
  target_calories INTEGER DEFAULT 2500,
  target_protein_g INTEGER DEFAULT 150,
  target_carbs_g INTEGER DEFAULT 300,
  target_fat_g INTEGER DEFAULT 80,
  -- Preferencias
  rest_timer_default_seconds INTEGER DEFAULT 90,
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: bodyweight (historial de peso corporal)
-- =============================================
CREATE TABLE public.bodyweight (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  notes TEXT,
  recorded_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: exercises (catálogo de ejercicios)
-- =============================================
CREATE TABLE public.exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = ejercicio global
  name TEXT NOT NULL,
  muscle_primary TEXT NOT NULL,
  muscles_secondary TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('compound', 'isolation', 'cardio', 'mobility', 'other')),
  equipment TEXT DEFAULT 'barbell',
  instructions TEXT,
  image_url TEXT,
  gif_url TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: routines (plantillas de rutinas)
-- =============================================
CREATE TABLE public.routines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('PPL', 'Upper/Lower', 'Full Body', 'Bro Split', 'Custom')),
  description TEXT,
  days_per_week INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: routine_days (días de la rutina)
-- =============================================
CREATE TABLE public.routine_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  day_name TEXT NOT NULL, -- e.g. "Push A", "Piernas"
  day_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: routine_exercises (ejercicios en un día de rutina)
-- =============================================
CREATE TABLE public.routine_exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  routine_day_id UUID REFERENCES public.routine_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  sets_target INTEGER DEFAULT 3,
  reps_min INTEGER DEFAULT 8,
  reps_max INTEGER DEFAULT 12,
  rir_target INTEGER DEFAULT 2,
  rest_seconds INTEGER DEFAULT 90,
  exercise_order INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: workouts (sesiones de entrenamiento)
-- =============================================
CREATE TABLE public.workouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  routine_day_id UUID REFERENCES public.routine_days(id),
  name TEXT NOT NULL,
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  total_volume_kg NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: workout_exercises (ejercicios en una sesión)
-- =============================================
CREATE TABLE public.workout_exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  exercise_order INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: workout_sets (series individuales)
-- =============================================
CREATE TABLE public.workout_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL,
  rir INTEGER, -- Reps In Reserve
  is_warmup BOOLEAN DEFAULT FALSE,
  is_dropset BOOLEAN DEFAULT FALSE,
  is_failure BOOLEAN DEFAULT FALSE,
  rpe NUMERIC(3,1), -- Rate of Perceived Exertion
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: personal_records (PRs)
-- =============================================
CREATE TABLE public.personal_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  workout_set_id UUID REFERENCES public.workout_sets(id),
  pr_type TEXT NOT NULL CHECK (pr_type IN ('1rm', 'max_weight', 'max_reps', 'max_volume')),
  value NUMERIC(10,2) NOT NULL,
  previous_value NUMERIC(10,2),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id, pr_type)
);

-- =============================================
-- TABLA: attendance (asistencia al gym)
-- =============================================
CREATE TABLE public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES public.workouts(id),
  trained_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, trained_date)
);

-- =============================================
-- TABLA: nutrition_logs (registro nutricional)
-- =============================================
CREATE TABLE public.nutrition_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  meal_name TEXT NOT NULL,
  meal_time TEXT CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  calories INTEGER NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) DEFAULT 0,
  carbs_g NUMERIC(6,1) DEFAULT 0,
  fat_g NUMERIC(6,1) DEFAULT 0,
  notes TEXT,
  logged_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: food_items (base de datos de alimentos)
-- =============================================
CREATE TABLE public.food_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = global
  name TEXT NOT NULL,
  brand TEXT,
  serving_size_g NUMERIC(6,1) DEFAULT 100,
  calories_per_100g INTEGER NOT NULL,
  protein_per_100g NUMERIC(5,1) NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC(5,1) NOT NULL DEFAULT 0,
  fat_per_100g NUMERIC(5,1) NOT NULL DEFAULT 0,
  barcode TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: progression_suggestions (sugerencias IA)
-- =============================================
CREATE TABLE public.progression_suggestions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  suggestion TEXT NOT NULL CHECK (suggestion IN ('increase', 'maintain', 'decrease')),
  reason TEXT,
  suggested_weight_kg NUMERIC(6,2),
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, started_at DESC);
CREATE INDEX idx_workout_sets_exercise ON public.workout_sets(workout_exercise_id);
CREATE INDEX idx_nutrition_logs_user_date ON public.nutrition_logs(user_id, logged_date DESC);
CREATE INDEX idx_attendance_user_date ON public.attendance(user_id, trained_date DESC);
CREATE INDEX idx_bodyweight_user ON public.bodyweight(user_id, recorded_at DESC);
CREATE INDEX idx_prs_user_exercise ON public.personal_records(user_id, exercise_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bodyweight ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_suggestions ENABLE ROW LEVEL SECURITY;

-- Políticas: usuario solo accede a sus datos
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users manage own bodyweight" ON public.bodyweight
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own exercises" ON public.exercises
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users manage own routines" ON public.routines
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own workouts" ON public.workouts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own workout_exercises" ON public.workout_exercises
  FOR ALL USING (
    workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own workout_sets" ON public.workout_sets
  FOR ALL USING (
    workout_exercise_id IN (
      SELECT we.id FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own PRs" ON public.personal_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own attendance" ON public.attendance
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own nutrition" ON public.nutrition_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own food items" ON public.food_items
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users manage own progression" ON public.progression_suggestions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for routine_days and routine_exercises via join
CREATE POLICY "Users manage own routine_days" ON public.routine_days
  FOR ALL USING (
    routine_id IN (SELECT id FROM public.routines WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own routine_exercises" ON public.routine_exercises
  FOR ALL USING (
    routine_day_id IN (
      SELECT rd.id FROM public.routine_days rd
      JOIN public.routines r ON r.id = rd.routine_id
      WHERE r.user_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGER: auto-crear profile al registrarse
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- DATOS INICIALES: ejercicios globales
-- =============================================
INSERT INTO public.exercises (name, muscle_primary, muscles_secondary, category, equipment, instructions) VALUES
('Sentadilla con Barra', 'cuádriceps', '{"glúteos", "isquiotibiales", "core"}', 'compound', 'barbell', 'Coloca la barra en la parte superior de la espalda. Separa los pies al ancho de los hombros. Baja controladamente hasta paralelo o más. Empuja desde el suelo.'),
('Press de Banca Plano', 'pectoral mayor', '{"tríceps", "deltoides anterior"}', 'compound', 'barbell', 'Agarra la barra a 1.5x ancho de hombros. Baja controladamente al pecho. Empuja hacia arriba y ligeramente hacia atrás.'),
('Peso Muerto Convencional', 'isquiotibiales', '{"glúteos", "lumbar", "trapecios", "core"}', 'compound', 'barbell', 'Pies al ancho de las caderas. Agarra la barra fuera de las piernas. Mantén la espalda recta y empuja el suelo con los pies.'),
('Press Militar con Barra', 'deltoides anterior', '{"deltoides lateral", "tríceps"}', 'compound', 'barbell', 'De pie o sentado, empuja la barra desde los hombros hacia arriba hasta extensión completa.'),
('Dominadas', 'dorsal ancho', '{"bíceps", "romboides"}', 'compound', 'bodyweight', 'Agarra la barra con las palmas hacia afuera. Cuelga y jala hasta que la barbilla supere la barra.'),
('Remo con Barra', 'dorsal ancho', '{"romboides", "bíceps", "trapecios"}', 'compound', 'barbell', 'Inclínate hacia adelante con la espalda recta. Jala la barra hacia el abdomen inferior.'),
('Press de Banca Inclinado con Mancuernas', 'pectoral mayor clavicular', '{"deltoides anterior", "tríceps"}', 'compound', 'dumbbell', 'En banco a 30-45°. Baja las mancuernas a los costados del pecho y empuja hacia arriba.'),
('Curl de Bíceps con Barra', 'bíceps', '{"braquial", "braquirradial"}', 'isolation', 'barbell', 'De pie, agarra la barra con las palmas hacia arriba. Flexiona los codos sin mover los hombros.'),
('Press Francés', 'tríceps', '{}', 'isolation', 'barbell', 'Acostado, sostén la barra sobre el pecho con codos extendidos. Baja la barra hacia la frente flexionando solo los codos.'),
('Sentadilla Búlgara', 'cuádriceps', '{"glúteos", "isquiotibiales"}', 'compound', 'dumbbell', 'Pie trasero en banco. Baja en sentadilla unilateral manteniendo torso erecto.'),
('Hip Thrust', 'glúteos', '{"isquiotibiales", "cuádriceps"}', 'compound', 'barbell', 'Espalda alta en banco, barra sobre caderas. Empuja las caderas hacia arriba hasta extensión completa.'),
('Peso Muerto Rumano', 'isquiotibiales', '{"glúteos", "lumbar"}', 'compound', 'barbell', 'Con rodillas ligeramente flexionadas, baja la barra deslizándola por las piernas manteniendo la espalda recta.'),
('Prensa de Piernas', 'cuádriceps', '{"glúteos", "isquiotibiales"}', 'compound', 'machine', 'En máquina, empuja la plataforma hasta extensión casi completa y controla el regreso.'),
('Lateral Raise', 'deltoides lateral', '{}', 'isolation', 'dumbbell', 'De pie, eleva las mancuernas lateralmente hasta la altura de los hombros.'),
('Face Pull', 'deltoides posterior', '{"romboides", "trapecio"}', 'isolation', 'cable', 'Con cuerda en polea alta, jala hacia la cara abriendo los codos.'),
('Extensión de Cuádriceps', 'cuádriceps', '{}', 'isolation', 'machine', 'En máquina, extiende las piernas hasta posición recta controladamente.'),
('Curl de Isquiotibiales', 'isquiotibiales', '{}', 'isolation', 'machine', 'En máquina, flexiona las rodillas hacia los glúteos controladamente.'),
('Elevación de Pantorrillas', 'gastrocnemio', '{"sóleo"}', 'isolation', 'machine', 'De pie, sube en puntas de pie y baja controladamente con el talón por debajo del nivel de la plataforma.'),
('Pull Over con Mancuerna', 'dorsal ancho', '{"pectoral", "serrato"}', 'isolation', 'dumbbell', 'Acostado en banco, sostén mancuerna sobre el pecho con brazos casi extendidos. Baja detrás de la cabeza.'),
('Fondos en Paralelas', 'pectoral menor', '{"tríceps", "deltoides anterior"}', 'compound', 'bodyweight', 'Sostén en paralelas, baja flexionando codos a 90°. Inclínate hacia adelante para enfatizar pectoral.'),
('Remo en Máquina Sentado', 'dorsal ancho', '{"romboides", "bíceps"}', 'compound', 'machine', 'Sentado frente a la máquina, jala los agarres hacia el abdomen apretando los omóplatos.'),
('Press de Hombros con Mancuernas', 'deltoides anterior', '{"deltoides lateral", "tríceps"}', 'compound', 'dumbbell', 'Sentado o de pie, empuja las mancuernas desde la altura de los hombros hasta extensión completa.'),
('Curl Martillo', 'braquial', '{"bíceps", "braquirradial"}', 'isolation', 'dumbbell', 'De pie, con las palmas mirándose entre sí, flexiona los codos sin rotar las muñecas.');

-- =============================================
-- FUNCIÓN: calcular volumen total de un workout
-- =============================================
CREATE OR REPLACE FUNCTION public.update_workout_volume()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.workouts
  SET total_volume_kg = (
    SELECT COALESCE(SUM(ws.weight_kg * ws.reps), 0)
    FROM public.workout_sets ws
    JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
    WHERE we.workout_id = (
      SELECT we2.workout_id FROM public.workout_exercises we2 WHERE we2.id = NEW.workout_exercise_id
    )
  )
  WHERE id = (
    SELECT we3.workout_id FROM public.workout_exercises we3 WHERE we3.id = NEW.workout_exercise_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_volume
  AFTER INSERT OR UPDATE ON public.workout_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_workout_volume();
