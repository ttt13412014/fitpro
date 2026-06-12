"use client";

import { useState, useRef, useCallback } from "react";
import { Zap, Check, X, ChevronDown, AlertCircle, Search } from "lucide-react";
import toast from "react-hot-toast";
import { calculateMacros, searchFoods } from "@/lib/nutrition-calculator";
import type { ParseResult } from "@/lib/nutrition-calculator";

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
  "300g arroz, 200g pollo",
  "2 huevos, 1 taza avena",
  "150g atún, 100g papa",
  "1 banana, 30g maní",
];

export default function NaturalInput({ onConfirm, disabled }: NaturalInputProps) {
  const [input, setInput] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCalculate = useCallback(() => {
    if (!input.trim()) return;
    setError(null);
    setResult(null);

    const parsed = calculateMacros(input.trim());

    if (parsed.foods.length === 0) {
      setError("No reconocí ningún alimento. Intentá con: '300g arroz', '2 huevos', '1 taza avena'");
      return;
    }

    setResult(parsed);
    setSuggestions([]);
  }, [input]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (result) setResult(null);
    if (error) setError(null);

    // Sugerencias en tiempo real
    const lastWord = value.split(/[\s,+]+/).pop() || "";
    if (lastWord.length >= 2) {
      setSuggestions(searchFoods(lastWord));
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (food: string) => {
    const parts = input.split(/[\s,+]+/);
    parts.pop();
    const newInput = (parts.join(" ") + (parts.length > 0 ? " " : "") + food).trim();
    setInput(newInput);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

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

  const handleExample = () => {
    const next = EXAMPLES[exampleIndex % EXAMPLES.length];
    setInput(next);
    setExampleIndex((i) => i + 1);
    setResult(null);
    setError(null);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCalculate();
    }
  };

  return (
    <div className="space-y-3">
      {/* Meal type selector */}
      <div className="flex gap-2">
        {MEAL_TYPES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMealType(m.value)}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
              mealType === m.value
                ? "bg-accent-primary text-white shadow-sm"
                : "bg-bg-base text-text-muted hover:text-text-primary"
            }`}
          >
            <span className="block text-base leading-none mb-0.5">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ej: 300g arroz, 200g pollo, 2 huevos..."
          rows={2}
          disabled={disabled || isSaving}
          className="w-full bg-bg-base border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all disabled:opacity-50"
        />
        <div className="absolute bottom-3 right-3 text-xs text-text-muted opacity-50">
          {input.length}/500
        </div>
      </div>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestionClick(s)}
              className="text-xs px-3 py-1.5 bg-accent-primary/10 text-accent-primary rounded-full border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 items-center">
        <button
          onClick={handleExample}
          className="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded-lg hover:bg-bg-base"
        >
          Ver ejemplo
        </button>
        <div className="flex-1" />
        <button
          onClick={handleCalculate}
          disabled={!input.trim() || isSaving || disabled}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Zap size={15} />
          Calcular
        </button>
      </div>

      <p className="text-xs text-text-muted text-center opacity-60">
        Calculadora offline · Base de datos local
      </p>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="border border-accent-primary/30 rounded-2xl overflow-hidden bg-accent-primary/5">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <span className="text-sm font-semibold text-accent-primary flex items-center gap-2">
              <Check size={15} />
              {result.foods.length} alimento{result.foods.length !== 1 ? "s" : ""} calculado{result.foods.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => setResult(null)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>

          {/* Food list */}
          <div className="divide-y divide-border-subtle">
            {result.foods.map((food, i) => (
              <FoodRow key={i} food={food} />
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 py-3 bg-bg-base border-t border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-text-primary">{result.totals.calories} kcal</span>
            </div>
            <MacroBar protein={result.totals.protein} carbs={result.totals.carbs} fat={result.totals.fat} />
          </div>

          {/* Confirm */}
          <div className="p-3 border-t border-border-subtle">
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
            >
              {isSaving ? (
                <span className="animate-pulse">Guardando...</span>
              ) : (
                <>
                  <Check size={15} />
                  Guardar en {MEAL_TYPES.find((m) => m.value === mealType)?.label}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FoodRow({ food }: { food: ReturnType<typeof import("@/lib/nutrition-calculator").calculateMacros>["foods"][0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-3">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between text-left">
        <div>
          <p className="text-sm font-medium text-text-primary capitalize">{food.name}</p>
          <p className="text-xs text-text-muted">{food.quantity} · {food.grams}g</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-primary">{food.calories} kcal</span>
          <ChevronDown size={14} className={`text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
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
  const colors = {
    blue: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
    rose: "bg-rose-500/10 text-rose-400",
  };
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
        <div style={{ width: `${(protein / total) * 100}%` }} className="bg-blue-400 rounded-full" />
        <div style={{ width: `${(carbs / total) * 100}%` }} className="bg-amber-400 rounded-full" />
        <div style={{ width: `${(fat / total) * 100}%` }} className="bg-rose-400 rounded-full" />
      </div>
      <div className="flex justify-between text-xs text-text-muted">
        <span><span className="text-blue-400 font-medium">{protein}g</span> P</span>
        <span><span className="text-amber-400 font-medium">{carbs}g</span> C</span>
        <span><span className="text-rose-400 font-medium">{fat}g</span> G</span>
      </div>
    </div>
  );
}
