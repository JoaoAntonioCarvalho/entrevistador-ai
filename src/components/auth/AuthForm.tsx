'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface AuthFormProps {
  onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Digite seu email.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    // PASSO 1: tentar login
    const loginResult = await signIn(email.trim(), password);

    // Login funcionou
    if (!loginResult.error) {
      toast.success('Bem-vindo de volta!');
      onSuccess?.();
      setLoading(false);
      return;
    }

    const errMsg = loginResult.error.message ?? '';

    // PASSO 2: se erro for de credencial inválida,
    // pode ser senha errada OU email não existe.
    // Tentar criar conta para descobrir qual é.
    if (
      errMsg.includes('Invalid login credentials') ||
      errMsg.includes('invalid_credentials')
    ) {
      const signupResult = await signUp(email.trim(), password);

      // Signup funcionou — conta criada
      if (!signupResult.error) {
        // Tentar login imediatamente após signup
        const loginAposSignup = await signIn(email.trim(), password);

        if (!loginAposSignup.error) {
          toast.success('Conta criada com sucesso!');
          onSuccess?.();
        } else {
          toast.success(
            'Conta criada! Faça login para continuar.',
            { duration: 5000 }
          );
        }
        setLoading(false);
        return;
      }

      // Signup falhou com "already registered"
      // → conta existe mas senha está errada
      if (
        signupResult.error.message?.includes('already registered') ||
        signupResult.error.message?.includes('already been registered') ||
        signupResult.error.message?.includes('User already registered')
      ) {
        toast.error('Senha incorreta. Tente novamente.');
        setLoading(false);
        return;
      }

      // Outro erro no signup
      toast.error(signupResult.error.message ?? 'Erro ao criar conta.');
      setLoading(false);
      return;
    }

    // Outros erros de login
    if (errMsg.includes('Email not confirmed')) {
      toast.error('Confirme seu email antes de fazer login.');
      setLoading(false);
      return;
    }

    toast.error('Erro ao fazer login. Tente novamente.');
    setLoading(false);
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

      {/* Formulário unificado */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Seu email"
            autoComplete="email"
            className="w-full border border-zinc-200 dark:border-zinc-700
                       rounded-xl px-4 py-3 text-base text-zinc-900
                       dark:text-white bg-white dark:bg-zinc-900
                       placeholder-zinc-400 dark:placeholder-zinc-500
                       focus:outline-none focus:border-zinc-400
                       dark:focus:border-zinc-500 transition-colors"
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Sua senha (mínimo 6 caracteres)"
            autoComplete="current-password"
            className="w-full border border-zinc-200 dark:border-zinc-700
                       rounded-xl px-4 py-3 text-base text-zinc-900
                       dark:text-white bg-white dark:bg-zinc-900
                       placeholder-zinc-400 dark:placeholder-zinc-500
                       focus:outline-none focus:border-zinc-400
                       dark:focus:border-zinc-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-zinc-900 dark:bg-white text-white
                     dark:text-zinc-900 py-3 rounded-full font-semibold
                     text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100
                     disabled:opacity-50 transition-colors
                     flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Entrando...' : 'Entrar / Criar conta'}
        </button>
      </form>

      <div className="flex gap-4 justify-center mt-2">
        <Link href="/entrar"
          className="text-xs text-zinc-500 hover:text-zinc-700
                     dark:hover:text-zinc-300 underline">
          Já tenho conta
        </Link>
        <Link href="/cadastro"
          className="text-xs text-zinc-500 hover:text-zinc-700
                     dark:hover:text-zinc-300 underline">
          Criar conta
        </Link>
      </div>

    </div>
  );
}
