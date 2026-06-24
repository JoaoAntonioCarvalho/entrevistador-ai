'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function PendenteContent() {
  const router    = useRouter();
  const params    = useSearchParams();
  const sessionId = params.get('session') ?? '';

  return (
    <div className="flex flex-col items-center justify-center
                    min-h-[60vh] px-6 text-center max-w-sm mx-auto">

      <div className="w-16 h-16 bg-[#fffbeb] rounded-xl flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round"
             className="text-[#92400e]">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-3">
        Pagamento em processamento
      </h1>
      <p className="text-sm text-muted-fg leading-relaxed mb-8">
        Seu pagamento via Pix ou boleto está sendo processado.
        Assim que for confirmado, sua entrevista será liberada
        automaticamente. Isso pode levar alguns minutos.
      </p>

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={() => router.push(
            sessionId
              ? `/interview?resume=true&sessionId=${sessionId}`
              : '/setup'
          )}
          className="w-full bg-foreground text-background py-3 rounded-lg
                     font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Verificar e continuar entrevista
        </button>
        <Link href="/historico"
          className="w-full text-center text-sm text-muted-fg
                     hover:text-foreground py-2 transition-colors">
          Ver meu histórico
        </Link>
      </div>

    </div>
  );
}

export default function PagamentoPendentePage() {
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-border
                          border-t-foreground rounded-full animate-spin" />
        </div>
      }>
        <PendenteContent />
      </Suspense>
    </div>
  );
}
