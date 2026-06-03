'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getSupabaseClient } from '@/lib/supabase';
import { Brain, Send, Loader2, RefreshCw, User, Sparkles } from 'lucide-react';
import type { CoachMessage } from '@/types';
import { format } from 'date-fns';

const QUICK = [
  '¿Debo subir el peso?',
  '¿Suficiente proteína?',
  '¿Qué músculo entreno menos?',
  '¿Tengo fatiga?',
  '¿Cómo va mi progresión?',
];

export default function CoachPage() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  useEffect(() => { if (user) init(); }, [user]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function init() {
    const [workoutsRes, nutritionRes, bwRes] = await Promise.all([
      supabase.from('workouts').select('*, workout_exercises(*, exercise:exercises(name), workout_sets(*))').eq('user_id', user!.id).order('started_at', { ascending: false }).limit(8),
      supabase.from('nutrition_logs').select('*').eq('user_id', user!.id).eq('logged_date', new Date().toISOString().split('T')[0]),
      supabase.from('bodyweight').select('*').eq('user_id', user!.id).order('recorded_at', { ascending: false }).limit(3),
    ]);
    setContext({ workouts: workoutsRes.data || [], nutrition: nutritionRes.data || [], bw: bwRes.data || [], profile });
    setMessages([{
      id: '0', role: 'assistant',
      content: `¡Hola ${profile?.full_name?.split(' ')[0] || 'atleta'}! 💪 Soy tu coach IA. Tengo acceso a tu historial. ¿Qué querés saber?`,
      created_at: new Date().toISOString(),
    }]);
  }

  function buildCtx() {
    if (!context) return '';
    const last = context.workouts[0];
    const todayCal = context.nutrition.reduce((a: number, n: any) => a + n.calories, 0);
    const todayProt = context.nutrition.reduce((a: number, n: any) => a + n.protein_g, 0);
    return `Usuario: objetivo=${profile?.goal || 'no definido'}, peso=${context.bw[0]?.weight_kg || '?'}kg, meta cal=${profile?.target_calories}kcal, meta prot=${profile?.target_protein_g}g. Hoy: ${todayCal}kcal, ${Math.round(todayProt)}g proteína. Último entreno: "${last?.name || 'ninguno'}" (${last?.workout_exercises?.length || 0} ejercicios, ${last?.total_volume_kg || 0}kg volumen). Total entrenamientos recientes: ${context.workouts.length}.`;
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: CoachMessage = { id: Date.now().toString(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), context: buildCtx() }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.response || '...', created_at: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Error al conectar con la IA.', created_at: new Date().toISOString() }]);
    } finally { setLoading(false); }
  }

  return (
    // Full height flex column — header + messages + input
    <div className="flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100vh-7rem)] animate-fade-in">
      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="font-display font-bold text-2xl">Coach IA</h1>
          <p className="text-sm text-text-secondary mt-0.5">Análisis inteligente de tu progreso</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary/10 border border-accent-primary/20 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
            <span className="text-xs font-medium text-accent-primary">Claude AI</span>
          </div>
          <button onClick={() => { setMessages([]); init(); }} className="p-2 text-text-muted hover:text-text-primary" title="Nueva conversación">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-accent-primary/10' : 'bg-accent-green/10'}`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-accent-primary" />
                : <Brain className="w-4 h-4 text-accent-green" />
              }
            </div>
            <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent-primary text-white rounded-tr-sm'
                  : 'bg-bg-elevated border border-border-subtle text-text-primary rounded-tl-sm'
              }`}>
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                    {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                  </p>
                ))}
              </div>
              <span className="text-[10px] text-text-muted mt-1">{format(new Date(msg.created_at), 'HH:mm')}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-green/10 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-accent-green" />
            </div>
            <div className="bg-bg-elevated border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-accent-green rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick questions — show only at start */}
      {messages.length <= 1 && (
        <div className="flex gap-2 overflow-x-auto py-2 shrink-0">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)}
              className="px-3 py-2 bg-bg-elevated border border-border-subtle rounded-xl text-xs text-text-secondary whitespace-nowrap hover:border-accent-primary hover:text-text-primary transition-all shrink-0">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 pt-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="input flex-1"
          placeholder="Preguntale a tu coach..."
          disabled={loading}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="btn-primary px-4 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
