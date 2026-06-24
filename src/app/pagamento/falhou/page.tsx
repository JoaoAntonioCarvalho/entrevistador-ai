'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default function PagamentoFaLhouPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30
                        rounded-full flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round"
               className="text-red-600 dark:text-red-400">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          Pagamento não concluído
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8">
          Nenhum valor foi cobrado. Você pode tentar novamente.
        </p>
        <button
          onClick={() => router.push('/planos')}
          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
                     px-6 py-3 rounded-full font-medium text-sm
                     hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
