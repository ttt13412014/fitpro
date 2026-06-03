'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, Zap, Activity, ChevronDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

interface RepState {
  count: number;
  stage: 'UP' | 'DOWN';
  angle: number;
  feedback: string;
  feedbackColor: string;
}

// Ejercicios disponibles con sus articulaciones
const EXERCISES = [
  {
    id: 'curl',
    name: 'Curl de Bíceps',
    description: 'Flexión del codo (hombro → codo → muñeca)',
    joints: ['right_shoulder', 'right_elbow', 'right_wrist'],
    angleDown: 160,   // brazo extendido
    angleUp: 50,      // máxima contracción
    cueDown: 'Bajá el brazo completamente',
    cueUp: '¡Buena contracción! Bajá controlado',
    cuePartial: 'Estirá más el brazo al bajar',
  },
  {
    id: 'squat',
    name: 'Sentadilla',
    description: 'Flexión de rodilla (cadera → rodilla → tobillo)',
    joints: ['right_hip', 'right_knee', 'right_ankle'],
    angleDown: 90,
    angleUp: 160,
    cueDown: 'Bajá más, paralelo al piso',
    cueUp: '¡Rep contada! Volvé a bajar',
    cuePartial: 'Bajá más profundo',
  },
  {
    id: 'pushup',
    name: 'Flexiones',
    description: 'Flexión del codo (hombro → codo → muñeca)',
    joints: ['right_shoulder', 'right_elbow', 'right_wrist'],
    angleDown: 90,
    angleUp: 160,
    cueDown: 'Bajá el pecho al piso',
    cueUp: '¡Rep contada! Volvé a bajar',
    cuePartial: 'Extendé más los brazos',
  },
  {
    id: 'lateral_raise',
    name: 'Lateral Raise',
    description: 'Elevación lateral (cadera → hombro → codo)',
    joints: ['right_hip', 'right_shoulder', 'right_elbow'],
    angleDown: 20,
    angleUp: 80,
    cueDown: 'Bajá los brazos completamente',
    cueUp: '¡Rep contada! Bajá controlado',
    cuePartial: 'Subí más los codos',
  },
];

