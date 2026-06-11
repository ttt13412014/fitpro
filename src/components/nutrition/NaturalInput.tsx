"use client";

import { useState, useRef, useCallback } from "react";
import { Sparkles, Loader2, Check, X, ChevronDown, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface ParsedFood {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ParseResult {
  foods: ParsedFood[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes?: string;
}

interface NaturalInputProps {
  onConfirm: (result: ParseResult, mealType: string) => Promise<void>;
  disabled?: boolean;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "Desayuno", emoji: "🌅" },
  { value: "lunch", label: "Almuerzo", emoji: "☀️" },
  { value: "dinner", label: "Cena", emoji: "🌙" },
  { value: "snack", label: "Snack", emoji: "🍎" },
];

const EXAMPLES = [
  "200g de pechuga de pollo a la plancha",
  "1 taza de avena con leche y banana",
  "300g arroz blanco, 150g atún al agua",
  "2 huevos revueltos con 30g queso",
];

export default function NaturalInput({ onConfirm, disabled }: NaturalInputProps) {
  const [input, setInput] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleParse = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/nutrition/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al procesar"); return; }
      setResult(data);
    } catch {
      setError("Sin conexión. Revisá tu internet.");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleConfirm = async () => {
    if (!result || isSaving) return;
    setIsSaving(true);
    try {
      await onConfirm(result, mealType);
      setResult(null);
      setInput("");
      toast.success("Comida registrada ✓");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => { setResult(null); setError(null); textareaRef.current?.focus(); };

  const handleExample = () => {
    setInput(EXAMPLES[exampleIndex % EXAMPLES.length]);
    setExampleIndex((i) => i + 1);
    setResult(null); setError(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleParse(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {MEAL_TYPES.map((m) => (
          <button key={m.value} onClick={() => setMealType(m.value)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all ${mealType === m.value ? "bg-emerald-500 text-white shadow-sm" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}>
            <span className="block text-base leading-none mb-0.5">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <textarea ref={textareaRef} value={input}
          onChange={(e) => { setInput(e.target.value); if (result) setResult(null); if (error) setError(null); }}
          onKeyDown={handleKeyDown}
          placeholder="Ej: 300g de arroz con 200g de pollo a la plancha y ensalada..."
          rows={3} disabled={disabled || isLoading || isSaving}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50" />
        <div className="absolute bottom-3 right-3 text-xs text-gray-600">{input.length}/500</div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleExample} disabled={isLoading || isSaving}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
          Ver ejemplo
        </button>
        <div className="flex-1" />
        <button onClick={handleParse} disabled={!input.trim() || isLoading || isSaving || disabled}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all">
          {isLoading ? <><Loader2 size={15} className="animate-spin" />Calculando...</> : <><Sparkles size={15} />Calcular macros</>}
        </button>
      </div>
      {!result && !error && <p className="text-xs text-gray-600 text-center">Ctrl+Enter para calcular rápido</p>}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={handleDiscard} className="text-red-400/60 hover:text-red-400"><X size={14} /></button>
        </div>
      )}
      {result && (
        <div className="border border-emerald-500/30 rounded-2xl overflow-hidden bg-emerald-950/20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <Check size={15} />{result.foods.length} alimento{result.foods.length !== 1 ? "s" : ""} detectado{result.foods.length !== 1 ? "s" : ""}
            </span>
            <button onClick={handleDiscard} className="text-gray-500 hover:text-white"><X size={14} /></button>
          </div>
          <div className="divide-y divide-white/5">
            {result.foods.map((food, i) => <FoodRow key={i} food={food} />)}
          </div>
          <div className="px-4 py-3 bg-white/5 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-white">{result.totals.calories} kcal</span>
            </div>
            <MacroBar protein={result.totals.protein} carbs={result.totals.carbs} fat={result.totals.fat} />
          </div>
          {result.notes && (
            <div className="px-4 py-2.5 bg-amber-500/5 border-t border-amber-500/10">
              <p className="text-xs text-amber-400/80"><span className="font-semibold">Nota: </span>{result.notes}</p>
            </div>
          )}
          <div className="p-3 border-t border-white/5">
            <button onClick={handleConfirm} disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all">
              {isSaving ? <><Loader2 size={15} className="animate-spin" />Guardando...</> : <><Check size={15} />Guardar en {MEAL_TYPES.find((m) => m.value === mealType)?.label}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FoodRow({ food }: { food: ParsedFood }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-3">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between text-left">
        <div>
          <p className="text-sm font-medium text-white capitalize">{food.name}</p>
          <p className="text-xs text-gray-500">{food.quantity}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{food.calories} kcal</span>
          <ChevronDown size={14} className={`text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MacroChip label="Proteína" value={food.protein} color="blue" />
          <MacroChip label="Carbos" value={food.carbs} color="amber" />
          <MacroChip label="Grasa" value={food.fat} color="rose" />
        </div>
      )}
    </div>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: "blue" | "amber" | "rose" }) {
  const colors = { blue: "bg-blue-500/10 text-blue-400", amber: "bg-amber-500/10 text-amber-400", rose: "bg-rose-500/10 text-rose-400" };
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${colors[color]}`}>
      <p className="text-xs font-bold">{value}g</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  if (total === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div style={{ width: `${(protein/total)*100}%` }} className="bg-blue-400 rounded-full" />
        <div style={{ width: `${(carbs/total)*100}%` }} className="bg-amber-400 rounded-full" />
        <div style={{ width: `${(fat/total)*100}%` }} className="bg-rose-400 rounded-full" />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span><span className="text-blue-400 font-medium">{protein}g</span> P</span>
        <span><span className="text-amber-400 font-medium">{carbs}g</span> C</span>
        <span><span className="text-rose-400 font-medium">{fat}g</span> G</span>
      </div>
    </div>
  );
}