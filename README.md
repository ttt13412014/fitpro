# 💪 FitPro — Personal Fitness Tracker

App web fitness premium personal. Stack: **Next.js 15 · React · TailwindCSS · Supabase · Recharts · TypeScript**.

---

## 🚀 Instalación

### 1. Clonar e instalar dependencias

```bash
cd fitpro
npm install
```

### 2. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`
3. Copiar las credenciales del proyecto

### 3. Variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Para el Coach IA (Claude)
ANTHROPIC_API_KEY=tu-anthropic-api-key
```

> **Cómo obtener las keys de Supabase:**
> Dashboard → Settings → API → "Project URL" y "anon public"

> **Cómo obtener API key de Anthropic:**
> [console.anthropic.com](https://console.anthropic.com) → API Keys

### 4. Ejecutar

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── auth/login/         # Login y registro
│   ├── dashboard/          # Dashboard principal
│   ├── workout/            # Tracker de gym activo
│   ├── routines/           # CRUD de rutinas
│   ├── nutrition/          # Registro nutricional
│   ├── history/            # Historial de entrenamientos
│   ├── exercises/          # Catálogo de ejercicios
│   ├── coach/              # Chat con IA
│   └── api/coach/          # API route para Claude AI
├── components/
│   ├── layout/Sidebar      # Navegación lateral
│   ├── dashboard/          # Componentes del dashboard
│   ├── workout/            # Ejercicio activo, timer, selector
│   └── charts/             # Gráficos Recharts
├── context/
│   ├── auth-context        # Autenticación global
│   └── workout-store       # Estado del workout activo (Zustand)
├── services/
│   ├── workout.service     # Lógica de workouts y PRs
│   ├── nutrition.service   # Registro nutricional
│   └── import.service      # Parser PDF/Excel
├── hooks/                  # Custom hooks
├── lib/
│   ├── supabase            # Cliente browser
│   ├── supabase-server     # Cliente server
│   └── utils               # Helpers y lógica
└── types/                  # TypeScript interfaces
supabase/
└── schema.sql              # Schema completo con RLS
```

---

## ✅ Funcionalidades incluidas

| Feature | Estado |
|---------|--------|
| Login / Registro (Supabase Auth) | ✅ |
| Dashboard con estadísticas | ✅ |
| Tracker de gym activo | ✅ |
| Timer de descanso | ✅ |
| Rutinas PPL / Full Body / Custom | ✅ |
| CRUD de ejercicios | ✅ |
| Registro de series con RIR | ✅ |
| Detección automática de PRs | ✅ |
| Progresión automática sugerida | ✅ |
| Indicador de fatiga | ✅ |
| Nutrición con macros | ✅ |
| Import PDF/Excel | ✅ |
| Historial con gráficos | ✅ |
| Coach IA (Claude) | ✅ |
| Gráfico peso corporal | ✅ |
| Calendario de asistencia | ✅ |
| Racha de días | ✅ |
| RLS (seguridad por usuario) | ✅ |
| Responsive | ✅ |

---

## 🗄️ Schema de base de datos

Tablas principales:
- `profiles` — datos del usuario
- `exercises` — catálogo global + custom
- `routines` + `routine_days` + `routine_exercises` — plantillas
- `workouts` + `workout_exercises` + `workout_sets` — sesiones reales
- `personal_records` — PRs automáticos
- `attendance` — asistencia diaria
- `nutrition_logs` — registro de comidas
- `bodyweight` — historial de peso

Row Level Security activado en todas las tablas.

---

## 🔮 Mejoras sugeridas

- Agregar ExerciseDB API para imágenes/GIFs de ejercicios
- Notificaciones push para recordatorio de entreno
- Modo PWA (offline)
- Barcode scanner para comidas
- Export a CSV/PDF
- Comparación semana vs semana
- Versión móvil nativa (Expo/React Native)
