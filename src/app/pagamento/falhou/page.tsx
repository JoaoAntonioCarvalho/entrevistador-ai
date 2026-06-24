'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default function PagamentoFaLhouPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-[#fef2f2] rounded-xl flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round"
               className="text-[#dc2626]">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Pagamento não concluído
        </h1>
        <p className="text-muted-fg text-sm mb-8">
          Nenhum valor foi cobrado. Você pode tentar novamente.
        </p>
        <button
          onClick={() => router.push('/planos')}
          className="bg-foreground text-background px-6 py-3 rounded-lg
                     font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
