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

      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30
                      rounded-full flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round"
             className="text-amber-600 dark:text-amber-400">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900
                     dark:text-white mb-3">
        Pagamento em processamento
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400
                    leading-relaxed mb-8">
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
          className="w-full bg-zinc-900 dark:bg-white text-white
                     dark:text-zinc-900 py-3 rounded-full font-medium
                     text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100
                     transition-colors"
        >
          Verificar e continuar entrevista
        </button>
        <Link href="/historico"
          className="w-full text-center text-sm text-zinc-500
                     dark:text-zinc-400 hover:text-zinc-700
                     dark:hover:text-zinc-200 py-2">
          Ver meu histórico
        </Link>
      </div>

    </div>
  );
}

export default function PagamentoPendentePage() {
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
        <PendenteContent />
      </Suspense>
    </div>
  );
}
