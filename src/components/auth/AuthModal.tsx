'use client'

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface AuthModalProps {
  isOpen:                  boolean;
  onClose:                 () => void;
  onSuccess?:              () => void;
  motivo?:                 string;
  returnTo?:               string;
  onBeforeRedirectToAuth?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  motivo,
  returnTo,
  onBeforeRedirectToAuth,
}: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [modo,     setModo]     = useState<'login' | 'cadastro'>('cadastro');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Digite seu email.');
      return;
    }
    if (password.length < 6) {
      toast.error('Senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    if (modo === 'cadastro') {
      const { error } = await signUp(email.trim(), password);

      if (error) {
        const msg = error.message ?? '';
        if (msg.includes('already registered') ||
            msg.includes('User already registered')) {
          toast.error('Este email já tem cadastro.');
          setModo('login');
          setLoading(false);
          return;
        }
        toast.error(msg || 'Erro ao criar conta.');
        setLoading(false);
        return;
      }

      const { error: loginErr } = await signIn(email.trim(), password);
      setLoading(false);

      if (!loginErr) {
        toast.success('Conta criada! Bem-vindo!');
        onSuccess?.();
        onClose();
      } else {
        toast.success('Conta criada! Faça login para continuar.');
        setModo('login');
      }
      return;
    }

    // Modo login
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('Invalid login credentials') ||
          msg.includes('invalid_credentials')) {
        toast.error('Email ou senha incorretos.');
      } else {
        toast.error('Erro ao fazer login.');
      }
      return;
    }

    toast.success('Bem-vindo de volta!');
    onSuccess?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/60 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm
                      shadow-2xl border border-zinc-100 dark:border-zinc-800
                      overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100
                        dark:border-zinc-800 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-7 h-7 flex items-center
                       justify-center rounded-full hover:bg-zinc-100
                       dark:hover:bg-zinc-800 text-zinc-400
                       hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 bg-zinc-950 dark:bg-white rounded-xl
                          flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="white" className="dark:stroke-zinc-900"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          {motivo && (
            <p className="text-xs font-semibold text-zinc-400 uppercase
                          tracking-widest mb-1">
              {motivo}
            </p>
          )}

          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {modo === 'cadastro' ? 'Crie sua conta grátis' : 'Entrar na conta'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {modo === 'cadastro'
              ? 'Rápido, gratuito e sem cartão de crédito.'
              : 'Acesse suas entrevistas e créditos.'}
          </p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-3">

          <button
            type="button"
            onClick={async () => {
              onBeforeRedirectToAuth?.();
              const { error } = await signInWithGoogle(returnTo);
              if (error) toast.error('Erro ao conectar com Google.');
            }}
            className="w-full flex items-center justify-center gap-3
                       border border-zinc-200 dark:border-zinc-700
                       rounded-full py-2.5 text-sm font-medium
                       text-zinc-700 dark:text-zinc-300
                       hover:bg-zinc-50 dark:hover:bg-zinc-800
                       transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-400">ou</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu email"
              autoComplete="email"
              className="w-full border border-zinc-200 dark:border-zinc-700
                         rounded-xl px-4 py-2.5 text-base text-zinc-900
                         dark:text-white bg-white dark:bg-zinc-900
                         placeholder-zinc-400 focus:outline-none
                         focus:border-zinc-400 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={modo === 'cadastro'
                ? 'Crie uma senha (mín. 6 caracteres)'
                : 'Sua senha'}
              autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
              className="w-full border border-zinc-200 dark:border-zinc-700
                         rounded-xl px-4 py-2.5 text-base text-zinc-900
                         dark:text-white bg-white dark:bg-zinc-900
                         placeholder-zinc-400 focus:outline-none
                         focus:border-zinc-400 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 dark:bg-white text-white
                         dark:text-zinc-900 py-2.5 rounded-full font-semibold
                         text-sm disabled:opacity-50 transition-colors
                         flex items-center justify-center gap-2
                         hover:bg-zinc-700 dark:hover:bg-zinc-100"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {modo === 'cadastro' ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setModo(modo === 'cadastro' ? 'login' : 'cadastro')}
            className="w-full text-xs text-zinc-400 hover:text-zinc-600
                       dark:hover:text-zinc-300 transition-colors py-1"
          >
            {modo === 'cadastro'
              ? 'Já tem conta? Entrar'
              : 'Não tem conta? Criar grátis'}
          </button>

        </div>

        {/* Footer */}
        {modo === 'cadastro' && (
          <div className="px-6 pb-5 -mt-2">
            <p className="text-[11px] text-center text-zinc-400 leading-relaxed">
              Ao criar conta, você concorda com os{' '}
              <Link href="/termos" onClick={onClose}
                className="underline hover:text-zinc-600">
                Termos de Uso
              </Link>
              {' '}e a{' '}
              <Link href="/privacidade" onClick={onClose}
                className="underline hover:text-zinc-600">
                Política de Privacidade
              </Link>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
