'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, Sun, Moon, Lock,
  BrainCircuit, MessageSquare, TrendingUp, Globe,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = (resolvedTheme ?? theme) === 'dark';

  return (
    <div className="min-h-dvh bg-background transition-colors duration-200">

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50
                         bg-[#F7F7F5]/95 dark:bg-[#0C0C0A]/95 backdrop-blur-md
                         border-b border-border transition-colors duration-200">
        <div className="max-w-[1120px] mx-auto px-6 h-16
                        flex items-center justify-between">

          <span className="text-[15px] font-semibold tracking-tight
                           text-foreground select-none">
            Entrevistador.IA
          </span>

          <div className="flex items-center gap-6">
            <a href="#como-funciona"
               className="hidden md:block text-sm text-muted-fg
                          hover:text-foreground transition-colors duration-150">
              Como funciona
            </a>

            {!user ? (
              <button
                onClick={() => router.push('/entrar')}
                className="hidden md:block text-sm text-muted-fg
                           hover:text-foreground transition-colors duration-150">
                Entrar
              </button>
            ) : (
              <button
                onClick={() => router.push('/historico')}
                className="hidden md:block text-sm text-muted-fg
                           hover:text-foreground transition-colors duration-150">
                Meu histórico
              </button>
            )}

            <button
              onClick={() => router.push('/setup')}
              className="text-sm bg-foreground text-background
                         px-4 py-2 rounded-lg font-medium
                         hover:opacity-90 transition-opacity duration-150">
              Começar agora
            </button>

            {mounted ? (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="w-8 h-8 flex items-center justify-center
                           rounded-full border border-border text-muted-fg
                           hover:text-foreground hover:bg-muted
                           transition-all duration-150"
                aria-label="Alternar tema"
              >
                {isDark
                  ? <Sun  className="w-3.5 h-3.5" />
                  : <Moon className="w-3.5 h-3.5" />}
              </button>
            ) : <div className="w-8 h-8" />}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-36 pb-28 px-6 bg-background">
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

            {/* Esquerda */}
            <div className="animate-fade-in">
              <h1 className="text-[52px] lg:text-[72px] font-bold text-foreground
                             leading-[1.02] tracking-display mb-7">
                Sua próxima<br />
                entrevista<br />
                começa aqui.
              </h1>

              <p className="text-lg text-muted-fg leading-[1.7] mb-9 max-w-[440px]">
                Pratique com um entrevistador virtual que conhece o seu
                currículo e a vaga real. Receba feedback detalhado.
                Apareça preparado.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => router.push('/setup')}
                  className="inline-flex items-center gap-2
                             bg-foreground text-background
                             px-6 py-3 rounded-lg font-semibold text-sm
                             hover:opacity-90 transition-opacity duration-150">
                  Começar grátis
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a href="#como-funciona"
                   className="inline-flex items-center gap-1.5 text-sm
                              text-muted-fg hover:text-foreground
                              transition-colors duration-150">
                  Como funciona
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Direita — screenshot */}
            <div className="animate-fade-in [animation-delay:200ms]
                            opacity-0 relative">
              <div className="rounded-2xl overflow-hidden
                              border border-border shadow-modal">
                <div className="flex items-center gap-1.5 px-4 py-2.5
                                bg-muted border-b border-border">
                  <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                  <span className="ml-3 text-xs text-muted-fg font-mono">
                    entrevistador.ai/entrevista
                  </span>
                </div>
                <Image
                  src="/entrevista-ai.png"
                  alt="Tela de entrevista do Entrevistador.IA"
                  width={1280}
                  height={800}
                  className="w-full h-auto block"
                  priority
                />
              </div>

              <div className="absolute -bottom-4 -right-4
                              bg-card border border-border rounded-xl
                              px-4 py-2.5 shadow-card
                              hidden md:flex items-center gap-2.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-foreground">
                  Entrevista em andamento
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="py-28 bg-muted px-6">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase
                          tracking-eyebrow text-muted-fg mb-4">
              Como funciona
            </p>
            <h2 className="text-[32px] lg:text-[40px] font-bold text-foreground
                           tracking-heading leading-[1.1]">
              Três passos para chegar preparado
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                num: '01',
                title: 'Envie seu currículo e a vaga',
                desc: 'Nossa IA analisa sua experiência e os requisitos da vaga para criar uma entrevista personalizada para você.',
              },
              {
                num: '02',
                title: 'Pratique com o entrevistador',
                desc: 'Responda perguntas reais por voz. O entrevistador reage, aprofunda e desafia — como numa entrevista de verdade.',
              },
              {
                num: '03',
                title: 'Receba feedback detalhado',
                desc: 'Veja sua pontuação, análise por resposta, mapa de competências e o que você poderia ter dito melhor.',
              },
            ].map((item, i) => (
              <div key={i}
                   className="bg-card rounded-xl p-8 border border-border
                              hover:border-border-strong hover:shadow-card-hover
                              transition-all duration-200">
                <span aria-hidden="true"
                      className="block text-[48px] font-bold font-mono
                                 tabular-nums text-zinc-200 dark:text-zinc-700
                                 leading-none mb-6">
                  {item.num}
                </span>
                <h3 className="font-semibold text-foreground text-[15px]
                               leading-snug mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-fg text-sm leading-[1.65]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARGUMENTO ── */}
      <section className="py-28 px-6 bg-zinc-950 dark:bg-black">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-[36px] lg:text-[52px] font-bold text-white
                         tracking-heading leading-[1.06] mb-6">
            Você tem uma entrevista
            importante amanhã.
          </h2>
          <p className="text-zinc-400 text-[17px] leading-[1.7] mb-10 max-w-lg">
            Em 20 minutos, o Entrevistador.IA simula a entrevista com
            base no seu currículo e na vaga real. Você descobre onde
            está fraco, o que melhorar — e aparece no dia seguinte
            muito mais preparado.
          </p>
          <button
            onClick={() => router.push('/setup')}
            className="inline-flex items-center gap-2 bg-white text-zinc-950
                       px-7 py-3 rounded-lg text-sm font-semibold
                       hover:bg-zinc-100 transition-colors duration-150">
            Começar agora — é grátis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── DIFERENCIAIS ── */}
      <section className="py-28 px-6 bg-background">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase
                          tracking-eyebrow text-muted-fg mb-4">
              Por que é diferente
            </p>
            <h2 className="text-[32px] lg:text-[40px] font-bold text-foreground
                           tracking-heading leading-[1.1]">
              Feito para a sua entrevista,<br className="hidden lg:block" />
              não para qualquer candidato.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: <BrainCircuit className="w-4 h-4 text-muted-fg" />,
                title: 'Perguntas baseadas no seu perfil',
                desc: 'Não são perguntas genéricas. São geradas a partir da sua experiência real cruzada com os requisitos da vaga.',
              },
              {
                icon: <MessageSquare className="w-4 h-4 text-muted-fg" />,
                title: 'Feedback de verdade',
                desc: 'Para cada resposta: o que estava bom, o que faltou, e como você deveria ter respondido.',
              },
              {
                icon: <TrendingUp className="w-4 h-4 text-muted-fg" />,
                title: 'Acompanhe sua evolução',
                desc: 'Veja seu progresso entrevista a entrevista. Identifique padrões e os pontos que melhoraram.',
              },
              {
                icon: <Globe className="w-4 h-4 text-muted-fg" />,
                title: 'Português e inglês',
                desc: 'Pratique em português ou em inglês — ideal para vagas em empresas internacionais.',
              },
            ].map((item, i) => (
              <div key={i}
                   className="flex gap-5 p-7 rounded-xl border border-border
                              hover:border-border-strong hover:bg-card
                              transition-all duration-200">
                <div className="mt-0.5 shrink-0">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-foreground text-[15px] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-fg text-sm leading-[1.65]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREÇOS ── */}
      <section className="py-28 px-6 bg-muted">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase
                          tracking-eyebrow text-muted-fg mb-4">
              Preços
            </p>
            <h2 className="text-[32px] lg:text-[40px] font-bold text-foreground
                           tracking-heading leading-[1.1] mb-2">
              Simples e acessível
            </h2>
            <p className="text-muted-fg text-lg leading-relaxed">
              Comece grátis. Pague só quando quiser ir mais fundo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

            {/* Grátis */}
            <div className="bg-card rounded-xl p-7 border border-border flex flex-col">
              <p className="text-[11px] font-semibold uppercase
                            tracking-eyebrow text-muted-fg mb-5">
                Grátis
              </p>
              <div className="mb-6">
                <p className="text-[44px] font-bold font-mono tabular-nums
                               text-foreground leading-none mb-1">
                  R$0
                </p>
                <p className="text-sm text-muted-fg">sem cartão necessário</p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  '3 perguntas de entrevista',
                  'Escolha a vaga que quiser',
                  'Português e inglês',
                  'Voz humana real',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-fg">
                    <svg className="w-4 h-4 text-border-strong shrink-0 mt-0.5"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                         aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/setup"
                className="block w-full text-center border border-border
                           text-muted-fg py-2.5 rounded-lg text-sm font-medium
                           hover:border-border-strong hover:text-foreground
                           transition-all duration-150">
                Começar grátis
              </Link>
            </div>

            {/* Avulso — destaque */}
            <div className="bg-zinc-950 dark:bg-zinc-100 rounded-xl p-7
                            border border-transparent relative flex flex-col">
              <div className="absolute -top-3 left-6">
                <span className="bg-zinc-950 dark:bg-zinc-100
                                 text-white dark:text-zinc-950
                                 text-[11px] font-semibold
                                 px-3 py-1 rounded-full">
                  Mais popular
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase
                            tracking-eyebrow text-zinc-500 mb-5">
                Avulso
              </p>
              <div className="mb-6">
                <p className="text-[44px] font-bold font-mono tabular-nums
                               text-white dark:text-zinc-950 leading-none mb-1">
                  R$9,90
                </p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  por entrevista de 7 perguntas
                </p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  'Entrevista completa de 7 perguntas',
                  'Relatório com nota e feedback',
                  'Análise por pergunta',
                  'Resposta ideal personalizada',
                  'Resultado compartilhável',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm
                                         text-zinc-300 dark:text-zinc-600">
                    <svg className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                         aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/planos"
                className="block w-full text-center
                           bg-white dark:bg-zinc-950
                           text-zinc-950 dark:text-white
                           py-2.5 rounded-lg text-sm font-semibold
                           hover:opacity-90 transition-opacity duration-150">
                Ver planos
              </Link>
            </div>

            {/* Mensal */}
            <div className="bg-card rounded-xl p-7 border border-border flex flex-col">
              <p className="text-[11px] font-semibold uppercase
                            tracking-eyebrow text-muted-fg mb-5">
                Mensal
              </p>
              <div className="mb-6">
                <p className="text-[44px] font-bold font-mono tabular-nums
                               text-foreground leading-none mb-1">
                  R$39,90
                </p>
                <p className="text-sm text-muted-fg">por mês · 6 entrevistas</p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  '6 entrevistas por mês',
                  'Histórico de evolução',
                  'Todos os entrevistadores',
                  'Resultado compartilhável',
                  'Suporte por email',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-fg">
                    <svg className="w-4 h-4 text-border-strong shrink-0 mt-0.5"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                         aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/planos"
                className="block w-full text-center border border-border
                           text-muted-fg py-2.5 rounded-lg text-sm font-medium
                           hover:border-border-strong hover:text-foreground
                           transition-all duration-150">
                Ver planos
              </Link>
            </div>

          </div>

          <div className="flex items-center gap-2 text-sm text-muted-fg">
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              Pagamento via Mercado Pago · Pix disponível ·
              Garantia de 7 dias conforme CDC art. 49
            </span>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-zinc-950 dark:bg-black py-14 px-6">
        <div className="max-w-[1120px] mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center
                          justify-between gap-8">

            <div>
              <span className="text-[15px] font-semibold tracking-tight text-white">
                Entrevistador.IA
              </span>
              <p className="text-zinc-500 text-sm mt-1.5">
                © 2026 Todos os direitos reservados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-zinc-500">
              <a href="mailto:suporte@entrevistador-ai.com.br"
                 className="hover:text-zinc-300 transition-colors duration-150">
                suporte@entrevistador-ai.com.br
              </a>
              <Link href="/termos"
                className="hover:text-zinc-300 transition-colors duration-150">
                Termos de Uso
              </Link>
              <Link href="/privacidade"
                className="hover:text-zinc-300 transition-colors duration-150">
                Privacidade
              </Link>
            </div>

            <button
              onClick={() => router.push('/setup')}
              className="text-sm border border-zinc-700 text-zinc-300
                         px-5 py-2.5 rounded-lg hover:border-zinc-500
                         hover:text-white transition-all duration-150 shrink-0">
              Começar agora →
            </button>

          </div>
        </div>
      </footer>

    </div>
  );
}
