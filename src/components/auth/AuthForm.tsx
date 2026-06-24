'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthFormProps {
  onSuccess?: () => void;
  defaultMode?: 'login' | 'signup';
}

export function AuthForm({ onSuccess, defaultMode = 'signup' }: AuthFormProps) {
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [mode, setMode]         = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error('Email válido e senha com no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email.trim(), password);
      setLoading(false);

      if (error) {
        toast.error(
          error.message.includes('already registered')
            ? 'Este email já tem cadastro. Tente fazer login.'
            : 'Erro ao criar conta. Tente novamente.'
        );
        return;
      }

      toast.success(
        'Conta criada! Verifique seu email para confirmar o cadastro.',
        { duration: 6000 }
      );
      return;
    }

    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      toast.error(
        error.message.includes('Invalid login')
          ? 'Email ou senha incorretos.'
          : error.message.includes('Email not confirmed')
          ? 'Confirme seu email antes de fazer login.'
          : 'Erro ao fazer login. Tente novamente.'
      );
      return;
    }

    toast.success('Login realizado!');
    onSuccess?.();
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Botão Google */}
      <button
        type="button"
        onClick={async () => {
          const { error } = await signInWithGoogle();
          if (error) toast.error('Erro ao conectar com Google.');
        }}
        className="w-full flex items-center justify-center gap-3
                   border border-zinc-200 dark:border-zinc-700
                   rounded-full py-3 text-sm font-medium
                   text-zinc-700 dark:text-zinc-300
                   hover:bg-zinc-50 dark:hover:bg-zinc-800
                   transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4"
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05"
            d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
          <path fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
        </svg>
        Continuar com Google
      </button>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-xs text-zinc-400">ou</span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
      </div>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mt-1 w-full border border-zinc-200 dark:border-zinc-700
                     rounded-lg px-3 py-2.5 text-base text-zinc-900
                     dark:text-white bg-white dark:bg-zinc-900
                     focus:outline-none focus:border-zinc-400"
          placeholder="voce@email.com"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mt-1 w-full border border-zinc-200 dark:border-zinc-700
                     rounded-lg px-3 py-2.5 text-base text-zinc-900
                     dark:text-white bg-white dark:bg-zinc-900
                     focus:outline-none focus:border-zinc-400"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-zinc-900 dark:bg-white text-white
                   dark:text-zinc-900 py-3 rounded-full font-medium
                   text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100
                   disabled:opacity-50 transition-colors
                   flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === 'signup' ? 'Criar conta' : 'Entrar'}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
        className="w-full text-xs text-zinc-500 dark:text-zinc-400
                   hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        {mode === 'signup'
          ? 'Já tem conta? Entrar'
          : 'Não tem conta? Criar agora'}
      </button>
    </form>
    </div>
  );
}
