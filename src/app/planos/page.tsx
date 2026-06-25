'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Check, ChevronLeft } from 'lucide-react';
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
    credito14: {
      label:     '1 entrevista de 14 perguntas',
      preco:     22.90,
      descricao: 'Crédito para uma nova entrevista aprofundada',
      features: [
        '1 entrevista completa de 14 perguntas',
        'Aprofundamento máximo — o dobro de perguntas',
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
      descricao: '6 entrevistas de 14 perguntas por mês',
      destaque:  true,
      features: [
        '6 entrevistas de 14 perguntas por mês',
        'Aprofundamento máximo — o dobro de perguntas',
        'Histórico completo de evolução',
        'Resultado compartilhável por link',
        'Acesso a todos os entrevistadores',
        'Suporte prioritário',
      ],
    },
  },
};

function PlanosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return');
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
    <div className="min-h-dvh bg-background">
      <Header />

      <div className="max-w-[1120px] mx-auto px-6 py-16">

        {/* Cabeçalho */}
        <div className="mb-14">
          {returnTo === 'setup' && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-zinc-500
                         hover:text-zinc-700 dark:hover:text-zinc-300
                         transition-colors mb-6"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar ao setup
            </button>
          )}
          <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg mb-3">
            Preços
          </p>
          <h1 className="text-[36px] font-bold tracking-heading text-foreground leading-tight mb-3">
            Escolha seu plano
          </h1>
          <p className="text-muted-fg text-lg max-w-xl leading-relaxed">
            Prepare-se de verdade para a próxima entrevista.
            Comece com 7 perguntas gratuitas — sem cartão.
          </p>
        </div>

        {/* Compra avulsa */}
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg mb-6">
            Compra avulsa
          </p>
          <div className={`grid grid-cols-1 gap-4 ${
            temEntrevistaAtiva
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2 max-w-2xl'
          }`}>

            {/* Finalizar atual — card destaque */}
            {temEntrevistaAtiva && (
              <div className="bg-zinc-950 dark:bg-zinc-100 rounded-xl p-6 relative">
                <div className="absolute -top-3 left-6">
                  <span className="bg-accent text-accent-fg text-[11px] font-semibold
                                   tracking-eyebrow uppercase px-3 py-1 rounded-full">
                    Mais popular
                  </span>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-1">
                  {PLANOS.avulso.finalizarAtual.descricao}
                </p>
                <p className="text-3xl font-mono tabular-nums font-bold
                               text-white dark:text-zinc-950 mb-1">
                  R$9,90
                </p>
                <p className="text-sm font-medium text-zinc-300 dark:text-zinc-700 mb-4">
                  {PLANOS.avulso.finalizarAtual.label}
                </p>
                <ul className="space-y-2 mb-6">
                  {PLANOS.avulso.finalizarAtual.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-600">
                      <Check className="w-4 h-4 text-white dark:text-zinc-950 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleComprar('finalizar-atual')}
                  className="w-full bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white
                             py-3 rounded-lg font-semibold text-sm
                             hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Finalizar por R$9,90
                </button>
              </div>
            )}

            {/* Crédito 7 perguntas */}
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-xs text-muted-fg mb-1">
                {PLANOS.avulso.credito7.descricao}
              </p>
              <p className="text-3xl font-mono tabular-nums font-bold text-foreground mb-1">
                R$12,90
              </p>
              <p className="text-sm font-medium text-foreground mb-4">
                {PLANOS.avulso.credito7.label}
              </p>
              <ul className="space-y-2 mb-6">
                {PLANOS.avulso.credito7.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-fg">
                    <Check className="w-4 h-4 text-muted-fg shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleComprar('credito-7')}
                className="w-full border border-border text-foreground py-3 rounded-lg
                           font-semibold text-sm hover:bg-muted
                           transition-colors"
              >
                Comprar crédito
              </button>
            </div>

            {/* Crédito 14 perguntas */}
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-xs text-muted-fg mb-1">
                {PLANOS.avulso.credito14.descricao}
              </p>
              <p className="text-3xl font-mono tabular-nums font-bold text-foreground mb-1">
                R$22,90
              </p>
              <p className="text-sm font-medium text-foreground mb-4">
                {PLANOS.avulso.credito14.label}
              </p>
              <ul className="space-y-2 mb-6">
                {PLANOS.avulso.credito14.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-fg">
                    <Check className="w-4 h-4 text-muted-fg shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleComprar('credito-14')}
                className="w-full border border-border text-foreground py-3 rounded-lg
                           font-semibold text-sm hover:bg-muted
                           transition-colors"
              >
                Comprar crédito
              </button>
            </div>

          </div>
        </div>

        {/* Planos mensais */}
        <div>
          <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg mb-6">
            Planos mensais — economize praticando todo mês
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {Object.entries(PLANOS.mensal).map(([key, plano]) => (
              <div
                key={key}
                className={`rounded-xl p-6 ${
                  plano.destaque
                    ? 'bg-zinc-950 dark:bg-zinc-100'
                    : 'border border-border bg-card'
                }`}
              >
                {plano.destaque && (
                  <div className="mb-3">
                    <span className="bg-accent text-accent-fg text-[11px] font-semibold
                                     tracking-eyebrow uppercase px-3 py-1 rounded-full">
                      Recomendado
                    </span>
                  </div>
                )}
                <p className={`text-xs mb-1 ${
                  plano.destaque ? 'text-zinc-400 dark:text-zinc-600' : 'text-muted-fg'
                }`}>
                  {plano.descricao}
                </p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className={`text-3xl font-mono tabular-nums font-bold ${
                    plano.destaque ? 'text-white dark:text-zinc-950' : 'text-foreground'
                  }`}>
                    R${plano.preco.toFixed(2).replace('.', ',')}
                  </span>
                  <span className={`text-sm ${
                    plano.destaque ? 'text-zinc-400 dark:text-zinc-600' : 'text-muted-fg'
                  }`}>/mês</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plano.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${
                      plano.destaque ? 'text-zinc-400 dark:text-zinc-600' : 'text-muted-fg'
                    }`}>
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plano.destaque ? 'text-white dark:text-zinc-950' : 'text-muted-fg'
                      }`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleComprar(`mensal-${key}`)}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                    plano.destaque
                      ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      : 'border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  Assinar {plano.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Garantia */}
        <div className="mt-16 pt-10 border-t border-border">
          <p className="text-sm text-muted-fg">
            Pagamento seguro via Mercado Pago · Pix disponível ·{' '}
            Garantia de 7 dias conforme CDC art. 49
          </p>
          <p className="text-xs text-muted-fg mt-2">
            Dúvidas?{' '}
            <a href="mailto:suporte@entrevistador-ai.com.br"
               className="underline hover:text-foreground transition-colors">
              suporte@entrevistador-ai.com.br
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function PlanosPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <PlanosContent />
    </Suspense>
  );
}
