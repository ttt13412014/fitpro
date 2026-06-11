"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload, ChevronRight, ChevronLeft, Check, X, AlertCircle,
  FileSpreadsheet, Dumbbell, RotateCcw, Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";

export interface ImportedExercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  muscle_group?: string;
  description?: string;
  image_url?: string;
}

interface ExcelImportWizardProps {
  onConfirm: (exercises: ImportedExercise[]) => Promise<void>;
  onClose: () => void;
}

const MUSCLE_COLORS: Record<string, string> = {
  pecho: "bg-red-500/20 text-red-400", espalda: "bg-blue-500/20 text-blue-400",
  hombros: "bg-purple-500/20 text-purple-400", bíceps: "bg-emerald-500/20 text-emerald-400",
  tríceps: "bg-orange-500/20 text-orange-400", piernas: "bg-yellow-500/20 text-yellow-400",
  glúteos: "bg-pink-500/20 text-pink-400", core: "bg-cyan-500/20 text-cyan-400",
  cardio: "bg-lime-500/20 text-lime-400", default: "bg-gray-500/20 text-gray-400",
};

function musclePill(group?: string) {
  if (!group) return MUSCLE_COLORS.default;
  return MUSCLE_COLORS[group.toLowerCase()] ?? MUSCLE_COLORS.default;
}

function parseExcelFile(file: File): Promise<ImportedExercise[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (rows.length === 0) { reject(new Error("El archivo está vacío.")); return; }
        const exercises: ImportedExercise[] = rows.map((row) => {
          const name = String(row["ejercicio"] || row["Ejercicio"] || row["exercise"] || row["Exercise"] || row["nombre"] || row["Nombre"] || "").trim();
          if (!name) return null;
          const sets = parseInt(String(row["series"] || row["Series"] || row["sets"] || row["Sets"] || "3")) || 3;
          const reps = String(row["repeticiones"] || row["Repeticiones"] || row["reps"] || row["Reps"] || "10").trim();
          const rest = parseInt(String(row["descanso"] || row["Descanso"] || row["rest"] || row["Rest"] || "90")) || 90;
          const notes = String(row["notas"] || row["Notas"] || row["notes"] || row["Notes"] || "").trim();
          const muscle_group = String(row["musculo"] || row["Musculo"] || row["músculo"] || row["muscle"] || row["Muscle"] || "").trim();
          return { name, sets, reps, rest_seconds: rest, notes: notes || undefined, muscle_group: muscle_group || undefined } as ImportedExercise;
        }).filter(Boolean) as ImportedExercise[];
        if (exercises.length === 0) { reject(new Error('No encontré ejercicios. Asegurate de tener una columna "ejercicio".')); return; }
        resolve(exercises);
      } catch { reject(new Error("No pude leer el archivo. ¿Es un .xlsx válido?")); }
    };
    reader.onerror = () => reject(new Error("Error leyendo el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return <div className={`w-2 h-2 rounded-full transition-all ${done ? "bg-emerald-500" : active ? "bg-white scale-125" : "bg-white/20"}`} />;
}

function ExerciseCard({ exercise, index, current, total, onEdit }: {
  exercise: ImportedExercise; index: number; current: number; total: number;
  onEdit: (field: keyof ImportedExercise, value: string | number) => void;
}) {
  const isCurrent = index === current;
  const isDone = index < current;
  return (
    <div className={`rounded-2xl border transition-all ${isCurrent ? "border-emerald-500/40 bg-emerald-950/30" : isDone ? "border-white/10 bg-white/3 opacity-60" : "border-white/5 bg-white/2 opacity-30"}`}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isDone ? "bg-emerald-500/20 text-emerald-400" : isCurrent ? "bg-white/10 text-white" : "bg-white/5 text-gray-600"}`}>
          {isDone ? <Check size={14} /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate capitalize">{exercise.name}</p>
          {exercise.muscle_group && <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 ${musclePill(exercise.muscle_group)}`}>{exercise.muscle_group}</span>}
        </div>
        <div className="text-xs text-gray-500 shrink-0">{index + 1}/{total}</div>
      </div>
      {isCurrent && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Series</label>
              <input type="number" min={1} max={20} value={exercise.sets} onChange={(e) => onEdit("sets", parseInt(e.target.value) || 1)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Reps</label>
              <input type="text" value={exercise.reps} onChange={(e) => onEdit("reps", e.target.value)} placeholder="8-12"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descanso</label>
              <input type="number" min={0} max={600} step={15} value={exercise.rest_seconds} onChange={(e) => onEdit("rest_seconds", parseInt(e.target.value) || 60)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
          </div>
          {exercise.notes && <div className="flex gap-2 items-start"><AlertCircle size={12} className="text-amber-400 mt-0.5 shrink-0" /><p className="text-xs text-amber-400/80">{exercise.notes}</p></div>}
        </div>
      )}
      {isDone && <div className="px-4 pb-3"><div className="flex gap-3 text-xs text-gray-500"><span>{exercise.sets} series</span><span>·</span><span>{exercise.reps} reps</span><span>·</span><span>{exercise.rest_seconds}s descanso</span></div></div>}
    </div>
  );
}

