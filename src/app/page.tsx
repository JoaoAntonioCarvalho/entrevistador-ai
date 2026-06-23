'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, Mic, BarChart2, Globe,
  MessageSquare, TrendingUp, BrainCircuit,
  Sun, Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

export default function LandingPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [temHistorico, setTemHistorico] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('entrevistador-ai-sessions');
      const sessions = raw ? JSON.parse(raw) : [];
      setTemHistorico(sessions.length > 0);
    } catch { setTemHistorico(false); }
  }, []);

  const isDark = (resolvedTheme ?? theme) === 'dark';

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">

      {/* ── HEADER DA LANDING ── */}
      <header className="fixed top-0 left-0 right-0 z-50
                         bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md
                         border-b border-zinc-100 dark:border-zinc-800
                         transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center
                        justify-between">

          <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
            Entrevistador.ai
          </span>

          <div className="flex items-center gap-4">

            <a href="#como-funciona"
               className="hidden md:block text-sm text-zinc-500
                          dark:text-zinc-400 hover:text-zinc-900
                          dark:hover:text-white transition-colors">
              Como funciona
            </a>

            {temHistorico && (
              <a href="/historico"
                 className="hidden md:block text-sm text-zinc-500
                            dark:text-zinc-400 hover:text-zinc-900
                            dark:hover:text-white transition-colors
                            border-l border-zinc-200 dark:border-zinc-700 pl-4">
                Meu histórico
              </a>
            )}

            <button
              onClick={() => router.push('/setup')}
              className="text-sm bg-zinc-900 dark:bg-white text-white
                         dark:text-zinc-900 px-4 py-2 rounded-full
                         hover:bg-zinc-700 dark:hover:bg-zinc-100
                         transition-colors font-medium">
              Começar agora
            </button>

            {mounted ? (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="w-9 h-9 flex items-center justify-center
                           rounded-full border border-zinc-200
                           dark:border-zinc-700 text-zinc-500
                           dark:text-zinc-400 hover:bg-zinc-50
                           dark:hover:bg-zinc-800 transition-all"
                aria-label="Alternar tema"
              >
                {isDark
                  ? <Sun  className="w-4 h-4" />
                  : <Moon className="w-4 h-4" />
                }
              </button>
            ) : <div className="w-9 h-9" />}

          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 pb-24 px-6 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Esquerda */}
            <div className="animate-fade-in">
              <h1 className="text-5xl lg:text-6xl font-bold text-zinc-900
                             dark:text-white leading-[1.08] tracking-tight mb-6">
                Sua próxima<br />
                entrevista<br />
                começa aqui.
              </h1>

              <p className="text-lg text-zinc-500 dark:text-zinc-400
                            leading-relaxed mb-8 max-w-md">
                Pratique com um entrevistador virtual que conhece o seu
                currículo e a vaga real. Receba feedback detalhado.
                Apareça preparado.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <button
                  onClick={() => router.push('/setup')}
                  className="inline-flex items-center gap-2
                             bg-zinc-900 dark:bg-white
                             text-white dark:text-zinc-900
                             px-6 py-3 rounded-full font-medium
                             hover:bg-zinc-700 dark:hover:bg-zinc-100
                             transition-all duration-200 hover:gap-3">
                  Começar agora
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a href="#como-funciona"
                   className="inline-flex items-center gap-2 border
                              border-zinc-200 dark:border-zinc-700
                              text-zinc-700 dark:text-zinc-300
                              px-6 py-3 rounded-full font-medium
                              hover:bg-zinc-50 dark:hover:bg-zinc-800
                              transition-colors text-sm">
                  Ver como funciona
                </a>
              </div>

            </div>

            {/* Direita — Screenshot real */}
            <div className="animate-fade-in [animation-delay:200ms]
                            opacity-0 relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl
                              border border-zinc-200 dark:border-zinc-800
                              ring-1 ring-zinc-100 dark:ring-zinc-900">
                {/* Barra estilo browser */}
                <div className="flex items-center gap-1.5 px-4 py-2.5
                                bg-zinc-100 dark:bg-zinc-800 border-b
                                border-zinc-200 dark:border-zinc-700">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-zinc-400
                                   dark:text-zinc-500 font-mono">
                    entrevistador.ai/entrevista
                  </span>
                </div>
                {/* Screenshot real */}
                <Image
                  src="/entrevista-ai.png"
                  alt="Tela de entrevista do Entrevistador.ai"
                  width={1280}
                  height={800}
                  className="w-full h-auto block"
                  priority
                />
              </div>

              {/* Badge flutuante */}
              <div className="absolute -bottom-4 -right-4 bg-white
                              dark:bg-zinc-800 border border-zinc-100
                              dark:border-zinc-700 rounded-xl px-4 py-2.5
                              shadow-lg hidden md:flex items-center gap-2.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-zinc-700
                                 dark:text-zinc-300">
                  Entrevista em andamento
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona"
               className="py-24 bg-zinc-50 dark:bg-zinc-900 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white
                           tracking-tight mb-3">
              Como funciona
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              Três passos para chegar preparado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Envie seu currículo e a vaga',
                desc: 'Nossa IA analisa sua experiência e os requisitos da vaga para criar uma entrevista personalizada para você.',
                icon: <BarChart2 className="w-5 h-5" />,
              },
              {
                num: '02',
                title: 'Pratique com o entrevistador',
                desc: 'Responda perguntas reais por voz. O entrevistador reage, aprofunda e desafia — como numa entrevista de verdade.',
                icon: <Mic className="w-5 h-5" />,
              },
              {
                num: '03',
                title: 'Receba feedback detalhado',
                desc: 'Veja sua pontuação, análise por resposta, mapa de competências e o que você poderia ter dito melhor.',
                icon: <MessageSquare className="w-5 h-5" />,
              },
            ].map((item, i) => (
              <div key={i}
                   className="bg-white dark:bg-zinc-800
                              rounded-2xl p-8
                              border border-zinc-100 dark:border-zinc-700
                              shadow-card hover:shadow-card-hover
                              hover:-translate-y-0.5 transition-all duration-200">
                <span className="text-6xl font-bold tabular-nums
                                 text-zinc-200 dark:text-zinc-600 block mb-4">
                  {item.num}
                </span>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-3 text-lg">
                  {item.title}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARGUMENTO ── */}
      <section className="py-24 px-6 bg-zinc-900 dark:bg-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white
                         tracking-tight leading-tight mb-6">
            Você tem uma entrevista
            importante amanhã.
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10">
            Em 20 minutos, o Entrevistador.ai simula a entrevista com
            base no seu currículo e na vaga real. Você descobre onde
            está fraco, o que melhorar — e aparece no dia seguinte
            muito mais preparado.
          </p>
          <button
            onClick={() => router.push('/setup')}
            className="inline-flex items-center gap-2 bg-white text-zinc-900
                       px-8 py-4 rounded-full text-base font-semibold
                       hover:bg-zinc-100 transition-colors">
            Começar agora — é grátis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── DIFERENCIAIS ── */}
      <section className="py-24 px-6 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white
                           tracking-tight mb-3">
              Por que é diferente
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: <BrainCircuit className="w-5 h-5 text-accent dark:text-blue-400" />,
                title: 'Perguntas baseadas no seu perfil',
                desc: 'Não são perguntas genéricas. São baseadas na sua experiência real cruzada com os requisitos da vaga.',
              },
              {
                icon: <MessageSquare className="w-5 h-5 text-accent dark:text-blue-400" />,
                title: 'Feedback de verdade',
                desc: 'Para cada resposta: o que estava bom, o que faltou, e como você deveria ter respondido.',
              },
              {
                icon: <TrendingUp className="w-5 h-5 text-accent dark:text-blue-400" />,
                title: 'Acompanhe sua evolução',
                desc: 'Veja seu progresso entrevista a entrevista. Identifique os pontos que melhoraram.',
              },
              {
                icon: <Globe className="w-5 h-5 text-accent dark:text-blue-400" />,
                title: 'Português e inglês',
                desc: 'Pratique em português ou em inglês — ideal para vagas em empresas internacionais.',
              },
            ].map((item, i) => (
              <div key={i}
                   className="flex gap-5 p-6 rounded-2xl
                              border border-zinc-100 dark:border-zinc-800
                              hover:border-zinc-200 dark:hover:border-zinc-700
                              hover:bg-zinc-50 dark:hover:bg-zinc-900
                              transition-all duration-200">
                <div className="w-10 h-10 bg-accent-light dark:bg-zinc-800
                                rounded-xl flex items-center justify-center
                                flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREÇOS ── */}
      <section className="py-24 px-6 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white
                           tracking-tight mb-3">
              Simples e acessível
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              Comece grátis. Pague só quando quiser ir mais fundo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

            {/* Grátis */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6
                            border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-400
                           uppercase tracking-widest mb-3">
                Grátis
              </p>
              <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-1">
                R$0
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                sem cartão necessário
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  '3 perguntas de entrevista',
                  'Escolha a vaga que quiser',
                  'Português e inglês',
                  'Voz humana real',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm
                                         text-zinc-600 dark:text-zinc-400">
                    <svg className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round"
                         strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/setup"
                className="block w-full text-center border border-zinc-200
                           dark:border-zinc-700 text-zinc-700 dark:text-zinc-300
                           py-3 rounded-full text-sm font-medium
                           hover:bg-zinc-50 dark:hover:bg-zinc-800
                           transition-colors">
                Começar grátis
              </Link>
            </div>

            {/* Avulso */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6
                            border-2 border-zinc-900 dark:border-white
                            relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-zinc-900 dark:bg-white text-white
                                 dark:text-zinc-900 text-xs font-semibold
                                 px-3 py-1 rounded-full">
                  Mais popular
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-400
                           uppercase tracking-widest mb-3">
                Avulso
              </p>
              <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-1">
                R$9,90
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                por entrevista de 7 perguntas
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Entrevista completa de 7 perguntas',
                  'Relatório com nota e feedback',
                  'Análise por pergunta',
                  'Resposta ideal personalizada',
                  'Resultado compartilhável',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm
                                         text-zinc-600 dark:text-zinc-400">
                    <svg className="w-4 h-4 text-zinc-900 dark:text-white
                                    shrink-0 mt-0.5"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round"
                         strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/planos"
                className="block w-full text-center bg-zinc-900 dark:bg-white
                           text-white dark:text-zinc-900 py-3 rounded-full
                           text-sm font-semibold hover:bg-zinc-700
                           dark:hover:bg-zinc-100 transition-colors">
                Ver planos
              </Link>
            </div>

            {/* Mensal */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6
                            border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-400
                           uppercase tracking-widest mb-3">
                Mensal
              </p>
              <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-1">
                R$39,90
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                por mês · 6 entrevistas
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  '6 entrevistas por mês',
                  'Histórico de evolução',
                  'Todos os entrevistadores',
                  'Resultado compartilhável',
                  'Suporte por email',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm
                                         text-zinc-600 dark:text-zinc-400">
                    <svg className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round"
                         strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/planos"
                className="block w-full text-center border border-zinc-200
                           dark:border-zinc-700 text-zinc-700 dark:text-zinc-300
                           py-3 rounded-full text-sm font-medium
                           hover:bg-zinc-50 dark:hover:bg-zinc-800
                           transition-colors">
                Ver planos
              </Link>
            </div>

          </div>

          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
            🔒 Pagamento via Mercado Pago · Pix disponível ·
            Garantia de 7 dias conforme CDC art. 49
          </p>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-zinc-950 dark:bg-black py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row
                        items-center justify-between gap-6">
          <div>
            <span className="text-xl font-semibold tracking-tight text-white">
              Entrevistador.ai
            </span>
            <p className="text-zinc-500 text-sm mt-1">
              © 2026 Todos os direitos reservados.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center
                          gap-4 text-xs text-zinc-500">
            <a href="mailto:suporte@entrevistador-ai.com.br"
               className="hover:text-zinc-300 transition-colors
                          flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2
                         2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              suporte@entrevistador-ai.com.br
            </a>
            <span className="text-zinc-700">·</span>
            <Link href="/termos"
              className="hover:text-zinc-300 transition-colors">
              Termos de Uso
            </Link>
            <span className="text-zinc-700">·</span>
            <Link href="/privacidade"
              className="hover:text-zinc-300 transition-colors">
              Privacidade
            </Link>
          </div>
          <button
            onClick={() => router.push('/setup')}
            className="text-sm border border-zinc-700 text-zinc-300
                       px-5 py-2.5 rounded-full hover:border-zinc-500
                       hover:text-white transition-colors">
            Começar agora →
          </button>
        </div>
      </footer>

    </div>
  );
}
