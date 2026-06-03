'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { BodyweightEntry } from '@/types';
import { Scale, Plus } from 'lucide-react';
import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  data: BodyweightEntry[];
  userId: string;
}

export function BodyweightChart({ data, userId }: Props) {
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = getSupabaseClient();

  const chartData = [...data]
    .reverse()
    .slice(-14)
    .map((d) => ({
      date: format(parseISO(d.recorded_at), 'd MMM', { locale: es }),
      weight: d.weight_kg,
    }));

  async function handleAddWeight() {
    const w = parseFloat(newWeight);
    if (!w || w < 20 || w > 300) return;
    setSaving(true);
    const { error } = await supabase.from('bodyweight').insert({
      user_id: userId,
      weight_kg: w,
      recorded_at: new Date().toISOString().split('T')[0],
    });
    if (error) {
      toast.error('Error al guardar peso');
    } else {
      toast.success('Peso registrado');
      setNewWeight('');
    }
    setSaving(false);
  }

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">Peso corporal</h3>
          <p className="text-xs text-text-muted mt-0.5">Últimos 14 días</p>
        </div>
        <Scale className="w-4 h-4 text-accent-blue" />
      </div>

      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
            <XAxis dataKey="date" tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#16161f', border: '1px solid #2a2a3e', borderRadius: '10px', fontSize: 12 }}
              labelStyle={{ color: '#8888aa' }}
              formatter={(v: any) => [`${v} kg`, 'Peso']}
            />
            <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-24 flex items-center justify-center">
          <p className="text-xs text-text-muted">Sin suficientes datos</p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <input
          type="number"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          className="input flex-1 text-center text-sm"
          placeholder="Kg de hoy"
          step="0.1"
        />
        <button
          onClick={handleAddWeight}
          disabled={saving || !newWeight}
          className="btn-primary px-3 py-2"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