export default function ExcelImportWizard({ onConfirm, onClose }: ExcelImportWizardProps) {
  const [step, setStep] = useState<"upload" | "review" | "confirm">("upload");
  const [exercises, setExercises] = useState<ImportedExercise[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { setParseError("Solo se aceptan archivos .xlsx o .xls"); return; }
    setIsParsing(true); setParseError(null);
    try { const parsed = await parseExcelFile(file); setExercises(parsed); setCurrentIdx(0); setStep("review"); }
    catch (err) { setParseError((err as Error).message); }
    finally { setIsParsing(false); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0]; if (file) processFile(file);
  }, [processFile]);

  const editExercise = (index: number, field: keyof ImportedExercise, value: string | number) => {
    setExercises((prev) => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
    if (currentIdx >= exercises.length - 1) setCurrentIdx(Math.max(0, exercises.length - 2));
  };

  const goNext = () => { if (currentIdx < exercises.length - 1) setCurrentIdx((i) => i + 1); else setStep("confirm"); };
  const goPrev = () => { if (currentIdx > 0) setCurrentIdx((i) => i - 1); };

  const handleSave = async () => {
    setIsSaving(true);
    try { await onConfirm(exercises); onClose(); }
    catch { setIsSaving(false); }
  };

  const isLastExercise = currentIdx === exercises.length - 1;
  const progress = exercises.length > 0 ? ((currentIdx + 1) / exercises.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center"><FileSpreadsheet size={17} className="text-emerald-400" /></div>
            <div>
              <h2 className="text-sm font-semibold text-white">{step === "upload" ? "Importar Excel" : step === "review" ? "Revisá los ejercicios" : "Confirmar import"}</h2>
              {step === "review" && <p className="text-xs text-gray-500">{exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""} encontrado{exercises.length !== 1 ? "s" : ""}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="flex items-center justify-center gap-2 py-3 shrink-0">
          <StepDot active={step === "upload"} done={step !== "upload"} />
          <StepDot active={step === "review"} done={step === "confirm"} />
          <StepDot active={step === "confirm"} done={false} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {step === "upload" && (
            <div className="space-y-4">
              <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${isDragging ? "border-emerald-500 bg-emerald-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/3"}`}>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
                {isParsing ? <Loader2 size={32} className="text-emerald-400 animate-spin" /> : <Upload size={32} className={isDragging ? "text-emerald-400" : "text-gray-500"} />}
                <div className="text-center">
                  <p className="text-sm font-medium text-white">{isParsing ? "Leyendo archivo..." : "Subí tu planilla"}</p>
                  <p className="text-xs text-gray-500 mt-1">{isParsing ? "Un momento" : "Arrastrá o tocá para seleccionar · .xlsx / .xls"}</p>
                </div>
              </div>
              {parseError && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" /><p className="text-xs text-red-400">{parseError}</p></div>}
              <div className="p-4 bg-white/3 rounded-2xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Formato esperado</p>
                <table className="text-xs text-gray-500 w-full">
                  <thead><tr className="text-gray-400"><th className="text-left py-1 pr-3 font-medium">ejercicio</th><th className="text-left py-1 pr-3 font-medium">series</th><th className="text-left py-1 pr-3 font-medium">repeticiones</th><th className="text-left py-1 pr-3 font-medium">descanso</th><th className="text-left py-1 font-medium">musculo</th></tr></thead>
                  <tbody>
                    <tr><td className="py-1 pr-3">Press banca</td><td className="py-1 pr-3">4</td><td className="py-1 pr-3">8-12</td><td className="py-1 pr-3">90</td><td className="py-1">Pecho</td></tr>
                    <tr><td className="py-1 pr-3">Sentadilla</td><td className="py-1 pr-3">4</td><td className="py-1 pr-3">10</td><td className="py-1 pr-3">120</td><td className="py-1">Piernas</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {step === "review" && (
            <div className="space-y-3">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
              <p className="text-xs text-gray-500 text-center">Revisando {currentIdx + 1} de {exercises.length}</p>
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="relative group">
                    <ExerciseCard exercise={ex} index={i} current={currentIdx} total={exercises.length} onEdit={(field, value) => editExercise(i, field, value)} />
                    {i !== currentIdx && <button onClick={() => removeExercise(i)} className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                <Check size={20} className="text-emerald-400 shrink-0" />
                <div><p className="text-sm font-semibold text-white">Todo listo para importar</p><p className="text-xs text-gray-400 mt-0.5">{exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""} se agregarán a tu rutina</p></div>
              </div>
              <div className="space-y-1">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3">
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><Dumbbell size={12} className="text-gray-400" /></div>
                    <p className="text-sm text-white flex-1 capitalize truncate">{ex.name}</p>
                    <span className="text-xs text-gray-500 shrink-0">{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setStep("review"); setCurrentIdx(exercises.length - 1); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <RotateCcw size={12} />Volver a editar
              </button>
            </div>
          )}
        </div>
        {step === "review" && (
          <div className="flex gap-2 px-5 py-4 border-t border-white/5 shrink-0">
            <button onClick={goPrev} disabled={currentIdx === 0} className="w-11 h-11 flex items-center justify-center rounded-xl border border-white/10 text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft size={18} /></button>
            <button onClick={goNext} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl">
              {isLastExercise ? <><Check size={15} />Finalizar revisión</> : <>Siguiente<ChevronRight size={15} /></>}
            </button>
          </div>
        )}
        {step === "confirm" && (
          <div className="px-5 py-4 border-t border-white/5 shrink-0">
            <button onClick={handleSave} disabled={isSaving || exercises.length === 0} className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
              {isSaving ? <><Loader2 size={15} className="animate-spin" />Importando...</> : <><FileSpreadsheet size={15} />Importar {exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}