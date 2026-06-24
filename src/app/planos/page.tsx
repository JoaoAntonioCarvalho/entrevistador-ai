'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSessionStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const PLANOS = {
  avulso: {
    finalizarAtual: {
      label:     'Finalizar entrevista atual',
      preco:     9.90,
      descricao: '7 perguntas — com desconto por já estar em andamento',
      features: [
        'Finaliza a entrevista que você já começou',
        'Relatório completo com nota e feedback',
        'Análise por pergunta com resposta ideal',
        'Resultado compartilhável por link',
      ],
    },
    credito7: {
      label:     '1 entrevista de 7 perguntas',
      preco:     12.90,
      descricao: 'Crédito para uma nova entrevista',
      features: [
        '1 entrevista completa de 7 perguntas',
        'Qualquer vaga ou cargo',
        'Relatório completo com nota e feedback',
        'Análise por pergunta com resposta ideal',
      ],
    },
    credito10: {
      label:     '1 entrevista de 10 perguntas',
      preco:     17.90,
      descricao: 'Crédito para uma nova entrevista aprofundada',
      features: [
        '1 entrevista completa de 10 perguntas',
        'Aprofundamento técnico e comportamental',
        'Relatório completo com nota e feedback',
        'Análise por pergunta com resposta ideal',
      ],
    },
  },
  mensal: {
    starter: {
      label:     'Starter',
      preco:     39.90,
      descricao: '6 entrevistas de 7 perguntas por mês',
      destaque:  false,
      features: [
        '6 entrevistas de 7 perguntas por mês',
        'Histórico completo de evolução',
        'Resultado compartilhável por link',
        'Acesso a todos os entrevistadores',
        'Suporte por email',
      ],
    },
    pro: {
      label:     'Pro',
      preco:     59.90,
      descricao: '6 entrevistas de 10 perguntas por mês',
      destaque:  true,
      features: [
        '6 entrevistas de 10 perguntas por mês',
        'Entrevistas mais aprofundadas',
        'Histórico completo de evolução',
        'Resultado compartilhável por link',
        'Acesso a todos os entrevistadores',
        'Suporte prioritário',
      ],
    },
  },
};

export default function PlanosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const session = useSessionStore(s => s.session);

  const temEntrevistaAtiva =
    !!session?.candidate?.nome &&
    session?.status === 'active' &&
    (session?.conversation?.length ?? 0) > 0;

  async function handleComprar(plano: string) {
    if (plano === 'finalizar-atual' && !temEntrevistaAtiva) {
      router.push('/setup');
      return;
    }

    if (!user) {
      router.push(`/entrar?return=/planos&plano=${plano}`);
      return;
    }

    try {
      const sessionId = useSessionStore.getState().session?.id ?? null;

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
      }
    } catch {
      toast.error('Erro ao iniciar pagamento. Tente novamente.');
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />

      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Header da página */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-3">
            Escolha seu plano
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
            Prepare-se de verdade para a próxima entrevista.
            Comece com 7 perguntas gratuitas — sem cartão.
          </p>
        </div>

        {/* Compra avulsa */}
        <div className="mb-16">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400
                         uppercase tracking-widest mb-6">
            Compra avulsa
          </h2>
          <div className={`grid grid-cols-1 gap-4 ${
            temEntrevistaAtiva
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2 max-w-2xl'
          }`}>

            {/* Finalizar atual */}
            {temEntrevistaAtiva && (
            <div className="border-2 border-zinc-900 dark:border-white rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
                                 text-xs font-semibold px-3 py-1 rounded-full">
                  Mais popular
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {PLANOS.avulso.finalizarAtual.descricao}
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">R$9,90</p>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                {PLANOS.avulso.finalizarAtual.label}
              </p>
              <ul className="space-y-2 mb-6">
                {PLANOS.avulso.finalizarAtual.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="w-4 h-4 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleComprar('finalizar-atual')}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
                           py-3 rounded-full font-semibold text-sm
                           hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors"
              >
                Finalizar por R$9,90
              </button>
            </div>
            )}

            {/* Crédito 7 perguntas */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {PLANOS.avulso.credito7.descricao}
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">R$12,90</p>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                {PLANOS.avulso.credito7.label}
              </p>
              <ul className="space-y-2 mb-6">
                {PLANOS.avulso.credito7.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleComprar('credito-7')}
                className="w-full border border-zinc-200 dark:border-zinc-700
                           text-zinc-700 dark:text-zinc-300 py-3 rounded-full
                           font-semibold text-sm hover:bg-zinc-50
                           dark:hover:bg-zinc-800 transition-colors"
              >
                Comprar crédito
              </button>
            </div>

            {/* Crédito 10 perguntas */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {PLANOS.avulso.credito10.descricao}
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">R$17,90</p>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                {PLANOS.avulso.credito10.label}
              </p>
              <ul className="space-y-2 mb-6">
                {PLANOS.avulso.credito10.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleComprar('credito-10')}
                className="w-full border border-zinc-200 dark:border-zinc-700
                           text-zinc-700 dark:text-zinc-300 py-3 rounded-full
                           font-semibold text-sm hover:bg-zinc-50
                           dark:hover:bg-zinc-800 transition-colors"
              >
                Comprar crédito
              </button>
            </div>

          </div>
        </div>

        {/* Planos mensais */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400
                         uppercase tracking-widest mb-6">
            Planos mensais — economize praticando todo mês
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {Object.entries(PLANOS.mensal).map(([key, plano]) => (
              <div
                key={key}
                className={`rounded-2xl p-6 ${
                  plano.destaque
                    ? 'border-2 border-zinc-900 dark:border-white'
                    : 'border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {plano.destaque && (
                  <div className="mb-3">
                    <span className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
                                     text-xs font-semibold px-3 py-1 rounded-full">
                      Recomendado
                    </span>
                  </div>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{plano.descricao}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                    R${plano.preco.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-sm text-zinc-500">/mês</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plano.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plano.destaque ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'
                      }`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleComprar(`mensal-${key}`)}
                  className={`w-full py-3 rounded-full font-semibold text-sm transition-colors ${
                    plano.destaque
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-100'
                      : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  Assinar {plano.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Garantia */}
        <div className="mt-16 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Pagamento seguro via Mercado Pago · Pix disponível ·{' '}
            <span className="text-zinc-600 dark:text-zinc-400">
              Garantia de 7 dias conforme CDC art. 49
            </span>
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-3">
            Dúvidas?{' '}
            <a href="mailto:suporte@entrevistador-ai.com.br"
               className="underline hover:text-zinc-600
                          dark:hover:text-zinc-400 transition-colors">
              suporte@entrevistador-ai.com.br
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
