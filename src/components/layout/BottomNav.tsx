'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkoutStore } from '@/context/workout-store';
import { LayoutDashboard, Dumbbell, Apple, History, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/workout', icon: Dumbbell, label: 'Gym' },
  { href: '/analyzer', icon: Scan, label: 'IA Reps', highlight: true },
  { href: '/nutrition', icon: Apple, label: 'Nutrición' },
  { href: '/history', icon: History, label: 'Historial' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { activeWorkout, isTimerRunning, timerSeconds } = useWorkoutStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card/95 backdrop-blur-xl border-t border-border-subtle safe-area-bottom">
      {isTimerRunning && (
        <div className="h-0.5 bg-bg-base">
          <div className="h-full bg-accent-green transition-all duration-1000" style={{ width: `${(timerSeconds / 90) * 100}%` }} />
        </div>
      )}

      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map(({ href, icon: Icon, label, highlight }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          const isWorkout = href === '/workout';

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 relative min-w-[52px]',
                active ? 'text-accent-primary' : 'text-text-muted'
              )}
            >
              {isWorkout && activeWorkout && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent-green rounded-full animate-pulse" />
              )}

              {/* Botón central destacado */}
              {highlight ? (
                <div className={cn(
                  'flex items-center justify-center w-12 h-9 rounded-xl transition-all duration-200',
                  active
                    ? 'bg-accent-primary text-white shadow-glow-purple'
                    : 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
              ) : (
                <div className={cn(
                  'flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200',
                  active ? 'bg-accent-primary/15' : ''
                )}>
                  <Icon className="w-5 h-5" />
                </div>
              )}

              <span className={cn(
                'text-[10px] font-medium transition-all duration-200',
                active ? 'text-accent-primary' : 'text-text-muted',
                highlight && !active ? 'text-accent-primary' : ''
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
