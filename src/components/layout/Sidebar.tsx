'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useWorkoutStore } from '@/context/workout-store';
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  History,
  Brain,
  LogOut,
  Activity,
  BookOpen,
  User,
  Zap,
  Timer,
  Scan,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/workout', icon: Dumbbell, label: 'Entrenar' },
  { href: '/routines', icon: BookOpen, label: 'Rutinas' },
  { href: '/nutrition', icon: Apple, label: 'Nutrición' },
  { href: '/history', icon: History, label: 'Historial' },
  { href: '/exercises', icon: Activity, label: 'Ejercicios' },
  { href: '/analyzer', icon: Scan, label: 'Analizador IA' },
  { href: '/coach', icon: Brain, label: 'Coach IA' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { activeWorkout, isTimerRunning, timerSeconds } = useWorkoutStore();

  async function handleSignOut() {
    await signOut();
    router.push('/auth/login');
    toast.success('Sesión cerrada');
  }

  return (
    <aside className="w-60 h-screen flex flex-col bg-bg-card border-r border-border-subtle sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent-primary/10 border border-accent-primary/30 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-accent-primary" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-text-primary">FitPro</span>
            <span className="text-[10px] text-text-muted block -mt-0.5">Personal Tracker</span>
          </div>
        </div>
      </div>

      {/* Active workout indicator */}
      {activeWorkout && (
        <Link href="/workout" className="mx-3 mt-3">
          <div className="bg-accent-primary/10 border border-accent-primary/30 rounded-xl p-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-accent-primary truncate">{activeWorkout.name}</p>
              <p className="text-[10px] text-text-muted">Entrenamiento activo</p>
            </div>
            {isTimerRunning && (
              <div className="flex items-center gap-1 text-accent-green">
                <Timer className="w-3 h-3" />
                <span className="text-xs font-mono">{timerSeconds}s</span>
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(active ? 'nav-link-active' : 'nav-link')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {href === '/coach' && (
                <span className="ml-auto">
                  <Zap className="w-3 h-3 text-accent-yellow" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border-subtle">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-accent-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">
              {profile?.full_name || 'Usuario'}
            </p>
            <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-text-muted hover:text-accent-red transition-colors p-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
