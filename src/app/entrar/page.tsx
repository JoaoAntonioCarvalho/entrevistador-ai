'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { AuthForm } from '@/components/auth/AuthForm';

function EntrarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('return') ?? '/historico';

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
        Entrar ou criar conta
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Acesse seu histórico de entrevistas e relatórios
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
