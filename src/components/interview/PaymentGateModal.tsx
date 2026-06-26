'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentGateModalProps {
  sessionId: string;
  onClose?:  () => void;
}

export function PaymentGateModal({
  sessionId,
  onClose,
}: PaymentGateModalProps) {
  const { user }  = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [tab, setTab]         = useState<'avulso' | 'mensal'>('avulso');

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
        body: JSON.stringify({
          plano,
          sessionId,
          authUserId: user.id,
        }),
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
    <div className="fixed inset-0 z-50 flex items-center
                    justify-center bg-black/80 backdrop-blur-sm
                    px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl
                      w-full max-w-md shadow-2xl border
                      border-zinc-100 dark:border-zinc-800
                      overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b
                        border-zinc-100 dark:border-zinc-800
                        flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-400
                          uppercase tracking-widest mb-1">
              Continue sua entrevista
            </p>
            <h2 className="text-xl font-bold text-zinc-900
                           dark:text-white leading-tight">
              Você usou suas perguntas gratuitas
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400
                          mt-1">
              Escolha como quer continuar
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600
                         dark:hover:text-zinc-300 transition-colors
                         shrink-0 ml-4 mt-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100
                        dark:border-zinc-800">
          <button
            onClick={() => setTab('avulso')}
            className={`flex-1 py-3 text-sm font-medium
                        transition-colors
                        ${tab === 'avulso'
                          ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                          : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                        }`}
          >
            Avulso
          </button>
          <button
            onClick={() => setTab('mensal')}
            className={`flex-1 py-3 text-sm font-medium
                        transition-colors relative
                        ${tab === 'mensal'
                          ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                          : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                        }`}
          >
            Plano mensal
            <span className="ml-1.5 inline-flex items-center
                             px-1.5 py-0.5 rounded text-[10px]
                             font-semibold bg-zinc-900
                             dark:bg-white text-white
                             dark:text-zinc-900">
              ECONOMIZE
            </span>
          </button>
        </div>

        {/* Conteúdo da tab Avulso */}
        {tab === 'avulso' && (
          <div className="p-6 space-y-3">

            {/* Card principal — Finalizar esta entrevista */}
            <div className="rounded-xl border-2 border-zinc-900
                            dark:border-white p-5 relative
                            overflow-hidden">

              {/* Badge de desconto */}
              <div className="absolute top-3 right-3">
                <span className="bg-zinc-900 dark:bg-white
                                 text-white dark:text-zinc-900
                                 text-[11px] font-bold px-2 py-1
                                 rounded-full">
                  -23% OFF
                </span>
              </div>

              <p className="text-xs font-semibold text-zinc-500
                            dark:text-zinc-400 uppercase
                            tracking-widest mb-2">
                Finalizar esta entrevista
              </p>

              {/* Preço com riscado */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-zinc-900
                                 dark:text-white">
                  R$9,90
                </span>
                <span className="text-base text-zinc-400
                                 line-through decoration-zinc-400">
                  R$12,90
                </span>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400
                            mb-4 leading-relaxed">
                Desconto por já estar com a entrevista em andamento.
                Continue de onde parou e receba o relatório completo.
              </p>

              <ul className="space-y-1.5 mb-5">
                {[
                  'Continua da pergunta onde parou',
                  'Relatório completo com nota e feedback',
                  'Análise por pergunta + resposta ideal',
                  'Resultado compartilhável por link',
                ].map(item => (
                  <li key={item}
                      className="flex items-center gap-2
                                 text-sm text-zinc-600
                                 dark:text-zinc-400">
                    <svg className="w-4 h-4 text-zinc-900
                                    dark:text-white shrink-0"
                         viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5"
                         strokeLinecap="round"
                         strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePagar('finalizar-atual')}
                disabled={loading !== null}
                className="w-full bg-zinc-900 dark:bg-white
                           text-white dark:text-zinc-900
                           py-3.5 rounded-full font-semibold
                           text-sm hover:bg-zinc-700
                           dark:hover:bg-zinc-100
                           disabled:opacity-50 transition-colors
                           flex items-center justify-center gap-2"
              >
                {loading === 'finalizar-atual' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Finalizar por R$9,90
              </button>
            </div>

            {/* Card secundário — Crédito 7 perguntas */}
            <div className="rounded-xl border border-zinc-200
                            dark:border-zinc-700 p-4 flex
                            items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-700
                              dark:text-zinc-300">
                  Nova entrevista de 7 perguntas
                </p>
                <p className="text-xs text-zinc-400
                              dark:text-zinc-500 mt-0.5">
                  Crédito válido para qualquer vaga
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-zinc-900
                              dark:text-white">
                  R$12,90
                </p>
                <button
                  onClick={() => handlePagar('credito-7')}
                  disabled={loading !== null}
                  className="text-xs text-zinc-500
                             dark:text-zinc-400 underline
                             hover:text-zinc-700
                             dark:hover:text-zinc-200
                             transition-colors mt-0.5"
                >
                  {loading === 'credito-7'
                    ? <Loader2 className="w-3 h-3 animate-spin inline" />
                    : 'Comprar'}
                </button>
              </div>
            </div>

            {/* Card secundário — Crédito 14 perguntas */}
            <div className="rounded-xl border border-zinc-200
                            dark:border-zinc-700 p-4 flex
                            items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-700
                              dark:text-zinc-300">
                  Nova entrevista de 14 perguntas
                </p>
                <p className="text-xs text-zinc-400
                              dark:text-zinc-500 mt-0.5">
                  Aprofundamento máximo
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-zinc-900
                              dark:text-white">
                  R$22,90
                </p>
                <button
                  onClick={() => handlePagar('credito-14')}
                  disabled={loading !== null}
                  className="text-xs text-zinc-500
                             dark:text-zinc-400 underline
                             hover:text-zinc-700
                             dark:hover:text-zinc-200
                             transition-colors mt-0.5"
                >
                  {loading === 'credito-14'
                    ? <Loader2 className="w-3 h-3 animate-spin inline" />
                    : 'Comprar'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Conteúdo da tab Mensal */}
        {tab === 'mensal' && (
          <div className="p-6 space-y-3">

            <p className="text-sm text-zinc-500 dark:text-zinc-400
                          mb-4">
              Pratique regularmente e evolua muito mais rápido.
              Cada entrevista sai por menos de R$7,00.
            </p>

            {/* Card Starter */}
            <div className="rounded-xl border border-zinc-200
                            dark:border-zinc-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-400
                                uppercase tracking-widest mb-1">
                    Starter
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-zinc-900
                                     dark:text-white">
                      R$39,90
                    </span>
                    <span className="text-sm text-zinc-400">/mês</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400
                                dark:text-zinc-500">
                    equivale a
                  </p>
                  <p className="text-sm font-semibold text-zinc-600
                                dark:text-zinc-300">
                    R$6,65/entrevista
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400
                            mb-4">
                6 entrevistas de 7 perguntas por mês
              </p>

              <button
                onClick={() => handlePagar('mensal-starter')}
                disabled={loading !== null}
                className="w-full border border-zinc-200
                           dark:border-zinc-700 text-zinc-700
                           dark:text-zinc-300 py-3 rounded-full
                           text-sm font-medium hover:bg-zinc-50
                           dark:hover:bg-zinc-800
                           disabled:opacity-50 transition-colors
                           flex items-center justify-center gap-2"
              >
                {loading === 'mensal-starter' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Assinar Starter
              </button>
            </div>

            {/* Card Pro — destaque */}
            <div className="rounded-xl border-2 border-zinc-900
                            dark:border-white p-5 relative">

              <div className="absolute -top-3 left-5">
                <span className="bg-zinc-900 dark:bg-white
                                 text-white dark:text-zinc-900
                                 text-[11px] font-bold px-3 py-1
                                 rounded-full">
                  RECOMENDADO
                </span>
              </div>

              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-400
                                uppercase tracking-widest mb-1">
                    Pro
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-zinc-900
                                     dark:text-white">
                      R$59,90
                    </span>
                    <span className="text-sm text-zinc-400">/mês</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400
                                dark:text-zinc-500">
                    equivale a
                  </p>
                  <p className="text-sm font-semibold text-zinc-600
                                dark:text-zinc-300">
                    R$9,98/entrevista
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400
                            mb-4">
                6 entrevistas de 14 perguntas por mês
                — aprofundamento máximo
              </p>

              <button
                onClick={() => handlePagar('mensal-pro')}
                disabled={loading !== null}
                className="w-full bg-zinc-900 dark:bg-white
                           text-white dark:text-zinc-900
                           py-3 rounded-full text-sm font-semibold
                           hover:bg-zinc-700 dark:hover:bg-zinc-100
                           disabled:opacity-50 transition-colors
                           flex items-center justify-center gap-2"
              >
                {loading === 'mensal-pro' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Assinar Pro
              </button>
            </div>

            {/* Nota de cancelamento */}
            <p className="text-xs text-center text-zinc-400
                          dark:text-zinc-500 pt-1">
              Cancele quando quiser · Sem fidelidade
            </p>

          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 pt-0">
          <p className="text-xs text-center text-zinc-400
                        dark:text-zinc-500">
            🔒 Pagamento seguro via Mercado Pago · Pix disponível
          </p>
        </div>

      </div>
    </div>
  );
}
