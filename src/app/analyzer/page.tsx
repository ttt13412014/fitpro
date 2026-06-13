"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera, Square, RotateCcw, CheckCircle, Save,
  Loader2, Sun, Info, AlertTriangle, Activity
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────
interface Keypoint {
  x: number; y: number; score: number; name: string;
}

type Phase = "idle" | "calibrating" | "running" | "done";

interface ExerciseConfig {
  id: string; label: string; emoji: string;
  angleJoints: [string, string, string];
  upThreshold: number; downThreshold: number;
  cues: string[];
  requiredKeypoints: string[];
  trailKeypoint: string;
  feedbackRules: FeedbackRule[];
}

interface FeedbackRule {
  check: (kpMap: Record<string, Keypoint>, angle: number, phase: "up" | "down") => boolean;
  message: string;
  severity: "warning" | "tip";
}

interface TrailPoint {
  x: number; y: number; t: number; phase: "up" | "down" | "neutral";
}

// ─── Exercise library ─────────────────────────────────────────
const EXERCISES: ExerciseConfig[] = [
  {
    id: "curl",
    label: "Curl de bíceps",
    emoji: "💪",
    angleJoints: ["left_shoulder", "left_elbow", "left_wrist"],
    upThreshold: 60,
    downThreshold: 150,
    cues: ["Codo pegado al cuerpo", "Movimiento controlado", "Aprieta arriba"],
    requiredKeypoints: ["left_shoulder", "left_elbow", "left_wrist"],
    trailKeypoint: "left_wrist",
    feedbackRules: [
      {
        check: (kp, angle, phase) => {
          const shoulder = kp["left_shoulder"];
          const elbow = kp["left_elbow"];
          if (!shoulder || !elbow) return false;
          return Math.abs(shoulder.x - elbow.x) > 60;
        },
        message: "Pegá el codo al cuerpo",
        severity: "warning",
      },
      {
        check: (kp, angle, phase) => phase === "up" && angle > 50,
        message: "Subí más el codo",
        severity: "tip",
      },
    ],
  },
  {
    id: "squat",
    label: "Sentadilla",
    emoji: "🦵",
    angleJoints: ["left_hip", "left_knee", "left_ankle"],
    upThreshold: 160,
    downThreshold: 100,
    cues: ["Rodillas sobre pies", "Espalda recta", "Baja hasta 90°"],
    requiredKeypoints: ["left_hip", "left_knee", "left_ankle"],
    trailKeypoint: "left_knee",
    feedbackRules: [
      {
        check: (kp, angle, phase) => phase === "down" && angle > 110,
        message: "Bajá más — llegá a 90°",
        severity: "tip",
      },
      {
        check: (kp, angle) => {
          const knee = kp["left_knee"];
          const ankle = kp["left_ankle"];
          if (!knee || !ankle) return false;
          return knee.x < ankle.x - 40;
        },
        message: "Rodilla sobre el pie",
        severity: "warning",
      },
    ],
  },
  {
    id: "pushup",
    label: "Flexiones",
    emoji: "🔥",
    angleJoints: ["left_shoulder", "left_elbow", "left_wrist"],
    upThreshold: 155,
    downThreshold: 90,
    cues: ["Cuerpo en línea recta", "Codos 45°", "Pecho al suelo"],
    requiredKeypoints: ["left_shoulder", "left_elbow", "left_wrist"],
    trailKeypoint: "left_wrist",
    feedbackRules: [
      {
        check: (kp, angle, phase) => phase === "down" && angle > 100,
        message: "Bajá más el pecho",
        severity: "tip",
      },
    ],
  },
  {
    id: "lateral",
    label: "Elevación lateral",
    emoji: "🏋️",
    angleJoints: ["left_hip", "left_shoulder", "left_elbow"],
    upThreshold: 70,
    downThreshold: 20,
    cues: ["Brazos al nivel del hombro", "Leve flexión de codo", "Bajar lento"],
    requiredKeypoints: ["left_hip", "left_shoulder", "left_elbow"],
    trailKeypoint: "left_wrist",
    feedbackRules: [
      {
        check: (kp, angle, phase) => phase === "up" && angle < 60,
        message: "Subí más los brazos",
        severity: "tip",
      },
    ],
  },
];

