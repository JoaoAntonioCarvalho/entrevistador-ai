'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';

export const dynamic = 'force-dynamic';

type Status = 'aguardando' | 'confirmado' | 'timeout';

function SucessoContent() {
  const router    = useRouter();
  const params    = useSearchParams();
  const { user }  = useAuth();
  const plano     = params.get('plano')   ?? '';
  const sessionId = params.get('session') ?? '';
  const [status, setStatus] = useState<Status>('aguardando');

  useEffect(() => {
    const isFinalizarAtual =
      plano === 'finalizar-atual' && sessionId && sessionId !== 'null';

    if (!isFinalizarAtual) {
      // Compra de crédito novo — ir para setup
      setTimeout(() => router.push('/setup'), 2500);
      return;
    }

    // Finalizar entrevista atual — fazer polling até confirmar
    let tentativas = 0;
    const MAX = 10; // 10 × 2s = 20s máximo
    let cancelled = false;

    async function checarPagamento() {
      if (cancelled) return;
      tentativas++;

      try {
        const res  = await fetch('/api/credits/check', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authUserId: user?.id ?? null,
            sessionId,
          }),
        });
        const data = await res.json() as { hasCredit: boolean };

        if (data.hasCredit) {
          setStatus('confirmado');
          setTimeout(() => {
            router.push(`/interview?resume=true&sessionId=${sessionId}`);
          }, 1500);
          return;
        }
      } catch { /* silencioso */ }

      if (tentativas >= MAX) {
        setStatus('timeout');
        setTimeout(() => {
          router.push(`/interview?resume=true&sessionId=${sessionId}`);
        }, 2000);
        return;
      }

      setTimeout(checarPagamento, 2000);
    }

    const initialTimer = setTimeout(checarPagamento, 1000);
    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="flex flex-col items-center justify-center
                    min-h-[60vh] px-6 text-center">

      {status === 'aguardando' && (
        <>
          <div className="w-12 h-12 border-2 border-zinc-300
                          border-t-zinc-900 dark:border-t-white
                          rounded-full animate-spin mb-6" />
          <h1 className="text-xl font-semibold text-zinc-900
                         dark:text-white mb-2">
            Confirmando pagamento...
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Em instantes você volta para sua entrevista.
          </p>
        </>
      )}

      {status === 'confirmado' && (
        <>
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30
                          rounded-full flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round"
                 className="text-green-600 dark:text-green-400">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900
                         dark:text-white mb-2">
            Pagamento confirmado!
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Voltando para sua entrevista...
          </p>
        </>
      )}

      {status === 'timeout' && (
        <>
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30
                          rounded-full flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round"
                 className="text-amber-600 dark:text-amber-400">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900
                         dark:text-white mb-2">
            Pagamento recebido
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Confirmação em processamento.
            Voltando para sua entrevista...
          </p>
        </>
      )}

    </div>
  );
}

export default function PagamentoSucessoPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-zinc-300
                          border-t-zinc-900 dark:border-t-white
                          rounded-full animate-spin" />
        </div>
      }>
        <SucessoContent />
      </Suspense>
    </div>
  );
}
