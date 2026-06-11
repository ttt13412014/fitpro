"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Square, RotateCcw, CheckCircle, Save, Loader2, Sun, Info, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase";

interface Keypoint { x: number; y: number; score: number; name: string; }
type Phase = "idle" | "calibrating" | "ready" | "running" | "done";

interface ExerciseConfig {
  id: string; label: string; emoji: string;
  angleJoints: [string, string, string];
  upThreshold: number; downThreshold: number;
  cues: string[]; requiredKeypoints: string[];
  trailKeypoint: string;
}

interface TrailPoint { x: number; y: number; t: number; phase: "up" | "down" | "neutral"; }

const EXERCISES: ExerciseConfig[] = [
  { id: "curl", label: "Curl de bíceps", emoji: "💪", angleJoints: ["left_shoulder","left_elbow","left_wrist"], upThreshold: 60, downThreshold: 150, cues: ["Codo pegado al cuerpo","Movimiento controlado","Aprieta arriba"], requiredKeypoints: ["left_shoulder","left_elbow","left_wrist"], trailKeypoint: "left_wrist" },
  { id: "squat", label: "Sentadilla", emoji: "🦵", angleJoints: ["left_hip","left_knee","left_ankle"], upThreshold: 160, downThreshold: 100, cues: ["Rodillas sobre pies","Espalda recta","Baja hasta 90°"], requiredKeypoints: ["left_hip","left_knee","left_ankle"], trailKeypoint: "left_knee" },
  { id: "pushup", label: "Flexiones", emoji: "🔥", angleJoints: ["left_shoulder","left_elbow","left_wrist"], upThreshold: 155, downThreshold: 90, cues: ["Cuerpo en línea recta","Codos 45°","Pecho al suelo"], requiredKeypoints: ["left_shoulder","left_elbow","left_wrist"], trailKeypoint: "left_wrist" },
  { id: "lateral", label: "Elevación lateral", emoji: "🏋️", angleJoints: ["left_hip","left_shoulder","left_elbow"], upThreshold: 70, downThreshold: 20, cues: ["Brazos al nivel del hombro","Leve flexión de codo","Bajar lento"], requiredKeypoints: ["left_hip","left_shoulder","left_elbow"], trailKeypoint: "left_wrist" },
];

const TRAIL_MAX_AGE = 1800;
const TRAIL_MAX_POINTS = 120;