const TRAIL_MAX_AGE = 2000;
const TRAIL_MAX_POINTS = 150;
const PHASE_COLOR = {
  up: [52, 211, 153] as [number, number, number],
  down: [167, 139, 250] as [number, number, number],
  neutral: [148, 163, 184] as [number, number, number],
};

const SKELETON_CONNECTIONS: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["left_ear", "left_eye"],
  ["right_ear", "right_eye"],
  ["left_eye", "nose"],
  ["right_eye", "nose"],
];

// ─── Geometry ─────────────────────────────────────────────────
function getAngle(a: Keypoint, vertex: Keypoint, b: Keypoint): number {
  const radians =
    Math.atan2(b.y - vertex.y, b.x - vertex.x) -
    Math.atan2(a.y - vertex.y, a.x - vertex.x);
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

// ─── Canvas drawing ───────────────────────────────────────────
function drawFrame(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  trail: TrailPoint[],
  now: number,
  W: number,
  H: number,
  scaleX: number,
  scaleY: number,
  phase: "running" | "calibrating",
  currentAngle: number | null,
  repPhase: "up" | "down",
) {
  ctx.clearRect(0, 0, W, H);
  const kpMap = keypointMap(keypoints);

  // Draw skeleton connections
  SKELETON_CONNECTIONS.forEach(([a, b]) => {
    const kpA = kpMap[a], kpB = kpMap[b];
    if (!kpA || !kpB || kpA.score < 0.3 || kpB.score < 0.3) return;

    // Color based on confidence
    const conf = Math.min(kpA.score, kpB.score);
    const alpha = 0.4 + conf * 0.5;
    ctx.strokeStyle = `rgba(52,211,153,${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(kpA.x * scaleX, kpA.y * scaleY);
    ctx.lineTo(kpB.x * scaleX, kpB.y * scaleY);
    ctx.stroke();
  });

  // Draw joint dots
  keypoints.forEach((kp) => {
    if (kp.score < 0.25) return;
    const x = kp.x * scaleX, y = kp.y * scaleY;
    const radius = kp.score > 0.7 ? 5 : 3.5;

    // Glow
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = kp.score > 0.7
      ? "rgba(52,211,153,0.2)"
      : "rgba(251,191,36,0.15)";
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = kp.score > 0.7 ? "#34d399" : "#fbbf24";
    ctx.fill();
  });

  // Draw trail (only when running)
  if (phase === "running" && trail.length > 1) {
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1], curr = trail[i];
      const age = now - curr.t;
      const alpha = Math.max(0, 1 - age / TRAIL_MAX_AGE);
      if (alpha < 0.02) continue;
      const [r, g, b] = PHASE_COLOR[curr.phase] ?? PHASE_COLOR.neutral;
      const lw = 2 + (i / trail.length) * 8;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    // Glowing tip
    if (trail.length > 0) {
      const tip = trail[trail.length - 1];
      const ta = Math.max(0, 1 - (now - tip.t) / TRAIL_MAX_AGE);
      const [r, g, b] = PHASE_COLOR[tip.phase] ?? PHASE_COLOR.neutral;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${ta * 0.2})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${ta})`;
      ctx.fill();
    }
  }

  // Draw angle arc on the vertex joint (when running)
  if (phase === "running" && currentAngle !== null) {
    // Find the vertex keypoint of the current exercise (drawn elsewhere)
    // Just draw angle text near center of canvas as overlay handled in JSX
  }
}

// ─── Calibration overlay ──────────────────────────────────────
function CalibrationGuide({
  visibility, exercise, onStart,
}: {
  visibility: number; exercise: ExerciseConfig; onStart: () => void;
}) {
  const good = visibility >= 0.55;
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-4 px-4">
      <div className="w-full bg-black/85 backdrop-blur-md rounded-3xl p-5 space-y-4 border border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${good ? "bg-emerald-400" : "bg-amber-400"}`} />
          <p className="text-sm font-semibold text-white">
            {good ? "Posición detectada ✓" : "Ajustá tu posición"}
          </p>
          <span className="ml-auto text-xs text-gray-400">{Math.round(visibility * 100)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${good ? "bg-emerald-400" : "bg-amber-400"}`}
            style={{ width: `${visibility * 100}%` }}
          />
        </div>
        {!good ? (
          <ul className="space-y-1.5">
            {["Alejate 1.5–2m de la cámara", "Iluminación frontal buena", "Cuerpo entero visible"].map((tip, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-1">
            {exercise.cues.map((cue, i) => (
              <p key={i} className="text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle size={11} />{cue}
              </p>
            ))}
          </div>
        )}
        <button
          onClick={onStart}
          disabled={!good}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-gray-500 text-white text-sm font-bold rounded-2xl transition-all"
        >
          {good ? `Empezar ${exercise.label}` : "Esperando posición..."}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function AnalyzerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<unknown>(null);
  const animFrameRef = useRef<number>(0);
  const repStateRef = useRef<"up" | "down">("up");
  const trailRef = useRef<TrailPoint[]>([]);
  const lastFeedbackRef = useRef<string>("");
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig>(EXERCISES[0]);
  const [repCount, setRepCount] = useState(0);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [visibility, setVisibility] = useState(0);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lightWarning, setLightWarning] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; severity: "warning" | "tip" } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 640, h: 480 });

  // ── Camera ──
  const initCamera = useCallback(async () => {
    const constraints = {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await new Promise<void>((resolve, reject) => {
        videoRef.current!.onloadedmetadata = () => {
          videoRef.current!.play().then(resolve).catch(reject);
        };
        videoRef.current!.onerror = reject;
      });
      setCanvasSize({
        w: videoRef.current.videoWidth || 640,
        h: videoRef.current.videoHeight || 480,
      });
    }
  }, []);

  // ── Model ──
  const loadModel = useCallback(async () => {
    setIsLoadingModel(true);
    try {
      // Load TF with WebGL backend for mobile performance
      const tf = await import("@tensorflow/tfjs");
      
      // Try WebGL first, fall back to CPU
      try {
        await tf.setBackend("webgl");
      } catch {
        await tf.setBackend("cpu");
      }
      await tf.ready();

      const poseDetection = await import("@tensorflow-models/pose-detection");
      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.2,
        }
      );
    } finally {
      setIsLoadingModel(false);
    }
  }, []);

  const handleStart = useCallback(async () => {
    setModelError(null);
    setIsLoadingModel(true);
    setPhase("calibrating"); // Show camera container first
    try {
      await new Promise(r => setTimeout(r, 100)); // Let DOM render
      await initCamera();
      if (!detectorRef.current) await loadModel();
    } catch (err) {
      setModelError((err as Error).message);
      setPhase("idle");
    } finally {
      setIsLoadingModel(false);
    }
  }, [initCamera, loadModel]);

  // ── Detection loop ──
  const detectLoop = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const now = Date.now();

    const scaleX = canvas.width / (video.videoWidth || 640);
    const scaleY = canvas.height / (video.videoHeight || 480);

    const detector = detectorRef.current as {
      estimatePoses: (v: HTMLVideoElement, opts?: object) => Promise<{ keypoints: Keypoint[]; score?: number }[]>;
    };

    try {
      const poses = await detector.estimatePoses(video, { flipHorizontal: false });

      if (poses.length > 0 && poses[0].keypoints) {
        const kpMap = keypointMap(poses[0].keypoints);
        const ex = selectedExercise;

        const vis = visibilityScore(kpMap, ex.requiredKeypoints);
        setVisibility(vis);
        setLightWarning(vis < 0.3);

        // Angle calculation
        const [aName, vName, bName] = ex.angleJoints;
        const a = kpMap[aName], v = kpMap[vName], b = kpMap[bName];

        let angle: number | null = null;
        if (a?.score > 0.25 && v?.score > 0.25 && b?.score > 0.25) {
          angle = getAngle(a, v, b);
          setCurrentAngle(Math.round(angle));

          if (phase === "running") {
            const state = repStateRef.current;
            if (state === "up" && angle < ex.downThreshold) {
              repStateRef.current = "down";
            } else if (state === "down" && angle > ex.upThreshold) {
              repStateRef.current = "up";
              setRepCount((c) => c + 1);
            }

            // Form feedback
            for (const rule of ex.feedbackRules) {
              if (rule.check(kpMap, angle, repStateRef.current)) {
                if (lastFeedbackRef.current !== rule.message) {
                  lastFeedbackRef.current = rule.message;
                  setFeedback({ message: rule.message, severity: rule.severity });
                  if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
                  feedbackTimerRef.current = setTimeout(() => {
                    setFeedback(null);
                    lastFeedbackRef.current = "";
                  }, 2500);
                }
                break;
              }
            }
          }
        }

        // Trail
        if (phase === "running") {
          const trailKp = kpMap[ex.trailKeypoint];
          if (trailKp && trailKp.score > 0.25) {
            trailRef.current.push({
              x: trailKp.x * scaleX,
              y: trailKp.y * scaleY,
              t: now,
              phase: repStateRef.current,
            });
            if (trailRef.current.length > TRAIL_MAX_POINTS) trailRef.current.shift();
          }
          trailRef.current = trailRef.current.filter((p) => now - p.t < TRAIL_MAX_AGE);
        }

        // Draw
        drawFrame(
          ctx,
          poses[0].keypoints,
          trailRef.current,
          now,
          canvas.width,
          canvas.height,
          scaleX,
          scaleY,
          phase as "running" | "calibrating",
          angle,
          repStateRef.current,
        );
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // Silent frame error
    }

    animFrameRef.current = requestAnimationFrame(detectLoop);
  }, [phase, selectedExercise]);

  useEffect(() => {
    if (phase === "calibrating" || phase === "running") {
      animFrameRef.current = requestAnimationFrame(detectLoop);
    }
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
      await supabase.from("workout_sets").insert({
        user_id: user.id,
        exercise_name: selectedExercise.label,
        reps: repCount,
        source: "analyzer",
        created_at: new Date().toISOString(),
      });
      toast.success(`${repCount} reps guardadas ✓`);
      handleReset();
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setPhase("idle");
    setRepCount(0);
    setCurrentAngle(null);
    setVisibility(0);
    setFeedback(null);
    repStateRef.current = "up";
    trailRef.current = [];
    lastFeedbackRef.current = "";
  };

  useEffect(() => () => { stopCamera(); if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); }, [stopCamera]);

  const angleColor = currentAngle !== null
    ? currentAngle < 60 ? "#34d399"
    : currentAngle < 120 ? "#fbbf24"
    : "#f87171"
    : "#fff";

  // ─── UI ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display">IA Reps</h1>
          <p className="text-xs text-text-muted">Detección de movimiento en tiempo real</p>
        </div>
        {phase !== "idle" && (
          <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary px-3 py-2 rounded-xl hover:bg-bg-card transition-colors">
            <RotateCcw size={13} />Reiniciar
          </button>
        )}
      </div>

      {/* IDLE */}
      {phase === "idle" && (
        <div className="px-4 space-y-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Ejercicio</p>
          <div className="grid grid-cols-2 gap-2">
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  selectedExercise.id === ex.id
                    ? "border-accent-primary/50 bg-accent-primary/10"
                    : "border-border-subtle bg-bg-card hover:bg-bg-card/80"
                }`}
              >
                <span className="text-2xl">{ex.emoji}</span>
                <span className="text-sm font-medium text-text-primary">{ex.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 bg-bg-card rounded-2xl border border-border-subtle">
            <Info size={14} className="text-text-muted mt-0.5 shrink-0" />
            <div className="text-xs text-text-muted space-y-1">
              <p>Alejate 1.5m de la cámara con buena iluminación.</p>
              <p>El esqueleto se traza sobre tu cuerpo en tiempo real.</p>
            </div>
          </div>

          {modelError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">{modelError}</p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={isLoadingModel}
            className="w-full flex items-center justify-center gap-2 py-4 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-60 text-white font-bold rounded-2xl transition-all"
          >
            {isLoadingModel ? (
              <><Loader2 size={18} className="animate-spin" />Cargando modelo IA...</>
            ) : (
              <><Camera size={18} />Activar cámara</>
            )}
          </button>
        </div>
      )}

      {/* CAMERA VIEW */}
      {(phase === "calibrating" || phase === "running" || phase === "done") && (
        <div className="flex-1 flex flex-col px-3 gap-3">
          {/* Camera */}
          <div className="relative rounded-3xl overflow-hidden bg-black" style={{ aspectRatio: "3/4", maxHeight: "58vh" }}>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 1, transform: "scaleX(-1)" }}
              muted playsInline autoPlay
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full" style={{ zIndex: 2, opacity: 1 }}
              width={canvasSize.w}
              height={canvasSize.h}
            />

            {/* Angle display */}
            {currentAngle !== null && phase === "running" && (
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-2xl px-3 py-2 min-w-[70px]">
                <p className="text-[10px] text-gray-400 mb-0.5">Ángulo</p>
                <p className="text-xl font-black leading-none" style={{ color: angleColor }}>
                  {currentAngle}°
                </p>
                <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${Math.min(100, (currentAngle / 180) * 100)}%`,
                      backgroundColor: angleColor,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Rep counter */}
            {phase === "running" && (
              <div className="absolute top-3 right-3 bg-accent-primary/90 backdrop-blur-sm rounded-2xl px-4 py-2 text-center min-w-[60px]">
                <p className="text-3xl font-black text-white leading-none">{repCount}</p>
                <p className="text-[10px] text-white/80 mt-0.5">reps</p>
              </div>
            )}

            {/* Phase indicator */}
            {phase === "running" && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  style={{
                    background: repStateRef.current === "up"
                      ? "rgba(52,211,153,0.9)"
                      : "rgba(167,139,250,0.9)",
                    color: "white",
                  }}
                >
                  <Activity size={11} />
                  {repStateRef.current === "up" ? "Subida" : "Bajada"}
                </div>
              </div>
            )}

            {/* Trail legend */}
            {phase === "running" && (
              <div className="absolute bottom-3 right-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 bg-black/60 rounded-lg px-2 py-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] text-white/70">Subida</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/60 rounded-lg px-2 py-1">
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-[9px] text-white/70">Bajada</span>
                </div>
              </div>
            )}

            {/* Light warning */}
            {lightWarning && phase === "running" && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-500/90 px-3 py-2 rounded-xl">
                <Sun size={13} className="text-white" />
                <p className="text-xs text-white font-medium">Mejorá la iluminación</p>
              </div>
            )}

            {/* Form feedback */}
            {feedback && phase === "running" && (
              <div
                className={`absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-xs font-semibold text-white backdrop-blur-sm flex items-center gap-2 ${
                  feedback.severity === "warning"
                    ? "bg-red-500/85"
                    : "bg-blue-500/85"
                }`}
              >
                {feedback.severity === "warning" ? "⚠️" : "💡"} {feedback.message}
              </div>
            )}

            {/* Calibration overlay */}
            {phase === "calibrating" && (
              <CalibrationGuide
                visibility={visibility}
                exercise={selectedExercise}
                onStart={() => {
                  repStateRef.current = "up";
                  setRepCount(0);
                  trailRef.current = [];
                  setPhase("running");
                }}
              />
            )}
          </div>

          {/* Controls */}
          {phase === "running" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPhase("done")}
                className="flex items-center justify-center gap-2 py-4 bg-bg-card hover:bg-bg-card/80 border border-border-default rounded-2xl text-sm font-semibold text-text-primary transition-colors"
              >
                <Square size={16} />Terminar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || repCount === 0}
                className="flex items-center justify-center gap-2 py-4 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-40 rounded-2xl text-sm font-semibold text-white transition-all"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar ({repCount})
              </button>
            </div>
          )}

          {/* Done */}
          {phase === "done" && (
            <div className="space-y-3">
              <div className="p-5 bg-accent-primary/10 border border-accent-primary/25 rounded-2xl text-center">
                <p className="text-5xl font-black text-accent-primary mb-1">{repCount}</p>
                <p className="text-sm text-text-muted">reps de {selectedExercise.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 py-3.5 bg-bg-card hover:bg-bg-card/80 rounded-2xl text-sm font-semibold text-text-primary border border-border-default transition-colors"
                >
                  <RotateCcw size={15} />Nueva serie
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || repCount === 0}
                  className="flex items-center justify-center gap-2 py-3.5 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-40 rounded-2xl text-sm font-semibold text-white transition-all"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
