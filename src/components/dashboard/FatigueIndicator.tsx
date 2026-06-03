'use client';

import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface FatigueProps {
  level: 'low' | 'moderate' | 'high';
  message: string;
}

export function FatigueIndicator({ level, message }: FatigueProps) {
  const config = {
    low: {
      icon: CheckCircle,
      color: 'text-accent-green',
      bg: 'bg-accent-green/10',
      border: 'border-accent-green/20',
      label: 'Fatiga baja',
    },
    moderate: {
      icon: Zap,
      color: 'text-accent-yellow',
      bg: 'bg-accent-yellow/10',
      border: 'border-accent-yellow/20',
      label: 'Fatiga moderada',
    },
    high: {
      icon: AlertTriangle,
      color: 'text-accent-red',
      bg: 'bg-accent-red/10',
      border: 'border-accent-red/20',
      label: 'Fatiga alta',
    },
  }[level];

  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-2xl p-4 flex items-center gap-3 animate-slide-up`}>
      <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
      <div>
        <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
        <p className="text-xs text-text-secondary">{message}</p>
      </div>
    </div>
  );
}
