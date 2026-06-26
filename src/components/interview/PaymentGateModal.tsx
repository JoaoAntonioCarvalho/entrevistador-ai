'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface PaymentGateModalProps {
  onClose?:  () => void;
  sessionId: string;
}

export function PaymentGateModal({ sessionId }: PaymentGateModalProps) {
  const { user }   = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePagar(plano: string) {
    if (!user) {
      localStorage.setItem('pending-interview-session', sessionId);
      window.location.href = `/entrar?return=/interview&requirePayment=true`;
      return;
    }

    setLoading(plano);
    try {
      const res = await fetch('/api/mp-criar-preferencia', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano, sessionId, authUserId: user.id }),
      });

      const data = await res.json();

      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        toast.error('Erro ao iniciar pagamento. Tente novamente.');
        setLoading(null);
      }
    } catch {
      toast.error('Erro ao iniciar pagamento. Tente novamente.');
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/75 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-sm
                      w-full shadow-2xl border border-zinc-100
                      dark:border-zinc-800">

        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl
                        flex items-center justify-center mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round"
               className="text-zinc-700 dark:text-zinc-300">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
          Continue sua entrevista
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          Você usou suas perguntas gratuitas. Para continuar esta entrevista
          e ver seu resultado completo, escolha uma opção abaixo.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handlePagar('finalizar-atual')}
            disabled={loading !== null}
            className="w-full bg-zinc-900 dark:bg-white text-white
                       dark:text-zinc-900 py-3.5 rounded-full font-semibold
                       text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100
                       disabled:opacity-50 transition-colors flex items-center
                       justify-center gap-2"
          >
            {loading === 'finalizar-atual' && (
              <div className="w-4 h-4 border-2 border-white/30
                              border-t-white rounded-full animate-spin" />
            )}
            Finalizar esta entrevista — R$9,90
          </button>

          <button
            onClick={() => { window.location.href = '/planos'; }}
            disabled={loading !== null}
            className="w-full border border-zinc-200 dark:border-zinc-700
                       text-zinc-600 dark:text-zinc-400 py-3 rounded-full
                       text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800
                       disabled:opacity-50 transition-colors"
          >
            Ver todos os planos
          </button>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-4">
          Pagamento seguro via Mercado Pago · Pix disponível
        </p>

      </div>
    </div>
  );
}
