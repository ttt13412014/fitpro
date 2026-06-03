'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  getTodayNutrition, addNutritionLog, deleteNutritionLog,
  getWeeklyNutrition, calculateDailyTotals,
} from '@/services/nutrition.service';
import { parsePDFFile, parseExcelFile } from '@/services/import.service';
import type { NutritionLog } from '@/types';
import { Plus, Trash2, Upload, Beef, Flame, Droplets, Zap, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type MealTime = NutritionLog['meal_time'];
const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Desayuno', lunch: '☀️ Almuerzo', dinner: '🌙 Cena',
  snack: '🍎 Snack', pre_workout: '⚡ Pre', post_workout: '💪 Post',
};

function MacroRing({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 52 52" className="-rotate-90 w-14 h-14">
          <circle cx="26" cy="26" r={r} fill="none" stroke="#1e1e2e" strokeWidth="5" />
          <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold font-mono" style={{ color }}>{Math.round(value)}</span>
        </div>
      </div>
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className="text-[10px] text-text-secondary font-medium">/{max}{unit}</p>
    </div>
  );
}

export default function NutritionPage() {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ meal_name: '', meal_time: 'lunch' as MealTime, calories: '', protein_g: '', carbs_g: '', fat_g: '' });

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    const [todayRes, weekRes] = await Promise.all([
      getTodayNutrition(user!.id),
      getWeeklyNutrition(user!.id),
    ]);
    setLogs(todayRes.data || []);
    setWeeklyData(weekRes.data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.meal_name || !form.calories) { toast.error('Completá nombre y calorías'); return; }
    const { error } = await addNutritionLog(user!.id, {
      meal_name: form.meal_name, meal_time: form.meal_time,
      calories: parseInt(form.calories),
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      logged_date: new Date().toISOString().split('T')[0],
    });
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Comida registrada');
    setForm({ meal_name: '', meal_time: 'lunch', calories: '', protein_g: '', carbs_g: '', fat_g: '' });
    setShowForm(false);
    loadData();
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.loading('Procesando...');
    try {
      const result = file.name.endsWith('.pdf')
        ? await parsePDFFile(file)
        : await parseExcelFile(file);
      for (const item of result.nutrition) {
        await addNutritionLog(user!.id, {
          meal_name: item.meal_name, meal_time: 'snack',
          calories: item.calories, protein_g: item.protein || 0,
          carbs_g: item.carbs || 0, fat_g: item.fat || 0,
          logged_date: new Date().toISOString().split('T')[0],
        });
      }
      toast.dismiss();
      toast.success(`${result.nutrition.length} comidas importadas`);
      loadData();
    } catch { toast.dismiss(); toast.error('Error al procesar'); }
  }

  const totals = calculateDailyTotals(logs);
  const targetCal = profile?.target_calories || 2500;
  const targetProt = profile?.target_protein_g || 150;
  const calPct = Math.min(100, (totals.calories / targetCal) * 100);

  const groupedLogs = logs.reduce((acc: Record<string, NutritionLog[]>, log) => {
    const key = log.meal_time || 'snack';
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Desktop title */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Nutrición</h1>
          <p className="text-sm text-text-secondary mt-0.5">Registro de hoy</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.csv" onChange={handleFileImport} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
      </div>

      {/* Mobile: calorie summary card */}
      <div className="card">
        {/* Calorie progress bar */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-bold font-display text-text-primary">{totals.calories}
              <span className="text-sm font-normal text-text-muted ml-1">/ {targetCal} kcal</span>
            </p>
            <p className="text-xs text-text-muted mt-0.5">{Math.round(calPct)}% del objetivo diario</p>
          </div>
          <Flame className={`w-6 h-6 ${calPct >= 100 ? 'text-accent-green' : 'text-accent-primary'}`} />
        </div>
        <div className="h-2 bg-bg-base rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ${calPct >= 100 ? 'bg-accent-green' : 'bg-accent-primary'}`}
            style={{ width: `${calPct}%` }}
          />
        </div>

        {/* Macros row */}
        <div className="flex justify-around">
          <MacroRing value={totals.protein_g} max={targetProt} color="#22d3a5" label="Proteína" unit="g" />
          <MacroRing value={totals.carbs_g} max={profile?.target_carbs_g || 300} color="#3b82f6" label="Carbos" unit="g" />
          <MacroRing value={totals.fat_g} max={profile?.target_fat_g || 80} color="#f59e0b" label="Grasas" unit="g" />
        </div>
      </div>

      {/* Action buttons mobile */}
      <div className="flex gap-2 lg:hidden">
        <button onClick={() => setShowForm(true)} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
          <Plus className="w-4 h-4" /> Agregar comida
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.csv" onChange={handleFileImport} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="btn-secondary px-4 flex items-center justify-center">
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* Add form — bottom sheet style on mobile */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full lg:max-w-md bg-bg-card rounded-t-3xl lg:rounded-3xl border border-border-default p-5 animate-slide-up">
            {/* Handle */}
            <div className="w-10 h-1 bg-border-default rounded-full mx-auto mb-4 lg:hidden" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Nueva comida</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" placeholder="Ej: Pollo con arroz" value={form.meal_name} onChange={e => setForm({ ...form, meal_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Momento</label>
                <select className="input" value={form.meal_time || ''} onChange={e => setForm({ ...form, meal_time: e.target.value as MealTime })}>
                  {Object.entries(MEAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Calorías *</label>
                  <input type="number" inputMode="numeric" className="input" placeholder="0" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} />
                </div>
                <div>
                  <label className="label">Proteína (g)</label>
                  <input type="number" inputMode="decimal" className="input" placeholder="0" value={form.protein_g} onChange={e => setForm({ ...form, protein_g: e.target.value })} />
                </div>
                <div>
                  <label className="label">Carbos (g)</label>
                  <input type="number" inputMode="decimal" className="input" placeholder="0" value={form.carbs_g} onChange={e => setForm({ ...form, carbs_g: e.target.value })} />
                </div>
                <div>
                  <label className="label">Grasas (g)</label>
                  <input type="number" inputMode="decimal" className="input" placeholder="0" value={form.fat_g} onChange={e => setForm({ ...form, fat_g: e.target.value })} />
                </div>
              </div>
            </div>
            <button onClick={handleAdd} className="btn-primary w-full mt-4 py-3.5 text-base">Guardar comida</button>
          </div>
        </div>
      )}

      {/* Meals list */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)
        ) : logs.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-text-muted text-sm">Sin comidas hoy. ¡Registrá algo!</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([mealTime, mealLogs]) => (
            <div key={mealTime} className="card">
              <p className="text-xs font-semibold text-text-secondary mb-3">{MEAL_LABELS[mealTime] || mealTime}</p>
              <div className="space-y-2.5">
                {mealLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{log.meal_name}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-accent-primary">{log.calories}kcal</span>
                        <span className="text-[10px] text-accent-green">{log.protein_g}g P</span>
                        <span className="text-[10px] text-accent-blue">{log.carbs_g}g C</span>
                        <span className="text-[10px] text-accent-yellow">{log.fat_g}g G</span>
                      </div>
                    </div>
                    <button
                      onClick={async () => { await deleteNutritionLog(log.id); setLogs(p => p.filter(l => l.id !== log.id)); }}
                      className="p-2 text-text-muted hover:text-accent-red transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Weekly chart — collapsible on mobile */}
      <div className="card">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setShowChart(!showChart)}
        >
          <p className="font-semibold text-sm text-text-primary">Resumen semanal</p>
          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showChart ? 'rotate-180' : ''}`} />
        </button>
        {showChart && weeklyData.length > 0 && (
          <div className="mt-4 animate-slide-up">
            <p className="text-xs text-text-muted mb-3">Calorías últimos 7 días</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#16161f', border: '1px solid #2a2a3e', borderRadius: '10px', fontSize: 12 }} />
                <Area type="monotone" dataKey="calories" stroke="#6c63ff" strokeWidth={2} fill="url(#calGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