// ─── Lógica de ángulo (igual al código Dart original) ────────────────────────
function calcularAngulo(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const radianes = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angulo = Math.abs(radianes * 180.0 / Math.PI);
  if (angulo > 180.0) angulo = 360.0 - angulo;
  return angulo;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AnalyzerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const repStateRef = useRef<RepState>({ count: 0, stage: 'DOWN', angle: 0, feedback: 'Posicionate de perfil y empezá', feedbackColor: '#f0f0ff' });

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [repState, setRepState] = useState<RepState>(repStateRef.current);
  const [poseDetected, setPoseDetected] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // ── Cargar TF.js + MoveNet desde CDN ──
  async function loadModel() {
    if (detectorRef.current) return true;
    setLoading(true);
    try {
      // Cargar TensorFlow.js dinámicamente
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js');

      const tf = (window as any).tf;
      const poseDetection = (window as any).poseDetection;

      await tf.ready();

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        }
      );

      detectorRef.current = detector;
      setModelLoaded(true);
      return true;
    } catch (err) {
      console.error('Error cargando modelo:', err);
      toast.error('Error al cargar el modelo de IA');
      return false;
    } finally {
      setLoading(false);
    }
  }

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ── Iniciar cámara ──
  async function startCamera() {
    const ok = await loadModel();
    if (!ok) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startDetectionLoop();
      }
    } catch (err) {
      toast.error('No se pudo acceder a la cámara');
    }
  }

  // ── Detener cámara ──
  function stopCamera() {
    cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setPoseDetected(false);
    clearCanvas();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Loop de detección ──
  function startDetectionLoop() {
    async function detect() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = detectorRef.current;
      if (!video || !canvas || !detector || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const poses = await detector.estimatePoses(video);
        const ctx = canvas.getContext('2d')!;

        // Dibujar video espejado
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        if (poses.length > 0) {
          const keypoints: Keypoint[] = poses[0].keypoints;
          setPoseDetected(true);
          drawSkeleton(ctx, keypoints, canvas.width, canvas.height);
          processExercise(keypoints, canvas.width, canvas.height);
        } else {
          setPoseDetected(false);
          updateFeedback('No te detecto. Alejate un poco de la cámara.', '#f59e0b');
        }
      } catch (err) {
        // silencioso
      }

      animFrameRef.current = requestAnimationFrame(detect);
    }
    animFrameRef.current = requestAnimationFrame(detect);
  }

  // ── Procesar ejercicio (lógica del código Dart) ──
  function processExercise(keypoints: Keypoint[], w: number, h: number) {
    const ex = selectedExercise;
    const [nameA, nameB, nameC] = ex.joints;

    const kpA = keypoints.find(k => k.name === nameA);
    const kpB = keypoints.find(k => k.name === nameB);
    const kpC = keypoints.find(k => k.name === nameC);

    if (!kpA || !kpB || !kpC || kpA.score < 0.3 || kpB.score < 0.3 || kpC.score < 0.3) {
      updateFeedback('Mostrá el lado derecho del cuerpo', '#f59e0b');
      return;
    }

    // Los keypoints de MoveNet están normalizados 0-1, convertir a px
    const a = { x: kpA.x, y: kpA.y };
    const b = { x: kpB.x, y: kpB.y };
    const c = { x: kpC.x, y: kpC.y };

    const angulo = calcularAngulo(a, b, c);
    const state = repStateRef.current;

    let newState = { ...state, angle: Math.round(angulo) };

    // CASO 1: Contracción completa (UP)
    if (angulo < ex.angleUp && state.stage === 'DOWN') {
      newState.stage = 'UP';
      newState.count = state.count + 1;
      newState.feedback = ex.cueUp;
      newState.feedbackColor = '#22d3a5';
    }
    // CASO 2: Extensión completa (DOWN)
    else if (angulo > ex.angleDown && state.stage === 'UP') {
      newState.stage = 'DOWN';
      newState.feedback = ex.cueDown;
      newState.feedbackColor = '#3b82f6';
    }
    // CASO 3: Rango parcial
    else if (angulo > (ex.angleUp + ex.angleDown) / 2 && state.stage === 'UP') {
      newState.feedback = ex.cuePartial;
      newState.feedbackColor = '#f59e0b';
    }

    repStateRef.current = newState;
    setRepState({ ...newState });
  }

  function updateFeedback(msg: string, color: string) {
    repStateRef.current = { ...repStateRef.current, feedback: msg, feedbackColor: color };
    setRepState(s => ({ ...s, feedback: msg, feedbackColor: color }));
  }

  // ── Dibujar esqueleto ──
  function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: Keypoint[], w: number, h: number) {
    const CONNECTIONS = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
    ];

    const kpMap = new Map(keypoints.map(k => [k.name, k]));
    const [nameA, nameB, nameC] = selectedExercise.joints;
    const activeJoints = new Set([nameA, nameB, nameC]);

    // Líneas del esqueleto
    ctx.lineWidth = 2;
    for (const [a, b] of CONNECTIONS) {
      const ka = kpMap.get(a);
      const kb = kpMap.get(b);
      if (!ka || !kb || ka.score < 0.3 || kb.score < 0.3) continue;
      const isActive = activeJoints.has(a) || activeJoints.has(b);
      ctx.strokeStyle = isActive ? '#6c63ff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.beginPath();
      // Espejo horizontal
      ctx.moveTo(w - ka.x * w, ka.y * h);
      ctx.lineTo(w - kb.x * w, kb.y * h);
      ctx.stroke();
    }

    // Puntos
    for (const kp of keypoints) {
      if (kp.score < 0.3) continue;
      const isActive = activeJoints.has(kp.name);
      const px = w - kp.x * w;
      const py = kp.y * h;
      ctx.beginPath();
      ctx.arc(px, py, isActive ? 7 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isActive ? '#6c63ff' : 'rgba(255,255,255,0.6)';
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Ángulo sobre la articulación central
    const centerJoint = kpMap.get(selectedExercise.joints[1]);
    if (centerJoint && centerJoint.score > 0.3) {
      const px = w - centerJoint.x * w;
      const py = centerJoint.y * h;
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      const text = `${repStateRef.current.angle}°`;
      ctx.strokeText(text, px + 10, py - 10);
      ctx.fillText(text, px + 10, py - 10);
    }
  }

  function resetCount() {
    repStateRef.current = { count: 0, stage: 'DOWN', angle: 0, feedback: 'Contador reiniciado. Empezá.', feedbackColor: '#f0f0ff' };
    setRepState({ ...repStateRef.current });
  }

  async function flipCamera() {
    stopCamera();
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
  }

  useEffect(() => {
    if (facingMode && !cameraActive) return;
    if (cameraActive) { stopCamera(); setTimeout(startCamera, 300); }
  }, [facingMode]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const stagePct = repState.stage === 'UP'
    ? Math.min(100, 100 - ((repState.angle - selectedExercise.angleUp) / (selectedExercise.angleDown - selectedExercise.angleUp)) * 100)
    : Math.min(100, ((repState.angle - selectedExercise.angleUp) / (selectedExercise.angleDown - selectedExercise.angleUp)) * 100);

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Desktop title */}
      <div className="hidden lg:block">
        <h1 className="font-display font-bold text-2xl text-text-primary">Analizador de Repeticiones</h1>
        <p className="text-sm text-text-secondary mt-0.5">IA detecta tus movimientos en tiempo real</p>
      </div>

      {/* Exercise selector */}
      <div className="card">
        <button
          onClick={() => setShowExercisePicker(!showExercisePicker)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-primary/10 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-accent-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-text-primary">{selectedExercise.name}</p>
              <p className="text-xs text-text-muted">{selectedExercise.description}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showExercisePicker ? 'rotate-180' : ''}`} />
        </button>

        {showExercisePicker && (
          <div className="mt-3 space-y-1.5 animate-slide-up">
            {EXERCISES.map(ex => (
              <button
                key={ex.id}
                onClick={() => { setSelectedExercise(ex); setShowExercisePicker(false); resetCount(); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  selectedExercise.id === ex.id
                    ? 'bg-accent-primary/10 border border-accent-primary/30'
                    : 'hover:bg-bg-elevated'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{ex.name}</p>
                  <p className="text-xs text-text-muted">{ex.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Camera + canvas */}
      <div className="relative rounded-2xl overflow-hidden bg-bg-card border border-border-subtle aspect-[3/4] lg:aspect-video">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {/* Placeholder when camera off */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg-card">
            <div className="w-20 h-20 bg-accent-primary/10 rounded-3xl flex items-center justify-center">
              <Camera className="w-10 h-10 text-accent-primary" />
            </div>
            <div className="text-center px-6">
              <p className="font-display font-bold text-lg text-text-primary">Cámara apagada</p>
              <p className="text-sm text-text-muted mt-1">
                Activá la cámara para que la IA detecte tus movimientos
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-accent-primary text-sm">
                <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                Cargando modelo IA...
              </div>
            )}
          </div>
        )}

        {/* Pose detection indicator */}
        {cameraActive && (
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            poseDetected ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-yellow/20 text-accent-yellow'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${poseDetected ? 'bg-accent-green animate-pulse' : 'bg-accent-yellow'}`} />
            {poseDetected ? 'Pose detectada' : 'Buscando...'}
          </div>
        )}

        {/* Flip camera button */}
        {cameraActive && (
          <button
            onClick={flipCamera}
            className="absolute top-3 right-3 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Angle arc overlay */}
        {cameraActive && poseDetected && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/70 font-mono">ROM</span>
                <span className="text-[10px] text-white/70 font-mono">{repState.angle}°</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${Math.min(100, (repState.angle / 180) * 100)}%`,
                    background: repState.feedbackColor,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rep counter + feedback */}
      <div className="grid grid-cols-2 gap-3">
        {/* Rep counter */}
        <div className="card text-center py-5">
          <p className="text-6xl font-bold font-display text-accent-primary leading-none">{repState.count}</p>
          <p className="text-xs text-text-muted mt-2">repeticiones</p>
          <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            repState.stage === 'UP' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-blue/10 text-accent-blue'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${repState.stage === 'UP' ? 'bg-accent-green' : 'bg-accent-blue'}`} />
            {repState.stage === 'UP' ? 'Contraído' : 'Extendido'}
          </div>
        </div>

        {/* Feedback */}
        <div className="card flex flex-col justify-between py-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: repState.feedbackColor + '20' }}>
            <Zap className="w-4 h-4" style={{ color: repState.feedbackColor }} />
          </div>
          <p className="text-sm font-medium leading-snug" style={{ color: repState.feedbackColor }}>
            {repState.feedback}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={cameraActive ? stopCamera : startCamera}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
            cameraActive
              ? 'bg-accent-red/10 border border-accent-red/30 text-accent-red'
              : 'btn-primary'
          }`}
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Cargando IA...</>
          ) : cameraActive ? (
            <><CameraOff className="w-4 h-4" /> Apagar cámara</>
          ) : (
            <><Camera className="w-4 h-4" /> Activar cámara</>
          )}
        </button>

        <button
          onClick={resetCount}
          className="btn-secondary px-4 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Tips */}
      <div className="card bg-accent-primary/5 border-accent-primary/20">
        <div className="flex gap-3">
          <Info className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-accent-primary">Consejos para mejor detección</p>
            <ul className="text-xs text-text-secondary space-y-0.5">
              <li>• Posicioná el celu de perfil (lado derecho visible)</li>
              <li>• Buena iluminación, preferentemente de frente</li>
              <li>• Que todo el cuerpo entre en el encuadre</li>
              <li>• Ropa ajustada mejora la detección</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
