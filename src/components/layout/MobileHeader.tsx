'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useWorkoutStore } from '@/context/workout-store';
import { Dumbbell, User, Timer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDuration } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'FitPro',
  '/workout': 'Entrenar',
  '/nutrition': 'Nutrición',
  '/history': 'Historial',
  '/exercises': 'Ejercicios',
  '/routines': 'Rutinas',
  '/coach': 'Coach IA',
};

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const { activeWorkout, isTimerRunning, timerSeconds } = useWorkoutStore();

  const title = PAGE_TITLES[pathname] || 'FitPro';
  const isDashboard = pathname === '/dashboard';
  const isWorkout = pathname.startsWith('/workout');

  return (
    <header className="sticky top-0 z-40 bg-bg-base/90 backdrop-blur-xl border-b border-border-subtle">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: back button or logo */}
        {!isDashboard ? (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent-primary/10 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-accent-primary" />
            </div>
            <span className="font-display font-bold text-base text-text-primary">FitPro</span>
          </div>
        )}

        {/* Center: page title */}
        {!isDashboard && (
          <h1 className="font-display font-bold text-base text-text-primary absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>
        )}

        {/* Right: active workout timer or profile */}
        <div className="flex items-center gap-2">
          {activeWorkout && isTimerRunning && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-accent-green/10 border border-accent-green/20 rounded-xl">
              <Timer className="w-3 h-3 text-accent-green" />
              <span className="text-xs font-mono font-bold text-accent-green">{timerSeconds}s</span>
            </div>
          )}
          {activeWorkout && !isWorkout && (
            <Link
              href="/workout"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-primary/10 border border-accent-primary/20 rounded-xl"
            >
              <div className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium text-accent-primary">Activo</span>
            </Link>
          )}
          {isDashboard && (
            <Link href="/routines">
              <div className="w-8 h-8 rounded-xl bg-bg-elevated flex items-center justify-center">
                <User className="w-4 h-4 text-text-muted" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
