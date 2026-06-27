'use client'

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function CadastroContent() {
  const { signUp, signIn, signInWithGoogle, user } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const returnUrl    = searchParams.get('return') ?? '/historico';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (user) router.push(returnUrl);
  }, [user, router, returnUrl]);

  async function handleCadastro(e: React.FormEvent) {
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

    const { error } = await signUp(email.trim(), password);

    if (error) {
      const msg = error.message ?? '';
      if (
        msg.includes('already registered') ||
        msg.includes('already been registered') ||
        msg.includes('User already registered')
      ) {
        toast.error('Este email já tem cadastro.', { duration: 4000 });
        setTimeout(() => {
          router.push(`/entrar?return=${encodeURIComponent(returnUrl)}`);
        }, 1500);
      } else {
        toast.error(msg || 'Erro ao criar conta.');
      }
      setLoading(false);
      return;
    }

    const { error: loginError } = await signIn(email.trim(), password);

    setLoading(false);

    if (!loginError) {
      toast.success('Conta criada com sucesso!');
      router.push(returnUrl);
    } else {
      toast.success('Conta criada! Faça login para continuar.', { duration: 5000 });
      router.push(`/entrar?return=${encodeURIComponent(returnUrl)}`);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header backTo="/" backLabel="← Início" />
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">
            Criar conta grátis
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
            Já tem conta?{' '}
            <Link
              href={`/entrar?return=${encodeURIComponent(returnUrl)}`}
              className="text-zinc-900 dark:text-white font-medium underline underline-offset-2"
            >
              Entrar
            </Link>
          </p>

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
                       transition-colors mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-400">ou</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>

          <form onSubmit={handleCadastro} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu email"
              autoComplete="email"
              className="w-full border border-zinc-200 dark:border-zinc-700
                         rounded-xl px-4 py-3 text-base text-zinc-900
                         dark:text-white bg-white dark:bg-zinc-900
                         placeholder-zinc-400 focus:outline-none
                         focus:border-zinc-400 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Crie uma senha (mín. 6 caracteres)"
              autoComplete="new-password"
              className="w-full border border-zinc-200 dark:border-zinc-700
                         rounded-xl px-4 py-3 text-base text-zinc-900
                         dark:text-white bg-white dark:bg-zinc-900
                         placeholder-zinc-400 focus:outline-none
                         focus:border-zinc-400 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 dark:bg-white text-white
                         dark:text-zinc-900 py-3 rounded-full font-semibold
                         text-sm disabled:opacity-50 transition-colors
                         flex items-center justify-center gap-2
                         hover:bg-zinc-700 dark:hover:bg-zinc-100"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar conta
            </button>
          </form>

          <p className="text-xs text-center text-zinc-400 mt-4 leading-relaxed">
            Ao criar conta, você concorda com nossos{' '}
            <Link href="/termos" className="underline hover:text-zinc-600">
              Termos de Uso
            </Link>
            {' '}e{' '}
            <Link href="/privacidade" className="underline hover:text-zinc-600">
              Política de Privacidade
            </Link>.
          </p>

        </div>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroContent />
    </Suspense>
  );
}