function getAngle(a: Keypoint, vertex: Keypoint, b: Keypoint): number {
  const radians = Math.atan2(b.y - vertex.y, b.x - vertex.x) - Math.atan2(a.y - vertex.y, a.x - vertex.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function keypointMap(keypoints: Keypoint[]): Record<string, Keypoint> {
  return Object.fromEntries(keypoints.map((kp) => [kp.name, kp]));
}

function visibilityScore(kpMap: Record<string, Keypoint>, names: string[]): number {
  const scores = names.map((n) => kpMap[n]?.score ?? 0);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function CalibrationGuide({ visibility, exercise, onStart }: { visibility: number; exercise: ExerciseConfig; onStart: () => void; }) {
  const good = visibility >= 0.6;
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-6 px-4">
      <div className="w-full max-w-sm bg-black/80 backdrop-blur-md rounded-3xl p-5 space-y-4 border border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${good ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
          <p className="text-sm font-semibold text-white">{good ? "Posición detectada" : "Ajustá tu posición"}</p>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Detección corporal</span><span>{Math.round(visibility * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${good ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${visibility * 100}%` }} />
          </div>
        </div>
        {!good && (
          <ul className="space-y-1.5">
            {["Alejate 1.5-2m de la cámara","Asegurate de tener buena luz frontal","Tu cuerpo entero debe verse en pantalla"].map((tip, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">{i + 1}</span>{tip}
              </li>
            ))}
          </ul>
        )}
        {good && (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-400 font-medium">Claves para {exercise.label}:</p>
            {exercise.cues.map((cue, i) => (
              <p key={i} className="text-xs text-emerald-300 flex items-center gap-2"><CheckCircle size={12} />{cue}</p>
            ))}
          </div>
        )}
        <button onClick={onStart} disabled={!good}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-gray-500 text-white text-sm font-bold rounded-2xl transition-all">
          {good ? `Empezar ${exercise.label}` : "Esperando posición..."}
        </button>
      </div>
    </div>
  );
}

export default function AnalyzerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<unknown>(null);
  const animFrameRef = useRef<number>(0);
  const repStateRef = useRef<"up" | "down">("up");
  const lastAngleRef = useRef<number>(0);
  const trailRef = useRef<TrailPoint[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig>(EXERCISES[0]);
  const [repCount, setRepCount] = useState(0);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [visibility, setVisibility] = useState(0);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lightWarning, setLightWarning] = useState(false);

  const initCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
  }, []);

  const loadModel = useCallback(async () => {
    setIsLoadingModel(true);
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const poseDetection = await import("@tensorflow-models/pose-detection");
      detectorRef.current = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING, enableSmoothing: true });
    } finally { setIsLoadingModel(false); }
  }, []);

  const handleStart = useCallback(async () => {
    setPhase("idle"); setIsLoadingModel(true);
    try {
      await initCamera();
      if (!detectorRef.current) await loadModel();
      setPhase("calibrating");
    } catch (err) { setModelError((err as Error).message); }
    finally { setIsLoadingModel(false); }
  }, [initCamera, loadModel]);

  const detectLoop = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const detector = detectorRef.current as { estimatePoses: (input: HTMLVideoElement) => Promise<{ keypoints: Keypoint[] }[]> };
    try {
      const poses = await detector.estimatePoses(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (poses.length > 0) {
        const kpMap = keypointMap(poses[0].keypoints);
        const ex = selectedExercise;
        const vis = visibilityScore(kpMap, ex.requiredKeypoints);
        setVisibility(vis); setLightWarning(vis < 0.35);
        drawSkeleton(ctx, poses[0].keypoints, canvas.width, canvas.height);
        const [aName, vertexName, bName] = ex.angleJoints;
        const a = kpMap[aName], v = kpMap[vertexName], b = kpMap[bName];
        if (a?.score > 0.3 && v?.score > 0.3 && b?.score > 0.3) {
          const angle = getAngle(a, v, b);
          lastAngleRef.current = angle; setCurrentAngle(Math.round(angle));
          if (phase === "running") {
            const state = repStateRef.current;
            if (state === "up" && angle < ex.downThreshold) repStateRef.current = "down";
            else if (state === "down" && angle > ex.upThreshold) { repStateRef.current = "up"; setRepCount((c) => c + 1); }
          }
        }
        if (phase === "running") {
          const trailKp = kpMap[ex.trailKeypoint];
          if (trailKp && trailKp.score > 0.3) {
            trailRef.current.push({ x: trailKp.x * (canvas.width / 640), y: trailKp.y * (canvas.height / 480), t: Date.now(), phase: repStateRef.current });
            if (trailRef.current.length > TRAIL_MAX_POINTS) trailRef.current.shift();
          }
          const now = Date.now();
          trailRef.current = trailRef.current.filter((p) => now - p.t < TRAIL_MAX_AGE);
          drawTrail(ctx, trailRef.current, now);
        }
      }
    } catch { }
    animFrameRef.current = requestAnimationFrame(detectLoop);
  }, [phase, selectedExercise]);

  useEffect(() => {
    if (phase === "calibrating" || phase === "running") animFrameRef.current = requestAnimationFrame(detectLoop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [phase, detectLoop]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleSave = async () => {
    if (repCount === 0) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      await supabase.from("workout_sets").insert({ user_id: user.id, exercise_name: selectedExercise.label, reps: repCount, source: "analyzer", created_at: new Date().toISOString() });
      toast.success(`${repCount} reps de ${selectedExercise.label} guardadas ✓`);
      handleReset();
    } catch { toast.error("No se pudo guardar"); }
    finally { setIsSaving(false); }
  };

  const handleReset = () => {
    stopCamera(); setPhase("idle"); setRepCount(0); setCurrentAngle(null);
    setVisibility(0); repStateRef.current = "up"; trailRef.current = [];
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div><h1 className="text-lg font-bold">Analizador</h1><p className="text-xs text-gray-500">Detección de movimiento con cámara</p></div>
        {phase !== "idle" && <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5"><RotateCcw size={13} />Reiniciar</button>}
      </div>

      {phase === "idle" && (
        <div className="px-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ejercicio</p>
            <div className="grid grid-cols-2 gap-2">
              {EXERCISES.map((ex) => (
                <button key={ex.id} onClick={() => setSelectedExercise(ex)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${selectedExercise.id === ex.id ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/3 hover:bg-white/5"}`}>
                  <span className="text-2xl">{ex.emoji}</span>
                  <span className="text-sm font-medium text-white">{ex.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white/3 rounded-2xl">
            <Info size={14} className="text-gray-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-500">Necesitás buena iluminación y al menos 1.5m de distancia de la cámara. Las reps detectadas se guardan en tu historial.</p>
          </div>
          {modelError && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" /><p className="text-xs text-red-400">{modelError}</p></div>}
          <button onClick={handleStart} disabled={isLoadingModel}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-bold rounded-2xl">
            {isLoadingModel ? <><Loader2 size={18} className="animate-spin" />Cargando modelo...</> : <><Camera size={18} />Activar cámara</>}
          </button>
        </div>
      )}

      {(phase === "calibrating" || phase === "running" || phase === "done") && (
        <div className="flex-1 flex flex-col px-4 gap-4">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] max-h-[55vh] w-full">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1]" width={640} height={480} />
            {currentAngle !== null && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                <p className="text-xs text-gray-400">Ángulo</p>
                <p className="text-lg font-bold text-white">{currentAngle}°</p>
              </div>
            )}
            {phase === "running" && (
              <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
                <p className="text-3xl font-black text-white leading-none">{repCount}</p>
                <p className="text-xs text-emerald-100">reps</p>
              </div>
            )}
            {lightWarning && phase === "running" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-500/90 px-3 py-2 rounded-xl">
                <Sun size={14} className="text-white" /><p className="text-xs text-white font-medium">Mejorá la iluminación</p>
              </div>
            )}
            {phase === "calibrating" && (
              <CalibrationGuide visibility={visibility} exercise={selectedExercise}
                onStart={() => { repStateRef.current = "up"; setRepCount(0); setPhase("running"); }} />
            )}
          </div>

          {phase === "running" && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPhase("done")} className="flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-semibold text-white">
                <Square size={16} />Terminar
              </button>
              <button onClick={handleSave} disabled={isSaving || repCount === 0} className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 rounded-2xl text-sm font-semibold text-white">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Guardar ({repCount})
              </button>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                <p className="text-4xl font-black text-emerald-400 mb-1">{repCount}</p>
                <p className="text-sm text-gray-400">reps de {selectedExercise.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleReset} className="flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-semibold text-white border border-white/10">
                  <RotateCcw size={15} />Nueva serie
                </button>
                <button onClick={handleSave} disabled={isSaving || repCount === 0} className="flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 rounded-2xl text-sm font-semibold text-white">
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], now: number) {
  if (trail.length < 2) return;
  const PHASE_COLOR: Record<string, [number, number, number]> = { up: [52,211,153], down: [167,139,250], neutral: [148,163,184] };
  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i-1], curr = trail[i];
    const alpha = Math.max(0, 1 - (now - curr.t) / TRAIL_MAX_AGE);
    if (alpha < 0.02) continue;
    const [r,g,b] = PHASE_COLOR[curr.phase] ?? PHASE_COLOR.neutral;
    ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 2 + (i / trail.length) * 6;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  }
  const tip = trail[trail.length-1];
  const tipAlpha = Math.max(0, 1 - (now - tip.t) / TRAIL_MAX_AGE);
  const [r,g,b] = PHASE_COLOR[tip.phase] ?? PHASE_COLOR.neutral;
  ctx.beginPath(); ctx.arc(tip.x, tip.y, 10, 0, Math.PI*2);
  ctx.fillStyle = `rgba(${r},${g},${b},${tipAlpha*0.25})`; ctx.fill();
  ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI*2);
  ctx.fillStyle = `rgba(${r},${g},${b},${tipAlpha})`; ctx.fill();
}

