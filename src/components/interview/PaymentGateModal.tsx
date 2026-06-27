'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, X, Check } from 'lucide-react';
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
      window.location.href =
        `/entrar?return=/interview?resume=true%26sessionId=${sessionId}`;
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
        toast.error('Erro ao iniciar pagamento.');
        setLoading(null);
      }
    } catch {
      toast.error('Erro ao iniciar pagamento.');
      setLoading(null);
    }
  }

  const features7 = [
    'Continua de onde parou',
    'Nota e feedback completo',
    'Resposta ideal por pergunta',
    'Link compartilhável',
  ];

  const features14 = [
    'Entrevista aprofundada',
    'Nota e feedback completo',
    'Resposta ideal por pergunta',
    'Link compartilhável',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center
                    justify-center bg-black/70 backdrop-blur-sm
                    px-4 py-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl
                      w-full max-w-lg shadow-2xl border
                      border-zinc-100 dark:border-zinc-800
                      flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header compacto */}
        <div className="px-5 pt-5 pb-3 flex items-start
                        justify-between shrink-0">
          <div>
            <p className="text-[10px] font-semibold tracking-widest
                          uppercase text-zinc-400 mb-0.5">
              Continue sua entrevista
            </p>
            <h2 className="text-base font-bold text-zinc-900
                           dark:text-white">
              Você usou suas perguntas gratuitas
            </h2>
          </div>
          {onClose && (
            <button onClick={onClose}
                    className="text-zinc-300 hover:text-zinc-500
                               dark:text-zinc-600 dark:hover:text-zinc-400
                               transition-colors ml-3 shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100
                        dark:border-zinc-800 px-5 shrink-0">
          {(['avulso', 'mensal'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 mr-5 text-sm font-medium
                          border-b-2 transition-colors
                          ${tab === t
                            ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                            : 'border-transparent text-zinc-400 hover:text-zinc-600'
                          }`}
            >
              {t === 'avulso' ? 'Avulso' : 'Plano mensal'}
              {t === 'mensal' && (
                <span className="ml-1.5 text-[9px] font-bold
                                 bg-zinc-900 dark:bg-white
                                 text-white dark:text-zinc-900
                                 px-1.5 py-0.5 rounded-full">
                  SAVE
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto flex-1 p-4">

          {/* ABA AVULSO */}
          {tab === 'avulso' && (
            <div className="grid grid-cols-3 gap-3">

              {/* Card principal — Finalizar */}
              <div className="col-span-3 sm:col-span-1
                              border-2 border-zinc-900 dark:border-white
                              rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold tracking-widest
                                uppercase text-zinc-500">
                    Finalizar esta
                  </p>
                  <span className="text-[10px] font-bold bg-zinc-900
                                   dark:bg-white text-white dark:text-zinc-900
                                   px-1.5 py-0.5 rounded-full">
                    -23%
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-2xl font-bold text-zinc-900
                                   dark:text-white">
                    R$9,90
                  </span>
                  <span className="text-xs text-zinc-400 line-through">
                    R$12,90
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3">
                  7 perguntas · com desconto
                </p>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {features7.map(f => (
                    <li key={f}
                        className="flex items-center gap-1.5
                                   text-[11px] text-zinc-600
                                   dark:text-zinc-400">
                      <Check className="w-3 h-3 text-zinc-900
                                        dark:text-white shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePagar('finalizar-atual')}
                  disabled={loading !== null}
                  className="w-full bg-zinc-900 dark:bg-white
                             text-white dark:text-zinc-900 py-2.5
                             rounded-full text-xs font-semibold
                             hover:bg-zinc-700 dark:hover:bg-zinc-100
                             disabled:opacity-50 transition-colors
                             flex items-center justify-center gap-1.5"
                >
                  {loading === 'finalizar-atual' && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  Finalizar por R$9,90
                </button>
              </div>

              {/* Card 7 perguntas */}
              <div className="col-span-3 sm:col-span-1
                              border border-zinc-200 dark:border-zinc-700
                              rounded-xl p-4 flex flex-col">
                <p className="text-[10px] font-semibold tracking-widest
                              uppercase text-zinc-400 mb-3">
                  Nova entrevista
                </p>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-xl font-bold text-zinc-900
                                   dark:text-white">
                    R$12,90
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3">
                  7 perguntas
                </p>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {features7.map(f => (
                    <li key={f}
                        className="flex items-center gap-1.5
                                   text-[11px] text-zinc-500
                                   dark:text-zinc-400">
                      <Check className="w-3 h-3 text-zinc-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePagar('credito-7')}
                  disabled={loading !== null}
                  className="w-full border border-zinc-200
                             dark:border-zinc-700 text-zinc-700
                             dark:text-zinc-300 py-2.5 rounded-full
                             text-xs font-medium hover:bg-zinc-50
                             dark:hover:bg-zinc-800 disabled:opacity-50
                             transition-colors flex items-center
                             justify-center gap-1.5"
                >
                  {loading === 'credito-7' && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  Comprar
                </button>
              </div>

              {/* Card 14 perguntas */}
              <div className="col-span-3 sm:col-span-1
                              border border-zinc-200 dark:border-zinc-700
                              rounded-xl p-4 flex flex-col">
                <p className="text-[10px] font-semibold tracking-widest
                              uppercase text-zinc-400 mb-3">
                  Nova entrevista
                </p>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-xl font-bold text-zinc-900
                                   dark:text-white">
                    R$22,90
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3">
                  14 perguntas
                </p>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {features14.map(f => (
                    <li key={f}
                        className="flex items-center gap-1.5
                                   text-[11px] text-zinc-500
                                   dark:text-zinc-400">
                      <Check className="w-3 h-3 text-zinc-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePagar('credito-14')}
                  disabled={loading !== null}
                  className="w-full border border-zinc-200
                             dark:border-zinc-700 text-zinc-700
                             dark:text-zinc-300 py-2.5 rounded-full
                             text-xs font-medium hover:bg-zinc-50
                             dark:hover:bg-zinc-800 disabled:opacity-50
                             transition-colors flex items-center
                             justify-center gap-1.5"
                >
                  {loading === 'credito-14' && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  Comprar
                </button>
              </div>

            </div>
          )}

          {/* ABA MENSAL */}
          {tab === 'mensal' && (
            <div className="space-y-3">

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Pratique todo mês e evolua muito mais rápido.
              </p>

              {/* Starter */}
              <div className="border border-zinc-200 dark:border-zinc-700
                              rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest
                                  uppercase text-zinc-400 mb-1">
                      Starter
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-zinc-900
                                       dark:text-white">
                        R$39,90
                      </span>
                      <span className="text-xs text-zinc-400">/mês</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400">por entrevista</p>
                    <p className="text-sm font-semibold text-zinc-600
                                  dark:text-zinc-300">
                      R$6,65
                    </p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  6 entrevistas de 7 perguntas/mês
                </p>
                <button
                  onClick={() => handlePagar('mensal-starter')}
                  disabled={loading !== null}
                  className="w-full border border-zinc-200
                             dark:border-zinc-700 text-zinc-700
                             dark:text-zinc-300 py-2.5 rounded-full
                             text-xs font-medium hover:bg-zinc-50
                             dark:hover:bg-zinc-800 disabled:opacity-50
                             transition-colors flex items-center
                             justify-center gap-1.5"
                >
                  {loading === 'mensal-starter' && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  Assinar Starter
                </button>
              </div>

              {/* Pro — destaque */}
              <div className="border-2 border-zinc-900 dark:border-white
                              rounded-xl p-4 relative">
                <div className="absolute -top-2.5 left-4">
                  <span className="text-[10px] font-bold bg-zinc-900
                                   dark:bg-white text-white dark:text-zinc-900
                                   px-2.5 py-0.5 rounded-full">
                    RECOMENDADO
                  </span>
                </div>
                <div className="flex items-start justify-between mb-3 mt-1">
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest
                                  uppercase text-zinc-400 mb-1">
                      Pro
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-zinc-900
                                       dark:text-white">
                        R$59,90
                      </span>
                      <span className="text-xs text-zinc-400">/mês</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400">por entrevista</p>
                    <p className="text-sm font-semibold text-zinc-600
                                  dark:text-zinc-300">
                      R$9,98
                    </p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  6 entrevistas de 14 perguntas/mês
                </p>
                <button
                  onClick={() => handlePagar('mensal-pro')}
                  disabled={loading !== null}
                  className="w-full bg-zinc-900 dark:bg-white
                             text-white dark:text-zinc-900 py-2.5
                             rounded-full text-xs font-semibold
                             hover:bg-zinc-700 dark:hover:bg-zinc-100
                             disabled:opacity-50 transition-colors
                             flex items-center justify-center gap-1.5"
                >
                  {loading === 'mensal-pro' && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  Assinar Pro
                </button>
              </div>

              <p className="text-[11px] text-center text-zinc-400
                            dark:text-zinc-500 pt-1">
                Cancele quando quiser · Sem fidelidade
              </p>

            </div>
          )}

        </div>

        {/* Footer fixo */}
        <div className="px-5 py-3 border-t border-zinc-100
                        dark:border-zinc-800 shrink-0">
          <p className="text-[11px] text-center text-zinc-400
                        dark:text-zinc-500">
            🔒 Pagamento seguro via Mercado Pago · Pix disponível
          </p>
        </div>

      </div>
    </div>
  );
}
