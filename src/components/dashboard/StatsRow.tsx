'use client';

import { Dumbbell, Flame, TrendingUp, Scale, Utensils, Beef } from 'lucide-react';

interface StatsRowProps {
  workoutsWeek: number;
  streak: number;
  volumeWeek: number;
  currentWeight?: number;
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
}

export function StatsRow({ workoutsWeek, streak, volumeWeek, currentWeight, calories, targetCalories, protein, targetProtein }: StatsRowProps) {
  const stats = [
    { icon: Dumbbell, label: 'Entrenos', value: `${workoutsWeek}`, sub: 'esta semana', color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
    { icon: Flame, label: 'Racha', value: `${streak}`, sub: 'días', color: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
    { icon: TrendingUp, label: 'Volumen', value: volumeWeek > 0 ? `${(volumeWeek / 1000).toFixed(1)}t` : '—', sub: 'semana', color: 'text-accent-green', bg: 'bg-accent-green/10' },
    { icon: Scale, label: 'Peso', value: currentWeight ? `${currentWeight}` : '—', sub: 'kg', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    { icon: Utensils, label: 'Calorías', value: `${calories}`, sub: `/ ${targetCalories}`, color: calories >= targetCalories ? 'text-accent-green' : 'text-accent-yellow', bg: calories >= targetCalories ? 'bg-accent-green/10' : 'bg-accent-yellow/10' },
    { icon: Beef, label: 'Proteína', value: `${Math.round(protein)}g`, sub: `/ ${targetProtein}g`, color: protein >= targetProtein ? 'text-accent-green' : 'text-accent-red', bg: protein >= targetProtein ? 'bg-accent-green/10' : 'bg-accent-red/10' },
  ];

  return (
    // Mobile: scroll horizontal con cards compactas
    // Desktop: grid 6 columnas
    <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible snap-x snap-mandatory">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="card shrink-0 w-32 lg:w-auto snap-start flex flex-col gap-1 p-4"
        >
          <div className={`w-8 h-8 ${stat.bg} rounded-xl flex items-center justify-center mb-1`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <p className={`text-lg font-bold font-display ${stat.color} leading-none`}>{stat.value}</p>
          <p className="text-[10px] text-text-muted">{stat.sub}</p>
          <p className="text-[10px] text-text-secondary leading-tight">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
