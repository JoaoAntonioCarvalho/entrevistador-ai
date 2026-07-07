'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, Sun, Moon, ChevronDown,
  Mic, FileText, Globe, Users, TrendingUp,
  MessageSquare, Zap, Lock, Shield, CreditCard,
  BarChart3, Check, Settings,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useHasHistory } from '@/hooks/useHasHistory';
import { AccountMenu, MobileMenu } from '@/components/layout/HeaderMenus';

export const dynamic = 'force-dynamic';

// ── Demo showcase ───────────────────────────────────────────────────────────

const DEMO_SLIDES = [
  {
    src:   '/screenshot-setup.png',
    label: 'Envie seu currículo',
    desc:  'Envie seu currículo em PDF ou preencha 4 campos. Pode pular se preferir.',
    alt:   'Tela de setup: escolha entre enviar currículo, preencher manualmente ou pular a etapa',
  },
  {
    src:   '/screenshot-vaga.png',
    label: 'Cole a vaga',
    desc:  'Cole a descrição da vaga que você quer — ou deixe a IA gerar uma a partir do cargo.',
    alt:   'Tela da vaga: descrição da vaga colada no campo de texto, pronta para ser analisada',
  },
  {
    src:   '/screenshot-config.png',
    label: 'Configure a entrevista',
    desc:  'Escolha o entrevistador, o idioma, o nível e a quantidade de perguntas.',
    alt:   'Tela de configuração: quantidade de perguntas, nível e escolha entre os entrevistadores Sarah, Carlos e Alex',
  },
  {
    src:   '/screenshot-entrevista.png',
    label: 'Entreviste',
    desc:  'A entrevistadora fala, você responde pelo microfone. Conversa de verdade.',
    alt:   'Tela da entrevista com a entrevistadora Sarah e a transcrição da conversa em tempo real',
  },
  {
    src:   '/screenshot-relatorio.png',
    label: 'Receba o relatório',
    desc:  'Nota geral, ponto forte, melhorias e análise pergunta por pergunta.',
    alt:   'Relatório da entrevista com nota 81 de 100, pontos fortes e análise por pergunta',
  },
];

function DemoShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActive((a) => (a + 1) % DEMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      {/* Passos clicáveis */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
        {DEMO_SLIDES.map((s, i) => (
          <button key={s.src}
                  onClick={() => setActive(i)}
                  aria-pressed={active === i}
                  className={`text-left rounded-xl p-4 border transition-all duration-200 ${
                    active === i
                      ? 'bg-card border-border-strong shadow-card-hover'
                      : 'bg-transparent border-transparent hover:bg-card hover:border-border'
                  }`}>
            <p className={`text-[11px] font-semibold uppercase tracking-eyebrow mb-1.5 ${
              active === i ? 'text-foreground' : 'text-muted-fg'
            }`}>
              {String(i + 1).padStart(2, '0')} · {s.label}
            </p>
            <p className="text-[13px] text-muted-fg leading-[1.6]">{s.desc}</p>
            {/* Barra de progresso do auto-avanço */}
            <div className="mt-3 h-0.5 rounded-full bg-border overflow-hidden" aria-hidden="true">
              {active === i && (
                <div key={`${i}-${paused}`}
                     className="h-full bg-foreground rounded-full"
                     style={{
                       animation: paused ? 'none' : 'demo-progress 5s linear forwards',
                       width: paused ? '100%' : undefined,
                     }} />
              )}
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes demo-progress { from { width: 0 } to { width: 100% } }
      `}</style>

      {/* Screenshot ativo com crossfade */}
      <div className="relative aspect-video rounded-xl overflow-hidden
                      border border-border bg-card
                      shadow-[0_2px_8px_rgba(0,0,0,0.04),0_24px_56px_rgba(0,0,0,0.10)]">
        {DEMO_SLIDES.map((s, i) => (
          <Image key={s.src}
                 src={s.src}
                 alt={s.alt}
                 fill
                 sizes="(max-width: 800px) 100vw, 800px"
                 className={`object-cover object-top transition-opacity duration-500 ${
                   active === i ? 'opacity-100' : 'opacity-0'
                 }`} />
        ))}
      </div>

    </div>
  );
}

// ── Depoimentos ─────────────────────────────────────────────────────────────
// APENAS depoimentos reais, com autorização da pessoa. Depoimento inventado
// é publicidade enganosa (CDC art. 37). A seção só aparece quando o array
// tiver itens. Formato:
//   { text: 'O que a pessoa disse.', name: 'Nome Sobrenome', role: 'Cargo', company: 'Empresa' },
// (role/company podem ser '' — o card se adapta)

interface Testimonial {
  text:    string;
  name:    string;
  role:    string;
  company: string;
}

const TESTIMONIALS: Testimonial[] = [
  // Aguardando depoimentos reais dos participantes.
];

// ── FAQ data ────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Precisa de experiência técnica para usar?',
    a: 'Não. Se você consegue falar ao microfone e tem uma vaga em mente, você consegue usar. O setup leva menos de 2 minutos.',
  },
  {
    q: 'Meus dados do currículo ficam salvos?',
    a: 'Sim, mas só para você. Seus dados são armazenados de forma segura e não são compartilhados nem usados para treinar modelos de IA. Veja nossa Política de Privacidade para detalhes completos.',
  },
  {
    q: 'Os meus dados são usados para treinar a IA?',
    a: 'Não. Nós não usamos suas respostas para treinar modelos de IA e nunca compartilhamos seus dados para fins de treinamento ou marketing. Suas respostas são processadas pelos provedores de IA apenas para gerar a entrevista e o feedback, conforme as políticas de privacidade de cada provedor.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim. O Entrevistador.IA funciona no navegador do celular (Safari ou Chrome) e no computador. No iPhone, lembre-se de tirar o aparelho do modo silencioso para ouvir o entrevistador.',
  },
  {
    q: 'Posso cancelar a assinatura quando quiser?',
    a: 'Sim, sem burocracia. Você cancela com um clique e não há cobranças futuras. O acesso continua até o fim do período pago.',
  },
  {
    q: 'E se eu não gostar e quiser reembolso?',
    a: 'Você tem 7 dias de garantia a partir da compra, conforme o art. 49 do Código de Defesa do Consumidor. É só mandar um email para suporte.entrevistador.ia@gmail.com.',
  },
  {
    q: 'Consigo fazer entrevistas em inglês mesmo não sendo fluente?',
    a: 'Sim. O modo inglês foi desenvolvido para candidatos que estão crescendo no idioma, não apenas para fluentes. Praticar a estrutura das respostas em inglês — mesmo com sotaque e imperfeições — é exatamente o treino que prepara para entrevistas reais. O sistema entende português brasileiro com sotaque sem problemas.',
  },
  {
    q: 'Qual a diferença entre 7 e 14 perguntas?',
    a: '7 perguntas cobre o essencial: apresentação, competências, situações e fit cultural. 14 perguntas vai muito mais fundo — explora competências técnicas avançadas, situações complexas e visão estratégica. Recomendado para vagas sênior ou executivas.',
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const { hasHistory } = useHasHistory();
  const [mounted, setMounted]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq]   = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 50); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isDark = (resolvedTheme ?? theme) === 'dark';

  return (
    <div className="min-h-dvh bg-background">

      {/* ─────────────────────────────────────────────
          SEÇÃO 0 — HEADER FIXO
      ───────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-[#F7F7F5]/95 dark:bg-[#0C0C0A]/95 backdrop-blur-sm border-b border-border'
          : 'bg-transparent'
      }`}>
        <div className="max-w-[1120px] mx-auto px-6 h-16 flex items-center justify-between">

          <Link href="/"
            className="text-[15px] font-semibold tracking-tight text-foreground select-none">
            Entrevistador<span className="text-zinc-400">.</span>IA
          </Link>

          <nav className="hidden md:flex items-center gap-7" aria-label="Navegação principal">
            {[
              { label: 'Como funciona', href: '#como-funciona' },
              { label: 'Recursos',      href: '#recursos'      },
              { label: 'Preços',        href: '#precos'        },
              { label: 'FAQ',           href: '#faq'           },
            ].map((l) => (
              <a key={l.href} href={l.href}
                 className="text-sm text-muted-fg hover:text-foreground transition-colors duration-150">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden md:block">
                <AccountMenu />
              </div>
            ) : (
              <button onClick={() => router.push('/entrar')}
                className="hidden md:block text-sm text-muted-fg
                           hover:text-foreground transition-colors duration-150">
                Entrar
              </button>
            )}

            <button
              onClick={() => router.push(hasHistory && user ? '/planos' : '/setup')}
              className="text-sm bg-foreground text-background px-4 py-2 rounded-lg
                         font-medium hover:opacity-90 transition-opacity duration-150">
              {hasHistory && user ? 'Fazer entrevista' : 'Começar grátis'}
            </button>

            {mounted ? (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label="Alternar tema"
                className="w-8 h-8 flex items-center justify-center rounded-full
                           border border-border text-muted-fg hover:text-foreground
                           hover:bg-muted transition-all duration-150">
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            ) : <div className="w-8 h-8" />}

            <MobileMenu />
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────
          SEÇÃO 1 — HERO
      ───────────────────────────────────────────── */}
      <section className="pt-32 pb-20 lg:pt-44 lg:pb-28 px-6 bg-background">
        <div className="max-w-[680px] mx-auto text-center">

          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-6
                        animate-fade-in-up">
            Simulador de entrevistas com IA
          </p>

          <h1 className="text-[44px] sm:text-[60px] lg:text-[72px] font-bold
                         tracking-display leading-[1.02] text-foreground mb-6
                         animate-fade-in-up-delay-1">
            A entrevista real não tem<br />
            segunda chance. O treino tem.
          </h1>

          <p className="text-lg sm:text-xl text-muted-fg leading-[1.75] mb-10
                        max-w-[540px] mx-auto animate-fade-in-up-delay-2">
            Um entrevistador de IA que fala com você por voz, pergunta sobre o
            seu currículo e a sua vaga, e mostra exatamente onde você perde
            pontos — antes do recrutador ver.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3
                          animate-fade-in-up-delay-3">
            <button
              onClick={() => router.push(hasHistory && user ? '/planos' : '/setup')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                         bg-foreground text-background px-7 py-3.5 rounded-lg
                         font-semibold text-[15px] hover:opacity-90 transition-opacity duration-150">
              {hasHistory && user ? 'Fazer entrevista' : 'Começar grátis'}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <a href="#como-funciona"
               className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5
                          border border-border text-foreground px-7 py-3.5 rounded-lg
                          font-medium text-[15px] hover:bg-muted hover:border-border-strong
                          transition-all duration-150">
              Ver como funciona
            </a>
          </div>

          <p className="text-[13px] text-muted-fg mb-12">
            {hasHistory && user
              ? 'Adicione créditos para continuar praticando'
              : '3 perguntas grátis · Sem cartão · Sem cadastro'}
          </p>

          {/* Social proof */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1
                          text-[13px] text-muted-fg mb-16">
            <span>Feedback detalhado ao final</span>
            <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">·</span>
            <span>Português e inglês</span>
          </div>

          {/* Product screenshot — tela real da entrevista */}
          <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800
                          shadow-[0_2px_8px_rgba(0,0,0,0.04),0_24px_56px_rgba(0,0,0,0.10)]">

            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3
                            bg-zinc-100 dark:bg-zinc-900
                            border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
              <span className="ml-3 text-xs text-zinc-400 font-mono select-none">
                entrevistador-ia.com.br/entrevista
              </span>
            </div>

            <Image
              src="/screenshot-entrevista.png"
              alt="Tela da entrevista: Sarah, a entrevistadora virtual, conversando com a candidata com transcrição em tempo real"
              width={1280}
              height={720}
              priority
              className="w-full h-auto block"
            />
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 2 — PROBLEMA
      ───────────────────────────────────────────── */}
      <section id="problema" className="py-24 lg:py-32 px-6 bg-zinc-950 dark:bg-zinc-900">
        <div className="max-w-[1120px] mx-auto">

          <div className="max-w-[600px] mb-14">
            <h2 className="text-[32px] lg:text-[44px] font-bold text-white
                           tracking-heading leading-[1.08] mb-5">
              Você sabe a resposta.<br />
              Mas na hora trava.
            </h2>
            <p className="text-zinc-400 text-lg leading-[1.75]">
              Entrevista não se perde por falta de conhecimento. Se perde por
              falta de treino — e treino de verdade, com pressão, ninguém tem
              onde fazer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <Zap className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />,
                title: 'Você fica nervoso',
                desc: 'Você ensaiou no chuveiro, no espelho, na cabeça. Mas sem alguém do outro lado fazendo a pergunta, o nervosismo da hora H continua intacto.',
              },
              {
                icon: <MessageSquare className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />,
                title: 'Suas respostas soam vagas',
                desc: 'Você sabe o que fez, mas a resposta sai solta, sem começo, meio e fim. O recrutador não avalia o que você sabe — avalia o que você consegue explicar.',
              },
              {
                icon: <Users className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />,
                title: 'Você não treina porque não tem com quem',
                desc: 'Pedir pra um amigo fingir de recrutador é constrangedor — e ele não vai te dizer a verdade. Você sai da entrevista real sem saber o que errou.',
              },
            ].map((item, i) => (
              <div key={i}
                   className="bg-zinc-900 dark:bg-zinc-800 rounded-xl p-7
                              border border-zinc-800 dark:border-zinc-700
                              hover:-translate-y-0.5 hover:shadow-md
                              transition-all duration-200 cursor-pointer">
                <div className="mb-5" aria-hidden="true">{item.icon}</div>
                <h3 className="font-semibold text-white text-[15px] mb-3 leading-snug">
                  {item.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 3 — COMO FUNCIONA (4 passos)
      ───────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 lg:py-32 px-6 bg-muted">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Do zero à entrevista em 2 minutos
            </p>
            <h2 className="text-[32px] lg:text-[44px] font-bold text-foreground
                           tracking-heading leading-[1.08]">
              Quatro passos. Nenhuma desculpa.
            </h2>
          </div>

          {/* Desktop: 4 cards em linha com setas */}
          <div className="hidden md:flex items-start gap-1">
            {[
              {
                num: '01',
                icon: <FileText className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Compartilhe seu currículo',
                desc: 'Envie o PDF ou responda 4 perguntas rápidas. Com o currículo, as perguntas miram a SUA experiência — não um roteiro genérico.',
              },
              {
                num: '02',
                icon: <MessageSquare className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Informe a vaga',
                desc: 'Cole a descrição da vaga que você quer. Não tem uma? Digite o cargo e a IA monta uma vaga realista na hora.',
              },
              {
                num: '03',
                icon: <Settings className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Configure e inicie',
                desc: 'Sarah, Carlos ou Alex. Português ou inglês. 7 ou 14 perguntas. Trinta segundos de escolhas e a entrevista começa.',
              },
              {
                num: '04',
                icon: <BarChart3 className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Receba seu feedback',
                desc: 'Nota geral, mapa de competências, análise de cada resposta e como um profissional sênior teria respondido. Pronto em segundos.',
              },
            ].map((step, i, arr) => (
              <Fragment key={step.num}>
                <div className="flex-1 bg-card rounded-xl p-7 border border-border
                                hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover
                                transition-all duration-200">
                  <span aria-hidden="true"
                        className="block text-[44px] font-bold font-mono tabular-nums
                                   text-zinc-200 dark:text-zinc-700 leading-none mb-5">
                    {step.num}
                  </span>
                  <div className="mb-4" aria-hidden="true">{step.icon}</div>
                  <h3 className="font-semibold text-foreground text-[14px] leading-snug mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-fg text-sm leading-[1.7]">{step.desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center justify-center shrink-0 pt-14 px-0.5"
                       aria-hidden="true">
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Mobile: lista vertical com linha conectora à esquerda */}
          <div className="md:hidden">
            <div className="relative pl-10">
              <div className="absolute left-[18px] top-5 bottom-5 w-px bg-border"
                   aria-hidden="true" />
              <div className="space-y-5">
                {[
                  {
                    num: '01',
                    title: 'Compartilhe seu currículo',
                    desc: 'Envie o PDF ou responda 4 perguntas rápidas. Com o currículo, as perguntas miram a SUA experiência — não um roteiro genérico.',
                  },
                  {
                    num: '02',
                    title: 'Informe a vaga',
                    desc: 'Cole a descrição da vaga que você quer. Não tem uma? Digite o cargo e a IA monta uma vaga realista na hora.',
                  },
                  {
                    num: '03',
                    title: 'Configure e inicie',
                    desc: 'Sarah, Carlos ou Alex. Português ou inglês. 7 ou 14 perguntas. Trinta segundos de escolhas e a entrevista começa.',
                  },
                  {
                    num: '04',
                    title: 'Receba seu feedback',
                    desc: 'Nota geral, mapa de competências, análise de cada resposta e como um profissional sênior teria respondido. Pronto em segundos.',
                  },
                ].map((step) => (
                  <div key={step.num} className="flex gap-4 items-start">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-card border border-border
                                    flex items-center justify-center z-10 relative">
                      <span className="text-[10px] font-bold font-mono text-muted-fg">
                        {step.num}
                      </span>
                    </div>
                    <div className="bg-card rounded-xl p-5 border border-border flex-1">
                      <h3 className="font-semibold text-foreground text-[14px] leading-snug mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-fg text-sm leading-[1.7]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 4 — RECURSOS
      ───────────────────────────────────────────── */}
      <section id="recursos" className="py-24 lg:py-32 px-6 bg-background">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Recursos
            </p>
            <h2 className="text-[32px] lg:text-[44px] font-bold text-foreground
                           tracking-heading leading-[1.08]">
              Mais que um chatbot.<br />
              Uma entrevista de verdade.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border
                          rounded-xl overflow-hidden border border-border">
            {[
              {
                icon: <Mic className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Voz humana real',
                desc: 'O entrevistador fala. Você responde pelo microfone, em voz alta — porque é falando que você trava, não digitando.',
              },
              {
                icon: <FileText className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Personalizado para sua vaga',
                desc: 'As perguntas nascem do seu currículo e da vaga que você colou. A pergunta difícil daqui é a mesma que vem na entrevista real.',
              },
              {
                icon: <Globe className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Português e inglês',
                desc: 'Treine na língua da vaga. Alterne entre português BR e inglês em qualquer sessão.',
              },
              {
                icon: <Users className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: '3 entrevistadores diferentes',
                desc: 'Sarah, Carlos ou Alex — perfis e estilos distintos para você se adaptar a qualquer recrutador.',
              },
              {
                icon: <MessageSquare className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Feedback por pergunta',
                desc: 'Cada resposta recebe nota, ponto forte e o que faltou — com a resposta ideal do lado, pra você ver a diferença.',
              },
              {
                icon: <TrendingUp className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Histórico de evolução',
                desc: 'Compare seu desempenho ao longo do tempo. Veja onde melhorou e onde ainda precisa evoluir.',
              },
            ].map((item, i) => (
              <div key={i}
                   className="bg-background p-8 flex gap-5
                              hover:bg-muted transition-colors duration-150">
                <div className="mt-0.5 shrink-0" aria-hidden="true">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-foreground text-[15px] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-fg text-sm leading-[1.7]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 4B — RELATÓRIO DETALHADO
      ───────────────────────────────────────────── */}
      <section id="relatorio" className="py-24 lg:py-32 px-6 bg-muted">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Relatório completo
            </p>
            <h2 className="text-[32px] lg:text-[44px] font-bold text-foreground
                           tracking-heading leading-[1.08] mb-5">
              Tudo que você precisa para<br />
              melhorar de verdade
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed max-w-[560px]">
              Ao final de cada entrevista, você recebe um relatório detalhado —
              não apenas uma nota. Cada resposta analisada, cada competência
              mapeada, cada melhoria apontada.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

            {/* Coluna esquerda — itens do relatório */}
            <div className="flex flex-col">
              {[
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5"
                         strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18M9 21V9"/>
                    </svg>
                  ),
                  title: 'Nota geral de 0 a 100',
                  desc:  'Uma pontuação objetiva do seu desempenho geral na entrevista, com indicação de faixa — em desenvolvimento, adequado, bom ou excelente.',
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5"
                         strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ),
                  title: 'Mapa de competências',
                  desc:  '5 competências avaliadas individualmente: comunicação, raciocínio analítico, conhecimento técnico, liderança e adaptabilidade. Você vê onde está forte e onde precisa evoluir.',
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5"
                         strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"/>
                      <line x1="8" y1="12" x2="21" y2="12"/>
                      <line x1="8" y1="18" x2="21" y2="18"/>
                      <polyline points="3 6 4 7 6 5"/>
                      <polyline points="3 12 4 13 6 11"/>
                      <polyline points="3 18 4 19 6 17"/>
                    </svg>
                  ),
                  title: 'Análise pergunta por pergunta',
                  desc:  'Cada resposta avaliada com nota individual, pontos fortes identificados e o que poderia ter sido melhor. Nenhuma resposta passa sem feedback.',
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5"
                         strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6"/>
                      <path d="M10 22h4"/>
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                    </svg>
                  ),
                  title: 'Resposta ideal para cada pergunta',
                  desc:  'Como um profissional sênior responderia àquela mesma pergunta. Um modelo de referência para você comparar e aprender com a diferença.',
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5"
                         strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  ),
                  title: 'Feedback em texto corrido',
                  desc:  'Uma análise narrativa do seu desempenho geral — tom, estrutura das respostas, uso de exemplos concretos, clareza e postura comunicacional.',
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5"
                         strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/>
                      <circle cx="6" cy="12" r="3"/>
                      <circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  ),
                  title: 'Resultado compartilhável por link',
                  desc:  'Seu relatório gera um link público único. Compartilhe com um mentor, coach ou amigo para receber uma segunda opinião sobre seu desempenho.',
                },
              ].map((item, i, arr) => (
                <div key={i}>
                  <div className="flex gap-4 py-6 hover:-translate-y-0.5 transition-transform duration-200">
                    <div className="mt-0.5 shrink-0 text-muted-fg" aria-hidden="true">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-[15px] mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-muted-fg text-sm leading-[1.7]">{item.desc}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="border-b border-border" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>

            {/* Coluna direita — screenshot real do relatório */}
            <div className="lg:sticky lg:top-8">
              <Image
                src="/screenshot-relatorio.png"
                alt="Relatório da entrevista: nota geral 81 de 100, scores de clareza, relevância e profundidade, ponto forte, melhoria e análise por pergunta"
                width={1200}
                height={900}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-700
                           shadow-[0_2px_8px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.08)]
                           w-full h-auto"
              />
            </div>

          </div>

          {/* Nota de destaque */}
          <div className="mt-12 p-6 rounded-2xl bg-zinc-950 dark:bg-zinc-900 text-center">
            <p className="text-white font-semibold text-lg mb-1">
              Tudo isso em menos de 5 minutos.
            </p>
            <p className="text-zinc-400 text-sm">
              O relatório é gerado automaticamente ao final da sua entrevista —
              sem espera, sem formulário, sem custo adicional.
            </p>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 5 — VEJA EM AÇÃO (showcase de screenshots reais)
          Se um dia houver vídeo demo real, ele pode substituir este showcase.
      ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 px-6 bg-muted">
        <div className="max-w-[800px] mx-auto">

          <div className="mb-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Veja em ação
            </p>
            <h2 className="text-[32px] lg:text-[40px] font-bold text-foreground
                           tracking-heading leading-[1.08]">
              Do currículo ao relatório,{' '}<br className="hidden sm:block" />
              em 5 passos
            </h2>
          </div>

          <DemoShowcase />

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 6 — PERSONAS
      ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 px-6 bg-background">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Para quem é
            </p>
            <h2 className="text-[32px] lg:text-[44px] font-bold text-foreground
                           tracking-heading leading-[1.08]">
              Feito para quem leva carreira a sério
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: 'Pedro, 24 anos',
                situation: 'Recém-formado · Primeiro emprego',
                pain: 'Nunca fez uma entrevista formal de verdade. Trava quando perguntam sobre experiência.',
                result: 'Treina como apresentar seu potencial mesmo sem histórico profissional extenso.',
              },
              {
                name: 'Marina, 31 anos',
                situation: 'Em transição de carreira · Mudando de área',
                pain: 'Tem 7 anos de experiência, mas em outra função. Não sabe como vender sua trajetória.',
                result: 'Aprende a conectar experiência anterior com o novo cargo e convencer o recrutador.',
              },
              {
                name: 'Rafael, 29 anos',
                situation: 'Dev buscando senioridade',
                pain: 'É bom tecnicamente, mas trava em perguntas comportamentais e de liderança.',
                result: 'Pratica as respostas técnicas e comportamentais separadamente, por tipo de vaga.',
              },
              {
                name: 'Camila, 38 anos',
                situation: 'Buscando posição de liderança',
                pain: 'Quer uma posição C-level mas precisa refinar como comunica visão e resultados.',
                result: 'Pratica estruturar raciocínio estratégico e liderança com exemplos concretos.',
              },
            ].map((p, i) => (
              <div key={i}
                   className="bg-card rounded-xl p-7 border border-border
                              hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover
                              transition-all duration-200 cursor-pointer">
                <div className="mb-5">
                  <p className="font-semibold text-foreground text-[15px]">{p.name}</p>
                  <p className="text-[11px] uppercase tracking-eyebrow text-muted-fg mt-1">
                    {p.situation}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-eyebrow
                                   text-zinc-400 dark:text-zinc-500 mb-1.5">
                      Dor
                    </p>
                    <p className="text-sm text-muted-fg leading-[1.7]">{p.pain}</p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-eyebrow
                                   text-[#16a34a] mb-1.5">
                      Resultado
                    </p>
                    <p className="text-sm text-foreground leading-[1.7]">{p.result}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 7 — DEPOIMENTOS
          Renderiza só quando TESTIMONIALS tiver depoimentos reais.
          (Métricas com contador animado: layout no histórico do git —
          reativar quando houver números reais.)
      ───────────────────────────────────────────── */}
      {TESTIMONIALS.length > 0 && (
        <section id="depoimentos" className="py-24 lg:py-32 px-6 bg-muted">
          <div className="max-w-[1120px] mx-auto">

            <div className="mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
                O que dizem
              </p>
              <h2 className="text-[28px] lg:text-[36px] font-bold text-foreground
                             tracking-heading leading-[1.08]">
                Quem praticou, saiu na frente
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TESTIMONIALS.map((t, i) => (
                <div key={i}
                     className="bg-card rounded-xl p-7 border border-border flex flex-col
                                hover:-translate-y-0.5 hover:shadow-card-hover
                                transition-all duration-200">
                  <p className="text-[52px] font-bold text-zinc-200 dark:text-zinc-700
                                 leading-none mb-4 select-none" aria-hidden="true">
                    &ldquo;
                  </p>
                  <p className="text-muted-fg text-[15px] leading-[1.75] italic mb-6 flex-1">
                    {t.text}
                  </p>
                  <div className="flex items-center gap-3 pt-5 border-t border-border">
                    <div className="w-9 h-9 rounded-full bg-muted border border-border shrink-0
                                    flex items-center justify-center text-sm font-semibold
                                    text-muted-fg select-none"
                         aria-hidden="true">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      {(t.role || t.company) && (
                        <p className="text-xs text-muted-fg">
                          {[t.role, t.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────
          SEÇÃO 8 — PRICING
      ───────────────────────────────────────────── */}
      <section id="precos" className="py-24 lg:py-32 px-6 bg-background">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Preços
            </p>
            <h2 className="text-[32px] lg:text-[44px] font-bold text-foreground
                           tracking-heading leading-[1.08] mb-3">
              Menos que o Uber até a entrevista.
            </h2>
            <p className="text-muted-fg text-lg">
              Teste grátis, sem cadastro. Uma entrevista completa custa menos
              que um lanche.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Grátis / Sua conta */}
            {hasHistory && user ? (
              <div className="bg-card rounded-xl p-7 border border-border flex flex-col
                              hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
                <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-5">
                  Sua conta
                </p>
                <div className="mb-7">
                  <p className="text-[44px] font-bold font-mono tabular-nums text-foreground leading-none">
                    ✓
                  </p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Histórico salvo', 'Resultados anteriores', 'Continue evoluindo']
                    .map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-fg">
                      <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5"
                             strokeWidth={2.5} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/historico"
                  className="block w-full text-center border border-border text-muted-fg
                             py-2.5 rounded-lg text-sm font-medium hover:border-border-strong
                             hover:text-foreground transition-all duration-150">
                  Ver histórico
                </Link>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-7 border border-border flex flex-col
                              hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
                <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-5">
                  Grátis
                </p>
                <div className="mb-7">
                  <p className="text-[44px] font-bold font-mono tabular-nums text-foreground leading-none">
                    R$0
                  </p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {['3 perguntas grátis', 'Sem cadastro para começar', 'Veja como é antes de pagar']
                    .map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-fg">
                      <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5"
                             strokeWidth={2.5} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/setup"
                  className="block w-full text-center border border-border text-muted-fg
                             py-2.5 rounded-lg text-sm font-medium hover:border-border-strong
                             hover:text-foreground transition-all duration-150">
                  Começar agora
                </Link>
              </div>
            )}

            {/* Avulso — destaque */}
            <div className="bg-zinc-950 dark:bg-zinc-100 rounded-xl p-7
                            border border-transparent relative flex flex-col
                            hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
              <div className="absolute -top-3 left-6">
                <span className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950
                                 text-[11px] font-semibold px-3 py-1 rounded-full">
                  Mais popular
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-zinc-500 mb-5">
                Avulso
              </p>
              <div className="mb-2">
                <p className="text-[44px] font-bold font-mono tabular-nums
                               text-white dark:text-zinc-950 leading-none mb-1">
                  R$12,90
                </p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">/ entrevista de 7 perguntas</p>
              </div>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 border-t
                            border-zinc-800 dark:border-zinc-200 pt-3 mt-3 mb-6">
                ou <span className="font-semibold text-zinc-200 dark:text-zinc-700">R$22,90</span> para 14 perguntas
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {['Entrevista completa personalizada', 'Relatório com nota e feedback', 'Sem assinatura']
                  .map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300 dark:text-zinc-600">
                    <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5"
                           strokeWidth={2.5} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/planos"
                className="block w-full text-center bg-white dark:bg-zinc-950
                           text-zinc-950 dark:text-white py-2.5 rounded-lg text-sm
                           font-semibold hover:opacity-90 transition-opacity duration-150">
                Ver opções
              </Link>
            </div>

            {/* Mensal Starter */}
            <div className="bg-card rounded-xl p-7 border border-border flex flex-col
                            hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-5">
                Mensal Starter
              </p>
              <div className="mb-7">
                <p className="text-[44px] font-bold font-mono tabular-nums text-foreground
                               leading-none mb-1">
                  R$39,90
                </p>
                <p className="text-sm text-muted-fg">/ mês</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['6 entrevistas de 7 perguntas/mês', 'Histórico de evolução', 'Cancele quando quiser']
                  .map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-fg">
                    <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5"
                           strokeWidth={2.5} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/planos"
                className="block w-full text-center border border-border text-muted-fg
                           py-2.5 rounded-lg text-sm font-medium hover:border-border-strong
                           hover:text-foreground transition-all duration-150">
                Assinar
              </Link>
            </div>

            {/* Mensal Pro */}
            <div className="bg-card rounded-xl p-7 border border-border flex flex-col
                            hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-5">
                Mensal Pro
              </p>
              <div className="mb-7">
                <p className="text-[44px] font-bold font-mono tabular-nums text-foreground
                               leading-none mb-1">
                  R$59,90
                </p>
                <p className="text-sm text-muted-fg">/ mês</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['6 entrevistas de 14 perguntas/mês', 'Aprofundamento máximo', 'Cancele quando quiser']
                  .map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-fg">
                    <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5"
                           strokeWidth={2.5} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/planos"
                className="block w-full text-center border border-border text-muted-fg
                           py-2.5 rounded-lg text-sm font-medium hover:border-border-strong
                           hover:text-foreground transition-all duration-150">
                Assinar
              </Link>
            </div>

          </div>

          <div className="flex items-center gap-2 text-sm text-muted-fg">
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              Pagamento seguro via Mercado Pago · Pix disponível ·
              Garantia de 7 dias (CDC art. 49)
            </span>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 9 — FAQ
      ───────────────────────────────────────────── */}
      <section id="faq" className="py-24 lg:py-32 px-6 bg-muted">
        <div className="max-w-[720px] mx-auto">

          <div className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Dúvidas frequentes
            </p>
            <h2 className="text-[32px] lg:text-[40px] font-bold text-foreground
                           tracking-heading leading-[1.08]">
              Perguntas e respostas
            </h2>
          </div>

          <div className="rounded-xl overflow-hidden border border-border">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-background">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full text-left flex items-center justify-between
                             py-5 px-6 gap-4
                             hover:bg-zinc-50 dark:hover:bg-zinc-900/50
                             transition-colors duration-150">
                  <span className="font-medium text-zinc-900 dark:text-white text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-5 h-5 shrink-0 text-zinc-400 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`} />
                </button>
                <div className={`overflow-hidden transition-all ease-out duration-200 ${
                  openFaq === i ? 'max-h-96 pb-5' : 'max-h-0'
                }`}>
                  <p className="px-6 text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
                    {item.a}
                  </p>
                </div>
                {i < FAQ_ITEMS.length - 1 && (
                  <div className="border-b border-zinc-100 dark:border-zinc-800"
                       aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 10 — SEGURANÇA E PRIVACIDADE
      ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 px-6 bg-background">
        <div className="max-w-[1120px] mx-auto">

          <div className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted-fg mb-4">
              Segurança e privacidade
            </p>
            <h2 className="text-[28px] lg:text-[36px] font-bold text-foreground
                           tracking-heading leading-[1.08]">
              Seus dados, seu controle
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Lock className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Dados protegidos',
                desc: 'Seus dados são armazenados com segurança no Supabase e nunca compartilhados com terceiros para marketing.',
              },
              {
                icon: <Shield className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Conforme a LGPD',
                desc: 'Tratamos seus dados conforme a Lei nº 13.709. Você pode solicitar exclusão a qualquer momento.',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-muted-fg" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                       strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                ),
                title: 'IA não treina com seus dados',
                desc: 'Não usamos suas respostas para treinar modelos de IA. Elas são processadas pelos provedores apenas para gerar sua entrevista e seu feedback.',
              },
              {
                icon: <CreditCard className="w-5 h-5 text-muted-fg" strokeWidth={1.5} />,
                title: 'Pagamento seguro',
                desc: 'Pagamentos via Mercado Pago com certificação PCI DSS. Não armazenamos dados de cartão.',
              },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card
                                      hover:-translate-y-0.5 hover:shadow-card-hover
                                      transition-all duration-200">
                <div className="mb-4" aria-hidden="true">{item.icon}</div>
                <h3 className="font-semibold text-foreground text-sm mb-2">{item.title}</h3>
                <p className="text-muted-fg text-sm leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 11 — CTA FINAL
      ───────────────────────────────────────────── */}
      <section className="py-28 lg:py-40 px-6 bg-zinc-950 dark:bg-zinc-900">
        <div className="max-w-[640px] mx-auto text-center">
          <h2 className="text-[40px] sm:text-[52px] font-bold text-white
                         tracking-display leading-[1.04] mb-6">
            Trave aqui, onde ninguém<br />
            está avaliando. Não lá.
          </h2>
          <p className="text-zinc-400 text-lg leading-[1.75] mb-10">
            Sua próxima entrevista pode ser em dias. As 3 primeiras perguntas
            são grátis — dá tempo de descobrir onde você trava hoje.
          </p>
          <button
            onClick={() => router.push(hasHistory && user ? '/planos' : '/setup')}
            className="bg-white text-zinc-950 px-9 py-4 rounded-lg font-semibold
                       text-[15px] hover:bg-zinc-100 transition-colors duration-150">
            {hasHistory && user ? 'Fazer entrevista' : 'Começar grátis'}
          </button>
          <p className="text-zinc-500 text-[13px] mt-4">
            {hasHistory && user
              ? 'Adicione créditos para continuar praticando'
              : 'Sem cartão de crédito · Cancele quando quiser'}
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SEÇÃO 12 — FOOTER
      ───────────────────────────────────────────── */}
      <footer className="bg-zinc-950 dark:bg-black border-t border-zinc-800 py-16 px-6">
        <div className="max-w-[1120px] mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">

            <div className="md:col-span-1">
              <p className="text-[15px] font-semibold text-white mb-3">
                Entrevistador<span className="text-zinc-500">.</span>IA
              </p>
              <p className="text-zinc-400 text-sm leading-[1.75] mb-4">
                Simulador de entrevistas de emprego com IA. Treine, receba feedback
                e chegue preparado para a entrevista que importa.
              </p>
              <a href="mailto:suporte.entrevistador.ia@gmail.com"
                 className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors duration-150">
                suporte.entrevistador.ia@gmail.com
              </a>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-zinc-500 mb-5">
                Produto
              </p>
              <ul className="space-y-3">
                {[
                  { label: 'Como funciona', href: '#como-funciona' },
                  { label: 'Recursos',      href: '#recursos'      },
                  { label: 'Preços',        href: '#precos'        },
                  { label: 'FAQ',           href: '#faq'           },
                ].map((l) => (
                  <li key={l.href}>
                    <a href={l.href}
                       className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors duration-150">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-zinc-500 mb-5">
                Legal
              </p>
              <ul className="space-y-3">
                <li>
                  <Link href="/termos"
                    className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors duration-150">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacidade"
                    className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors duration-150">
                    Política de Privacidade
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-zinc-500 mb-5">
                Suporte
              </p>
              <a href="mailto:suporte.entrevistador.ia@gmail.com"
                 className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors duration-150 block mb-2">
                suporte.entrevistador.ia@gmail.com
              </a>
              <p className="text-sm text-zinc-500">Respondemos em até 2 dias úteis</p>
            </div>

          </div>

          <div className="border-t border-zinc-800 pt-8">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} Entrevistador.IA · Todos os direitos reservados · São Paulo, Brasil
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