function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: Keypoint[], w: number, h: number) {
  const CONNECTIONS: [string,string][] = [["left_shoulder","right_shoulder"],["left_shoulder","left_elbow"],["left_elbow","left_wrist"],["right_shoulder","right_elbow"],["right_elbow","right_wrist"],["left_shoulder","left_hip"],["right_shoulder","right_hip"],["left_hip","right_hip"],["left_hip","left_knee"],["left_knee","left_ankle"],["right_hip","right_knee"],["right_knee","right_ankle"]];
  const kpMap = keypointMap(keypoints);
  ctx.strokeStyle = "rgba(52,211,153,0.7)"; ctx.lineWidth = 2;
  CONNECTIONS.forEach(([a,b]) => {
    const kpA = kpMap[a], kpB = kpMap[b];
    if (!kpA || !kpB || kpA.score < 0.3 || kpB.score < 0.3) return;
    ctx.beginPath(); ctx.moveTo(kpA.x*(w/640), kpA.y*(h/480)); ctx.lineTo(kpB.x*(w/640), kpB.y*(h/480)); ctx.stroke();
  });
  keypoints.forEach((kp) => {
    if (kp.score < 0.3) return;
    ctx.fillStyle = kp.score > 0.7 ? "#34d399" : "#fbbf24";
    ctx.beginPath(); ctx.arc(kp.x*(w/640), kp.y*(h/480), 4, 0, Math.PI*2); ctx.fill();
  });
}