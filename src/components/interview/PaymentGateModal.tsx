'use client'

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';
import { PaymentFlow } from '@/components/payment/PaymentFlow';
import { X, Check, Zap, Calendar } from 'lucide-react';

interface PaymentGateModalProps {
  sessionId: string;
  onClose?:  () => void;
  motivo?:   'normal' | 'free_limit';
  onBeforeRedirectToPayment?: () => void;
}

export function PaymentGateModal({
  sessionId,
  onClose,
  motivo = 'normal',
  onBeforeRedirectToPayment,
}: PaymentGateModalProps) {
  const { user } = useAuth();
  const { open } = useAuthModal();
  const [tab, setTab] = useState<'avulso' | 'mensal'>('avulso');
  const [pagamentoAtivo, setPagamentoAtivo] = useState<string | null>(null);

  function handlePagar(plano: string) {
    if (!user) {
      localStorage.setItem('pending-interview-session', sessionId);
      open({
        motivo:                 'Para continuar sua entrevista',
        returnTo:               `/interview?resume=true&sessionId=${sessionId}`,
        onBeforeRedirectToAuth: onBeforeRedirectToPayment,
      });
      return;
    }
    setPagamentoAtivo(plano);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full
                      max-w-[480px] shadow-2xl overflow-hidden
                      border border-zinc-100 dark:border-zinc-800">

        {/* Header com gradiente sutil */}
        <div className="relative px-6 pt-6 pb-5
                        border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              {motivo === 'free_limit' ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400
                                    animate-pulse" />
                    <p className="text-[11px] font-semibold tracking-widest
                                  uppercase text-zinc-400">
                      Limite gratuito atingido
                    </p>
                  </div>
                  <h2 className="text-[17px] font-bold text-zinc-900
                                 dark:text-white leading-snug">
                    Você já usou suas perguntas gratuitas de hoje.
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Para finalizar esta entrevista e ver seu feedback
                    completo, escolha um plano abaixo.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400
                                    animate-pulse" />
                    <p className="text-[11px] font-semibold tracking-widest
                                  uppercase text-zinc-400">
                      Entrevista pausada
                    </p>
                  </div>
                  <h2 className="text-[17px] font-bold text-zinc-900
                                 dark:text-white leading-snug">
                    Continue de onde parou
                  </h2>
                </>
              )}
            </div>
            {onClose && (
              <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center
                           rounded-full hover:bg-zinc-100
                           dark:hover:bg-zinc-800 transition-colors
                           text-zinc-400 hover:text-zinc-600
                           dark:hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setTab('avulso')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5
                          rounded-full text-xs font-medium transition-all
                          ${tab === 'avulso'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
            >
              <Zap className="w-3 h-3" />
              Avulso
            </button>
            <button
              onClick={() => setTab('mensal')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5
                          rounded-full text-xs font-medium transition-all
                          ${tab === 'mensal'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
            >
              <Calendar className="w-3 h-3" />
              Mensal
              <span className="bg-emerald-500 text-white text-[9px]
                               font-bold px-1.5 py-0.5 rounded-full
                               leading-none">
                -35%
              </span>
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5">

          {/* ABA AVULSO */}
          {tab === 'avulso' && (
            <div className="space-y-2.5">

              {/* Card principal — destaque */}
              <div className="relative rounded-xl bg-zinc-950
                              dark:bg-white p-4 overflow-hidden">
                {/* Badge */}
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-white/15
                                   dark:bg-zinc-900/15 text-white/90
                                   dark:text-zinc-900/90 px-2 py-0.5
                                   rounded-full border border-white/20
                                   dark:border-zinc-900/20">
                    -34% OFF
                  </span>
                </div>

                <p className="text-[10px] font-semibold tracking-widest
                              uppercase text-white/50 dark:text-zinc-900/50
                              mb-2">
                  Finalizar esta entrevista
                </p>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[28px] font-bold text-white
                                   dark:text-zinc-900 leading-none">
                    R$5,90
                  </span>
                  <span className="text-sm text-white/40
                                   dark:text-zinc-900/40 line-through">
                    R$8,90
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {[
                    'Continua de onde parou',
                    'Nota e feedback',
                    'Resposta ideal',
                    'Link compartilhável',
                  ].map(f => (
                    <div key={f}
                         className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-white/60
                                        dark:text-zinc-900/60 shrink-0" />
                      <span className="text-[11px] text-white/70
                                       dark:text-zinc-900/70">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePagar('finalizar-atual')}
                  className="w-full bg-white dark:bg-zinc-900 text-zinc-900
                             dark:text-white py-2.5 rounded-full text-xs
                             font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800
                             transition-colors flex items-center
                             justify-center gap-2"
                >
                  Finalizar por R$5,90
                </button>
              </div>

              {/* Cards secundários lado a lado */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { plano: 'credito-7',  preco: 'R$8,90',  label: '7 perguntas',  sub: 'Nova entrevista' },
                  { plano: 'credito-14', preco: 'R$12,90', label: '14 perguntas', sub: 'Nova entrevista aprofundada' },
                ].map(({ plano, preco, label, sub }) => (
                  <div key={plano}
                       className="border border-zinc-200 dark:border-zinc-700
                                  rounded-xl p-3.5 flex flex-col">
                    <p className="text-[10px] text-zinc-400 mb-0.5">{sub}</p>
                    <p className="text-base font-bold text-zinc-900
                                  dark:text-white mb-0.5">
                      {preco}
                    </p>
                    <p className="text-[11px] text-zinc-400 mb-3 flex-1">
                      {label}
                    </p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mb-2 leading-tight">
                      Começa do início — não é esta entrevista
                    </p>
                    <button
                      onClick={() => handlePagar(plano)}
                      className="w-full border border-zinc-200
                                 dark:border-zinc-700 text-zinc-700
                                 dark:text-zinc-300 py-2 rounded-full
                                 text-[11px] font-medium
                                 hover:bg-zinc-50 dark:hover:bg-zinc-800
                                 transition-colors flex items-center
                                 justify-center gap-1"
                    >
                      Comprar
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ABA MENSAL */}
          {tab === 'mensal' && (
            <div className="space-y-2.5">

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                Pratique todo mês. Cada entrevista sai por menos de R$7.
              </p>

              {[
                {
                  plano:    'mensal-starter',
                  label:    'Starter',
                  preco:    'R$39,90',
                  por:      'R$6,65/entrevista',
                  desc:     '6 entrevistas de 7 perguntas/mês',
                  destaque: false,
                },
                {
                  plano:    'mensal-pro',
                  label:    'Pro',
                  preco:    'R$59,90',
                  por:      'R$9,98/entrevista',
                  desc:     '6 entrevistas de 14 perguntas/mês',
                  destaque: true,
                },
              ].map(({ plano, label, preco, por, desc, destaque }) => (
                <div key={plano}
                     className={`rounded-xl p-4 relative
                       ${destaque
                         ? 'bg-zinc-950 dark:bg-white'
                         : 'border border-zinc-200 dark:border-zinc-700'
                       }`}>
                  {destaque && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="text-[9px] font-bold bg-emerald-500
                                       text-white px-2.5 py-0.5 rounded-full">
                        RECOMENDADO
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`text-[10px] font-semibold tracking-widest
                                     uppercase mb-1
                                     ${destaque
                                       ? 'text-white/50 dark:text-zinc-900/50'
                                       : 'text-zinc-400'}`}>
                        {label}
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-bold
                          ${destaque
                            ? 'text-white dark:text-zinc-900'
                            : 'text-zinc-900 dark:text-white'}`}>
                          {preco}
                        </span>
                        <span className={`text-xs
                          ${destaque
                            ? 'text-white/40 dark:text-zinc-900/40'
                            : 'text-zinc-400'}`}>
                          /mês
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px]
                        ${destaque
                          ? 'text-white/40 dark:text-zinc-900/40'
                          : 'text-zinc-400'}`}>
                        por entrevista
                      </p>
                      <p className={`text-sm font-semibold
                        ${destaque
                          ? 'text-white/80 dark:text-zinc-900/80'
                          : 'text-zinc-600 dark:text-zinc-300'}`}>
                        {por.split('/')[0]}
                      </p>
                    </div>
                  </div>
                  <p className={`text-[11px] mb-3
                    ${destaque
                      ? 'text-white/50 dark:text-zinc-900/50'
                      : 'text-zinc-400'}`}>
                    {desc}
                  </p>
                  <button
                    onClick={() => handlePagar(plano)}
                    className={`w-full py-2.5 rounded-full text-xs
                                font-bold transition-colors flex
                                items-center justify-center gap-2
                      ${destaque
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                  >
                    Assinar {label}
                  </button>
                </div>
              ))}

              <p className="text-[11px] text-center text-zinc-400
                            dark:text-zinc-500">
                Cancele quando quiser · Sem fidelidade
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <p className="text-[11px] text-center text-zinc-400
                        dark:text-zinc-500">
            🔒 Mercado Pago · Pix disponível · 7 dias de garantia
          </p>
        </div>

      </div>

      {pagamentoAtivo && (
        <PaymentFlow
          plano={pagamentoAtivo}
          sessionId={sessionId}
          onClose={() => setPagamentoAtivo(null)}
          onBeforeNavigateAway={onBeforeRedirectToPayment}
        />
      )}
    </div>
  );
}
