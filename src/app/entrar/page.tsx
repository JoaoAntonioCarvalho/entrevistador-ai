'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { AuthForm } from '@/components/auth/AuthForm';
import { createClient } from '@/lib/services/supabase-client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function EntrarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('return') ?? '/historico';

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session) {
          router.push(returnUrl);
        }
      });
    return () => subscription.unsubscribe();
  }, [returnUrl, router]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
        Acesse sua conta
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Digite seu email e senha para continuar.
      </p>
      <AuthForm onSuccess={() => router.push(returnUrl)} />
    </div>
  );
}

export default function EntrarPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header backTo="/" backLabel="← Início" />
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      }>
        <EntrarContent />
      </Suspense>
    </div>
  );
}
