'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

interface VolumeChartProps {
  data: { started_at: string; total_volume_kg: number }[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated border border-border-default rounded-xl p-3 shadow-card">
        <p className="text-xs text-text-secondary mb-1">{label}</p>
        <p className="text-sm font-bold text-accent-primary">
          {(payload[0].value / 1000).toFixed(2)}t
        </p>
        <p className="text-[10px] text-text-muted">volumen total</p>
      </div>
    );
  }
  return null;
};

export function VolumeChart({ data, loading }: VolumeChartProps) {
  const chartData = data.map((w) => ({
    date: format(parseISO(w.started_at), 'dd MMM', { locale: es }),
    volume: w.total_volume_kg,
  }));

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">Volumen de entrenamiento</h3>
          <p className="text-xs text-text-muted mt-0.5">Últimos 7 días</p>
        </div>
        <div className="w-8 h-8 bg-accent-primary/10 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-accent-primary" />
        </div>
      </div>

      {loading ? (
        <div className="h-48 skeleton rounded-xl" />
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm text-text-muted">Sin datos de entrenamiento</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#55556a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#55556a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}t`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
            <Bar
              dataKey="volume"
              fill="#6c63ff"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
