'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { Target, BookOpen, Zap, Lightbulb } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { saveSessionToSupabase, saveToLocalHistory } from '@/lib/services/supabase';
import type { CompetencyScores } from '@/lib/types';

export const dynamic = 'force-dynamic';

type CompetencyKey = keyof CompetencyScores;

const COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  comunicacao:          'Comunicação',
  resolucao_problemas:  'Resolução de Problemas',
  conhecimento_tecnico: 'Técnico',
  lideranca:            'Liderança',
  adaptabilidade:       'Adaptabilidade',
};

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, loading: authLoading } = useAuth();
  const { session, resetSession, setStatus } = useSessionStore();
  const custoSessao = useSessionStore(s => s.custoSessao);
  const [sessionSalva, setSessionSalva] = useState(false);
  const savedRef      = useRef(false);
  const authUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.id) authUserIdRef.current = user.id;
  }, [user?.id]);

  useRouteGuard({ needsCandidate: true, needsScores: true });

  useEffect(() => {
    // Aguarda auth resolver antes de salvar — evita auth_user_id null por timing
    if (authLoading || savedRef.current) return;
    savedRef.current = true;

    async function salvar() {
      try {
        setStatus('completed');
        // Usar getState() para obter a sessão com status já atualizado para 'completed'
        // A closure captura 'session' antes do setStatus acima ter efeito no React state
        const sessaoAtual = useSessionStore.getState().session;
        saveToLocalHistory(sessaoAtual);
        setSessionSalva(true);
        await saveSessionToSupabase(sessaoAtual, authUserIdRef.current ?? user?.id ?? null);

        if (custoSessao.total > 0) {
          fetch('/api/notify-cost', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId:  session.id,
              jobTitulo:  session.job?.titulo     ?? 'Não informado',
              jobEmpresa: session.job?.empresa    ?? '',
              candidato:  session.candidate?.nome ?? 'Candidato',
              avatar:     session.config?.avatar_id ?? 'sarah',
              idioma:     session.config?.idioma    ?? 'pt',
              custoIA:    custoSessao.ia,
              custoTTS:   custoSessao.tts,
              custoTotal: custoSessao.total,
              tokensIn:   custoSessao.ia_tokens_in,
              tokensOut:  custoSessao.ia_tokens_out,
              ttsChars:   custoSessao.tts_chars,
              perguntas:  session.evaluations?.length ?? 0,
              scoreGeral: session.scores?.geral ?? 0,
            }),
          }).catch(() => {});
        }
      } catch {
        setSessionSalva(true);
      }
    }

    if (session?.scores) {
      salvar();
    } else {
      setSessionSalva(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  if (!session.scores) return null;

  const { scores, competencias, evaluations, conversation, job } = session;

  const feedbackCard = (() => {
    try {
      return session.feedback_script ? JSON.parse(session.feedback_script) : null;
    } catch { return null; }
  })();

  const isEnglish = session.config?.idioma === 'en';

  const competenciaData = [
    { subject: 'Comunicação',    value: competencias?.comunicacao ?? 0 },
    { subject: 'Resolução',      value: competencias?.resolucao_problemas ?? 0 },
    { subject: 'Técnico',        value: competencias?.conhecimento_tecnico ?? 0 },
    { subject: 'Liderança',      value: competencias?.lideranca ?? 0 },
    { subject: 'Adaptabilidade', value: competencias?.adaptabilidade ?? 0 },
  ];

  const RECS: Record<string, string> = {
    comunicacao:          'Pratique o método STAR. Grave-se respondendo e analise clareza e objetividade.',
    resolucao_problemas:  'Treine problem-solving com frameworks como MECE. Resolva casos práticos.',
    conhecimento_tecnico: `Revise os conceitos da stack da vaga: ${job?.stack_tecnica?.slice(0, 3).join(', ') || 'tecnologias mencionadas'}.`,
    lideranca:            'Mapeie exemplos reais de liderança no seu histórico. Use STAR para estruturá-los.',
    adaptabilidade:       'Prepare histórias concretas de mudança e aprendizado rápido.',
  };

  const proximosPassos = Object.entries({
    comunicacao:          competencias?.comunicacao ?? 0,
    resolucao_problemas:  competencias?.resolucao_problemas ?? 0,
    conhecimento_tecnico: competencias?.conhecimento_tecnico ?? 0,
    lideranca:            competencias?.lideranca ?? 0,
    adaptabilidade:       competencias?.adaptabilidade ?? 0,
  })
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([key]) => ({
      competencia: COMPETENCY_LABELS[key as CompetencyKey] ?? key,
      recomendacao: RECS[key] ?? '',
    }));

  const passoIcons = [Target, BookOpen, Zap];

  function handleNewInterview() {
    resetSession();
    router.push('/setup');
  }

  const radarColor = isDark ? '#F7F7F5' : '#0C0C0A';

  return (
    <div className="min-h-dvh bg-background">

      <Header
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/historico')}
              className="text-sm text-muted-fg hover:text-foreground
                         border border-border px-4 py-2 rounded-lg
                         transition-colors hidden sm:block"
            >
              Ver histórico
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/resultado/${session.id}`;
                navigator.clipboard.writeText(url);
                toast.success('Link copiado!');
              }}
              disabled={!sessionSalva}
              className={`text-sm px-4 py-2 rounded-lg transition-colors border ${
                sessionSalva
                  ? 'text-muted-fg border-border hover:border-border-strong hover:text-foreground'
                  : 'opacity-50 border-border cursor-not-allowed'
              }`}
            >
              {sessionSalva ? 'Compartilhar resultado' : 'Salvando...'}
            </button>
          </div>
        }
      />

      {/* Hero — Score + Resumo da IA */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-[1120px] mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div className="animate-fade-in">
              <p className="text-[11px] font-semibold text-muted-fg
                            uppercase tracking-eyebrow mb-4">
                {session.job?.titulo}
                {session.job?.empresa ? ` · ${session.job.empresa}` : ''}
              </p>

              <div className="flex items-end gap-3 mb-3">
                <span className="text-8xl font-bold text-foreground
                                 font-mono tabular-nums leading-none tracking-tighter">
                  {scores.geral ?? 0}
                </span>
                <div className="mb-4">
                  <span className="text-2xl text-muted-fg">/100</span>
                </div>
              </div>

              {(() => {
                const g = scores.geral ?? 0;
                const cfg =
                  g >= 80 ? { label: 'Excelente',       cls: 'bg-[#f0fdf4] text-[#16a34a]' } :
                  g >= 60 ? { label: 'Bom desempenho',  cls: 'bg-muted text-foreground' } :
                  g >= 40 ? { label: 'Regular',          cls: 'bg-[#fffbeb] text-[#92400e]' } :
                            { label: 'Precisa melhorar', cls: 'bg-[#fef2f2] text-[#dc2626]' };
                return (
                  <span className={`inline-block text-sm font-semibold
                                   px-4 py-1.5 rounded-full ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                );
              })()}

              <div className="grid grid-cols-3 gap-3 mt-8">
                {[
                  { label: 'Clareza',      value: scores.clareza      ?? 0 },
                  { label: 'Relevância',   value: scores.relevancia   ?? 0 },
                  { label: 'Profundidade', value: scores.profundidade ?? 0 },
                ].map(m => (
                  <div key={m.label}
                       className="bg-card rounded-xl p-3 border border-border">
                    <div className="text-xs text-muted-fg mb-1">{m.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
                        {m.value}
                      </span>
                      <span className="text-xs text-muted-fg">/10</span>
                    </div>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-foreground rounded-full transition-all duration-700"
                           style={{ width: `${(m.value / 10) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {feedbackCard && (
              <div className="animate-fade-in [animation-delay:150ms] opacity-0 space-y-4">
                {[
                  {
                    icon: '✓',
                    label: isEnglish ? 'Strength' : 'Ponto forte',
                    text: feedbackCard.ponto_forte,
                    text_pt: feedbackCard.ponto_forte_pt,
                    cls: 'border-l-emerald-400 bg-[#f0fdf4]',
                    labelCls: 'text-[#16a34a]',
                  },
                  {
                    icon: '↑',
                    label: isEnglish ? 'Improve' : 'Melhoria',
                    text: feedbackCard.melhoria_principal,
                    text_pt: feedbackCard.melhoria_principal_pt,
                    cls: 'border-l-amber-400 bg-[#fffbeb]',
                    labelCls: 'text-[#92400e]',
                  },
                  {
                    icon: '→',
                    label: isEnglish ? 'Next step' : 'Próximo passo',
                    text: feedbackCard.recomendacao,
                    text_pt: feedbackCard.recomendacao_pt,
                    cls: 'border-l-zinc-400 bg-muted',
                    labelCls: 'text-muted-fg',
                  },
                ].map((item, i) => (
                  <div key={i}
                       className={`border-l-4 pl-4 py-3 pr-4 rounded-r-xl ${item.cls}`}>
                    <p className={`text-xs font-semibold uppercase tracking-eyebrow
                                   mb-1 ${item.labelCls}`}>
                      {item.icon} {item.label}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {item.text}
                    </p>
                    {isEnglish && item.text_pt && (
                      <p className="text-xs text-muted-fg mt-1.5 leading-relaxed italic">
                        🇧🇷 {item.text_pt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto px-6 py-10 space-y-12">

        {/* Análise por pergunta */}
        <section className="animate-fade-in [animation-delay:300ms] opacity-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg mb-1">
                Análise
              </p>
              <h2 className="text-xl font-bold tracking-heading-sm text-foreground">
                Por pergunta
              </h2>
            </div>
            <span className="text-sm text-muted-fg shrink-0 mt-1">
              {evaluations?.length ?? 0} perguntas
            </span>
          </div>

          <div className="space-y-3">
            {evaluations?.map((ev, i) => (
              <div key={i}
                   className="group border border-border rounded-xl overflow-hidden
                              bg-card hover:border-border-strong hover:shadow-card
                              transition-all duration-200">
                <details>
                  <summary className="flex items-center gap-4 p-5
                                      list-none cursor-pointer select-none
                                      [&::-webkit-details-marker]:hidden">

                    <div className="w-8 h-8 rounded-full bg-muted flex items-center
                                    justify-center flex-shrink-0
                                    group-hover:bg-muted transition-colors">
                      <span className="text-xs font-semibold text-muted-fg">
                        {i + 1}
                      </span>
                    </div>

                    <p className="flex-1 text-sm font-medium text-foreground leading-snug">
                      {ev.pergunta.length > 80
                        ? ev.pergunta.slice(0, 80) + '...'
                        : ev.pergunta}
                    </p>

                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl
                                    flex items-center justify-center
                                    text-lg font-bold font-mono tabular-nums ${
                      ev.nota >= 7
                        ? 'bg-[#f0fdf4] text-[#16a34a]'
                        : ev.nota >= 5
                        ? 'bg-[#fffbeb] text-[#92400e]'
                        : 'bg-[#fef2f2] text-[#dc2626]'
                    }`}>
                      {ev.nota}
                    </div>

                    <svg className="w-4 h-4 text-muted-fg flex-shrink-0
                                    transition-transform duration-200 rotate-on-open"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>

                  <div className="px-5 pb-5 pt-4 space-y-4 border-t border-border">

                    <div>
                      <p className="text-[11px] font-semibold text-muted-fg
                                    uppercase tracking-eyebrow mb-2">
                        Sua resposta
                      </p>
                      <p className="text-sm text-foreground leading-relaxed
                                    bg-muted rounded-xl p-4">
                        &ldquo;{ev.resposta}&rdquo;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
                        <p className="text-xs font-semibold text-[#16a34a] uppercase
                                      tracking-eyebrow mb-2">
                          ✓ O que estava bom
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {ev.positivo}
                        </p>
                      </div>

                      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-4">
                        <p className="text-xs font-semibold text-[#92400e] uppercase
                                      tracking-eyebrow mb-2">
                          ↑ O que melhorar
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {ev.melhoria}
                        </p>
                      </div>

                      <div className="bg-muted border border-border rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-fg uppercase
                                      tracking-eyebrow mb-2 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                          Resposta ideal
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {ev.resposta_ideal}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>

        {/* Mapa de competências */}
        {competenciaData.some(c => c.value > 0) && (
          <section className="animate-fade-in [animation-delay:450ms] opacity-0">
            <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg mb-1">
              Competências
            </p>
            <h2 className="text-xl font-bold tracking-heading-sm text-foreground mb-6">
              Mapa de competências
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              <div className="bg-muted rounded-xl p-4 border border-border">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={competenciaData}>
                    <PolarGrid stroke={isDark ? '#232321' : '#E4E4E1'} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: isDark ? '#8A8A82' : '#737373' }}
                    />
                    <PolarRadiusAxis
                      angle={90} domain={[0, 10]}
                      tick={{ fontSize: 9, fill: isDark ? '#3D3D3A' : '#ABABAA' }}
                    />
                    <Radar
                      dataKey="value"
                      stroke={radarColor}
                      fill={radarColor}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                {competenciaData.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {c.subject}
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums text-foreground">
                        {c.value}
                        <span className="text-xs text-muted-fg font-normal">/10</span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${(c.value / 10) * 100}%`,
                          backgroundColor:
                            c.value >= 7 ? '#16a34a' :
                            c.value >= 5 ? '#d97706' : '#dc2626',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>
        )}

        {/* Próximos passos */}
        {proximosPassos.length > 0 && (
          <section className="animate-fade-in [animation-delay:600ms] opacity-0">
            <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg mb-1">
              Plano de melhoria
            </p>
            <h2 className="text-xl font-bold tracking-heading-sm text-foreground mb-6">
              Próximos passos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {proximosPassos.map((passo, i) => {
                const Icon = passoIcons[i] ?? Target;
                return (
                  <div key={i}
                       className="bg-card rounded-xl p-5 border border-border
                                  hover:border-border-strong hover:-translate-y-0.5
                                  hover:shadow-card transition-all duration-200">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center
                                    justify-center mb-4">
                      <Icon className="w-4 h-4 text-muted-fg" aria-hidden="true" />
                    </div>
                    <p className="text-[11px] font-semibold text-muted-fg
                                  uppercase tracking-eyebrow mb-2">
                      {passo.competencia}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {passo.recomendacao}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Transcrição */}
        <section className="animate-fade-in [animation-delay:750ms] opacity-0">
          <details>
            <summary className="flex items-center justify-between cursor-pointer
                                select-none list-none [&::-webkit-details-marker]:hidden
                                py-4 border-t border-border">
              <h2 className="text-xl font-bold tracking-heading-sm text-foreground">
                Transcrição completa
              </h2>
              <svg className="w-4 h-4 text-muted-fg transition-transform duration-200
                              rotate-on-open"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="pt-4 pb-2 space-y-3">
              {conversation?.map((turn, i) => (
                <div key={i} className={`flex gap-3 ${
                  turn.role === 'candidate' ? 'flex-row-reverse' : ''
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center
                                  justify-center text-xs font-semibold
                                  flex-shrink-0 ${
                    turn.role === 'interviewer'
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-fg border border-border'
                  }`}>
                    {turn.role === 'interviewer' ? 'E' : 'V'}
                  </div>
                  <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    turn.role === 'interviewer'
                      ? 'bg-muted rounded-tl-sm'
                      : 'bg-card border border-border rounded-tr-sm'
                  }`}>
                    <p className="text-sm text-foreground leading-relaxed">
                      {turn.text}
                    </p>
                    {turn.timestamp && (
                      <p className="text-xs text-muted-fg mt-1">
                        {new Date(turn.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* Ações finais */}
        <section className="border-t border-border pt-8 pb-4">
          <div className="flex justify-start">
            <button
              onClick={handleNewInterview}
              className="bg-foreground text-background px-6 py-3
                         rounded-lg font-medium text-sm
                         hover:opacity-90 transition-opacity">
              Nova entrevista →
            </button>
          </div>
        </section>

      </div>

    </div>
  );
}
