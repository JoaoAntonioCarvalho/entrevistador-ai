'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';

function SucessoContent() {
  const router    = useRouter();
  const params    = useSearchParams();
  const plano     = params.get('plano');
  const sessionId = params.get('session');

  useEffect(() => {
    // Aguardar o webhook processar (~2s) antes de redirecionar
    const t = setTimeout(() => {
      if (sessionId && sessionId !== 'null' && plano === 'finalizar-atual') {
        router.push('/interview');
      } else {
        router.push('/setup');
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [router, plano, sessionId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30
                      rounded-full flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round"
             className="text-green-600 dark:text-green-400">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        Pagamento confirmado!
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
        Redirecionando em instantes...
      </p>
    </div>
  );
}

export default function PagamentoSucessoPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      }>
        <SucessoContent />
      </Suspense>
    </div>
  );
}
