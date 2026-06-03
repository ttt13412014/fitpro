'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { Dumbbell, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        toast.success('¡Cuenta creada! Verificá tu email.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Ocurrió un error');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-bg-base flex items-end sm:items-center justify-center relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-accent-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-accent-green/6 rounded-full blur-3xl" />
      </div>

      {/* Card — full bottom sheet on mobile, centered on desktop */}
      <div className="
        relative z-10 w-full
        bg-bg-card rounded-t-3xl border-t border-border-subtle
        sm:max-w-md sm:rounded-3xl sm:border sm:mx-4 sm:mb-8
        p-6 pb-safe animate-slide-up
      ">
        {/* Handle (mobile) */}
        <div className="w-10 h-1 bg-border-default rounded-full mx-auto mb-6 sm:hidden" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 bg-accent-primary/10 border border-accent-primary/30 rounded-2xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-text-primary">FitPro</h1>
            <p className="text-xs text-text-muted">Tu coach personal</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-bg-base rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${mode === m ? 'bg-accent-primary text-white' : 'text-text-secondary'}`}>
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="animate-slide-up">
              <label className="label">Nombre completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Tu nombre" required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="tu@email.com" required />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pr-12" placeholder="••••••••" required minLength={6} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
