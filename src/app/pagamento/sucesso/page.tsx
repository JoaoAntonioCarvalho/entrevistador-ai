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
  const sessionId = params.get('session') ?? '';
  const [status, setStatus] = useState<Status>('aguardando');

  useEffect(() => {
    const temSessaoEmAndamento = !!sessionId && sessionId !== 'null';

    if (!temSessaoEmAndamento) {
      // Compra feita fora de uma entrevista em andamento (ex: via /planos)
      // — não há para onde voltar, ir para setup
      setTimeout(() => router.push('/setup'), 2500);
      return;
    }

    // Há uma entrevista em andamento — não importa o plano comprado
    // (finalizar-atual, credito-7 ou credito-14), o destino é sempre
    // voltar para ESSA sessão.
    let tentativas = 0;
    const MAX = 10;
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
            router.push(`/interview?resume=true&sessionId=${sessionId}&paid=true`);
          }, 1500);
          return;
        }
      } catch { /* silencioso */ }

      if (tentativas >= MAX) {
        setStatus('timeout');
        setTimeout(() => {
          router.push(`/interview?resume=true&sessionId=${sessionId}&paid=true`);
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
          <div className="w-12 h-12 border-2 border-border
                          border-t-foreground rounded-full animate-spin mb-6" />
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Confirmando pagamento...
          </h1>
          <p className="text-sm text-muted-fg">
            Em instantes você volta para sua entrevista.
          </p>
        </>
      )}

      {status === 'confirmado' && (
        <>
          <div className="w-16 h-16 bg-[#f0fdf4] rounded-xl flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round"
                 className="text-[#16a34a]">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Pagamento confirmado!
          </h1>
          <p className="text-sm text-muted-fg">
            Voltando para sua entrevista...
          </p>
        </>
      )}

      {status === 'timeout' && (
        <>
          <div className="w-16 h-16 bg-[#fffbeb] rounded-xl flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round"
                 className="text-[#92400e]">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Pagamento recebido
          </h1>
          <p className="text-sm text-muted-fg">
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
    <div className="min-h-dvh bg-background">
      <Header />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-border
                          border-t-foreground rounded-full animate-spin" />
        </div>
      }>
        <SucessoContent />
      </Suspense>
    </div>
  );
}
