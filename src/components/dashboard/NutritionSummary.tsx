'use client';

import { Apple, Beef } from 'lucide-react';
import Link from 'next/link';

interface Props {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories: number;
  targetProtein: number;
}

function MacroBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function NutritionSummary({ calories, protein, carbs, fat, targetCalories, targetProtein }: Props) {
  const calPct = Math.min(100, (calories / targetCalories) * 100);

  return (
    <Link href="/nutrition" className="block card h-full hover:border-border-default transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Nutrición hoy</h3>
        <Apple className="w-4 h-4 text-accent-green" />
      </div>

      {/* Calorie ring */}
      <div className="relative flex items-center justify-center mb-5">
        <svg viewBox="0 0 80 80" className="w-28 h-28 -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#1e1e2e" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke={calPct >= 100 ? '#22d3a5' : '#6c63ff'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - calPct / 100)}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-xl font-bold font-display text-text-primary">{calories}</p>
          <p className="text-[10px] text-text-muted">kcal</p>
        </div>
      </div>

      {/* Macros */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">Proteína</span>
            <span className="font-medium text-accent-green">{Math.round(protein)}g / {targetProtein}g</span>
          </div>
          <MacroBar value={protein} max={targetProtein} color="bg-accent-green" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">Carbohidratos</span>
            <span className="font-medium text-accent-blue">{Math.round(carbs)}g</span>
          </div>
          <MacroBar value={carbs} max={300} color="bg-accent-blue" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">Grasas</span>
            <span className="font-medium text-accent-yellow">{Math.round(fat)}g</span>
          </div>
          <MacroBar value={fat} max={80} color="bg-accent-yellow" />
        </div>
      </div>
    </Link>
  );
}
