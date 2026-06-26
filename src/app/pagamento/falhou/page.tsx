'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Suspense } from 'react';

function PagamentoFalhouContent() {
  const router    = useRouter();
  const params    = useSearchParams();
  const sessionId = params.get('session') ?? '';

  const temSessao  = sessionId && sessionId !== 'null' && sessionId !== '';
  const voltarPara = temSessao
    ? `/interview?resume=true&sessionId=${sessionId}`
    : '/planos';

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center
                      min-h-[60vh] px-6 text-center max-w-sm mx-auto">

        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30
                        rounded-full flex items-center
                        justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24"
               fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round"
               className="text-red-600 dark:text-red-400">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Pagamento não concluído
        </h1>
        <p className="text-sm text-muted-fg leading-relaxed mb-8">
          Nenhum valor foi cobrado.
          {temSessao
            ? ' Sua entrevista ainda está salva — você pode tentar novamente.'
            : ' Você pode tentar novamente quando quiser.'
          }
        </p>

        <div className="flex flex-col gap-3 w-full">

          <button
            onClick={() => router.push(voltarPara)}
            className="w-full bg-foreground text-background
                       py-3 rounded-full font-medium text-sm
                       hover:opacity-90 transition-opacity"
          >
            {temSessao
              ? 'Voltar para minha entrevista'
              : 'Ver planos'
            }
          </button>

          <button
            onClick={() => router.push('/planos')}
            className="w-full border border-border text-muted-fg
                       py-3 rounded-full text-sm
                       hover:bg-muted transition-colors"
          >
            Ver outros planos
          </button>

        </div>

        <p className="text-xs text-muted-fg mt-6">
          Dúvidas? Email para{' '}
          <a href="mailto:suporte@entrevistador-ia.com.br"
             className="underline">
            suporte@entrevistador-ia.com.br
          </a>
        </p>

      </div>
    </div>
  );
}

export default function PagamentoFalhouPage() {
  return (
    <Suspense>
      <PagamentoFalhouContent />
    </Suspense>
  );
}
