'use client';

import { useEffect, useState } from 'react';
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
import { useSessionStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { useRouteGuard } from '@/hooks/useRouteGuard';
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
  const { session, resetSession, setStatus } = useSessionStore();
  const custoSessao = useSessionStore(s => s.custoSessao);
  const [sessionSalva, setSessionSalva] = useState(false);

  useRouteGuard({ needsCandidate: true, needsScores: true });

  useEffect(() => {
    async function salvar() {
      try {
        setStatus('completed');

        // 1. localStorage sempre
        saveToLocalHistory(session);
        setSessionSalva(true);

        // 2. Supabase
        await saveSessionToSupabase(session);

        // 3. Telegram cost report
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
  }, []);

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

  function handleNewInterview() {
    resetSession();
    router.push('/setup');
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">

      <Header
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/historico')}
              className="text-sm text-zinc-500 dark:text-zinc-400
                         hover:text-zinc-700 dark:hover:text-zinc-200
                         border border-zinc-200 dark:border-zinc-700
                         px-4 py-2 rounded-full transition-colors
                         hidden sm:block"
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
              className={`text-sm px-4 py-2 rounded-full transition-colors border ${
                sessionSalva
                  ? 'text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500'
                  : 'text-zinc-300 dark:text-zinc-600 border-zinc-100 dark:border-zinc-800 cursor-not-allowed'
              }`}
            >
              {sessionSalva ? 'Compartilhar resultado' : 'Salvando...'}
            </button>
          </div>
        }
      />

      {/* ── HERO — Score + Resumo da IA ── */}
      <section className="border-b border-zinc-100 dark:border-zinc-800
                          bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Score hero */}
            <div className="animate-fade-in">
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500
                            uppercase tracking-widest mb-4">
                {session.job?.titulo}
                {session.job?.empresa ? ` · ${session.job.empresa}` : ''}
              </p>

              <div className="flex items-end gap-3 mb-3">
                <span className="text-8xl font-bold text-zinc-900 dark:text-white
                                 tabular-nums leading-none tracking-tighter">
                  {scores.geral ?? 0}
                </span>
                <div className="mb-4">
                  <span className="text-2xl text-zinc-300 dark:text-zinc-600">/100</span>
                </div>
              </div>

              {/* Badge de qualidade */}
              {(() => {
                const g = scores.geral ?? 0;
                const cfg =
                  g >= 80 ? { label: 'Excelente',       cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' } :
                  g >= 60 ? { label: 'Bom desempenho',  cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' } :
                  g >= 40 ? { label: 'Regular',          cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' } :
                            { label: 'Precisa melhorar', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
                return (
                  <span className={`inline-block text-sm font-semibold
                                   px-4 py-1.5 rounded-full ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                );
              })()}

              {/* 3 métricas secundárias */}
              <div className="grid grid-cols-3 gap-3 mt-8">
                {[
                  { label: 'Clareza',      value: scores.clareza      ?? 0 },
                  { label: 'Relevância',   value: scores.relevancia   ?? 0 },
                  { label: 'Profundidade', value: scores.profundidade ?? 0 },
                ].map(m => (
                  <div key={m.label}
                       className="bg-white dark:bg-zinc-800 rounded-xl p-3
                                  border border-zinc-100 dark:border-zinc-700">
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                      {m.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold tabular-nums
                                       text-zinc-900 dark:text-white">
                        {m.value}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">/10</span>
                    </div>
                    <div className="mt-2 h-1 bg-zinc-100 dark:bg-zinc-700
                                    rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 dark:bg-white
                                      rounded-full transition-all duration-700"
                           style={{ width: `${(m.value / 10) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card resumo da IA */}
            {feedbackCard && (
              <div className="animate-fade-in [animation-delay:150ms] opacity-0 space-y-4">
                {[
                  {
                    icon: '✓',
                    label: isEnglish ? 'Strength' : 'Ponto forte',
                    text: feedbackCard.ponto_forte,
                    text_pt: feedbackCard.ponto_forte_pt,
                    cls: 'border-l-emerald-400 bg-emerald-50 dark:bg-emerald-900/10',
                    labelCls: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    icon: '↑',
                    label: isEnglish ? 'Improve' : 'Melhoria',
                    text: feedbackCard.melhoria_principal,
                    text_pt: feedbackCard.melhoria_principal_pt,
                    cls: 'border-l-amber-400 bg-amber-50 dark:bg-amber-900/10',
                    labelCls: 'text-amber-600 dark:text-amber-400',
                  },
                  {
                    icon: '→',
                    label: isEnglish ? 'Next step' : 'Próximo passo',
                    text: feedbackCard.recomendacao,
                    text_pt: feedbackCard.recomendacao_pt,
                    cls: 'border-l-blue-400 bg-blue-50 dark:bg-blue-900/10',
                    labelCls: 'text-blue-600 dark:text-blue-400',
                  },
                ].map((item, i) => (
                  <div key={i}
                       className={`border-l-4 pl-4 py-3 pr-4 rounded-r-xl ${item.cls}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide
                                   mb-1 ${item.labelCls}`}>
                      {item.icon} {item.label}
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {item.text}
                    </p>
                    {isEnglish && item.text_pt && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500
                                    mt-1.5 leading-relaxed italic">
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

      {/* ── CORPO ── */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* ── ANÁLISE POR PERGUNTA ── */}
        <section className="animate-fade-in [animation-delay:300ms] opacity-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Análise por pergunta
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1
                            flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center
                                 w-5 h-5 bg-zinc-100 dark:bg-zinc-800
                                 rounded-full text-xs">
                  ↓
                </span>
                Clique em qualquer pergunta para ver o feedback detalhado
              </p>
            </div>
            <span className="text-sm text-zinc-400 dark:text-zinc-500 shrink-0">
              {evaluations?.length ?? 0} perguntas
            </span>
          </div>

          <div className="space-y-3">
            {evaluations?.map((ev, i) => (
              <div key={i}
                   className="group border border-zinc-100 dark:border-zinc-800
                              rounded-2xl overflow-hidden bg-white dark:bg-zinc-900
                              hover:border-zinc-300 dark:hover:border-zinc-600
                              hover:shadow-card transition-all duration-200">
                <details>
                  <summary className="flex items-center gap-4 p-5
                                      list-none cursor-pointer select-none
                                      [&::-webkit-details-marker]:hidden">

                    {/* Número */}
                    <div className="w-8 h-8 rounded-full bg-zinc-100
                                    dark:bg-zinc-800 flex items-center
                                    justify-center flex-shrink-0
                                    group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700
                                    transition-colors">
                      <span className="text-xs font-semibold text-zinc-500
                                       dark:text-zinc-400">
                        {i + 1}
                      </span>
                    </div>

                    {/* Texto da pergunta */}
                    <p className="flex-1 text-sm font-medium text-zinc-700
                                  dark:text-zinc-300 leading-snug">
                      {ev.pergunta.length > 80
                        ? ev.pergunta.slice(0, 80) + '...'
                        : ev.pergunta}
                    </p>

                    {/* Nota badge */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl
                                    flex items-center justify-center
                                    text-lg font-bold tabular-nums ${
                      ev.nota >= 7
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : ev.nota >= 5
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {ev.nota}
                    </div>

                    {/* Chevron animado */}
                    <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-600
                                    flex-shrink-0 transition-transform duration-200
                                    rotate-on-open"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>

                  {/* Conteúdo expandido */}
                  <div className="px-5 pb-5 pt-4 space-y-4 border-t
                                  border-zinc-100 dark:border-zinc-800">

                    {/* Sua resposta */}
                    <div>
                      <p className="text-xs font-semibold text-zinc-400
                                    dark:text-zinc-500 uppercase tracking-wide mb-2">
                        Sua resposta
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400
                                    leading-relaxed bg-zinc-50 dark:bg-zinc-800/50
                                    rounded-xl p-4">
                        &ldquo;{ev.resposta}&rdquo;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10
                                      border border-emerald-100 dark:border-emerald-900/30
                                      rounded-xl p-4">
                        <p className="text-xs font-semibold text-emerald-600
                                      dark:text-emerald-400 uppercase tracking-wide mb-2">
                          ✓ O que estava bom
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {ev.positivo}
                        </p>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/10
                                      border border-amber-100 dark:border-amber-900/30
                                      rounded-xl p-4">
                        <p className="text-xs font-semibold text-amber-600
                                      dark:text-amber-400 uppercase tracking-wide mb-2">
                          ↑ O que melhorar
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {ev.melhoria}
                        </p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/10
                                      border border-blue-100 dark:border-blue-900/30
                                      rounded-xl p-4">
                        <p className="text-xs font-semibold text-blue-600
                                      dark:text-blue-400 uppercase tracking-wide mb-2">
                          💡 Resposta ideal
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
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

        {/* ── MAPA DE COMPETÊNCIAS ── */}
        {competenciaData.some(c => c.value > 0) && (
          <section className="animate-fade-in [animation-delay:450ms] opacity-0">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
              Mapa de competências
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* Radar chart */}
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4
                              border border-zinc-100 dark:border-zinc-800">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={competenciaData}>
                    <PolarGrid stroke={isDark ? '#27272a' : '#e4e4e7'} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#71717a' }}
                    />
                    <PolarRadiusAxis
                      angle={90} domain={[0, 10]}
                      tick={{ fontSize: 9, fill: isDark ? '#52525b' : '#a1a1aa' }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="#1d4ed8"
                      fill="#1d4ed8"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Barras de competência */}
              <div className="space-y-4">
                {competenciaData.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {c.subject}
                      </span>
                      <span className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                        {c.value}
                        <span className="text-xs text-zinc-400 dark:text-zinc-600 font-normal">
                          /10
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${(c.value / 10) * 100}%`,
                          backgroundColor:
                            c.value >= 7 ? '#10b981' :
                            c.value >= 5 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>
        )}

        {/* ── PRÓXIMOS PASSOS ── */}
        {proximosPassos.length > 0 && (
          <section className="animate-fade-in [animation-delay:600ms] opacity-0">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
              Próximos passos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {proximosPassos.map((passo, i) => (
                <div key={i}
                     className="bg-white dark:bg-zinc-900 rounded-2xl p-5
                                border border-zinc-100 dark:border-zinc-800
                                hover:border-zinc-200 dark:hover:border-zinc-700
                                hover:-translate-y-0.5 hover:shadow-card
                                transition-all duration-200">
                  <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800
                                  rounded-lg flex items-center justify-center
                                  mb-4 text-base">
                    {i === 0 ? '🎯' : i === 1 ? '📚' : '💪'}
                  </div>
                  <p className="text-xs font-semibold text-zinc-400
                                dark:text-zinc-500 uppercase tracking-wide mb-2">
                    {passo.competencia}
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {passo.recomendacao}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── TRANSCRIÇÃO ── */}
        <section className="animate-fade-in [animation-delay:750ms] opacity-0">
          <details>
            <summary className="flex items-center justify-between cursor-pointer
                                select-none list-none [&::-webkit-details-marker]:hidden
                                py-4 border-t border-zinc-100 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Transcrição completa
              </h2>
              <div className="flex items-center gap-3">
<svg className="w-4 h-4 text-zinc-400 dark:text-zinc-600
                                transition-transform duration-200 rotate-on-open"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
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
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {turn.role === 'interviewer' ? 'E' : 'V'}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    turn.role === 'interviewer'
                      ? 'bg-zinc-50 dark:bg-zinc-800 rounded-tl-sm'
                      : 'bg-blue-50 dark:bg-blue-900/20 rounded-tr-sm'
                  }`}>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {turn.text}
                    </p>
                    {turn.timestamp && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
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

        {/* ── AÇÕES FINAIS ── */}
        <section className="border-t border-zinc-100 dark:border-zinc-800 pt-8 pb-4">
          <div className="flex justify-center">
            <button
              onClick={handleNewInterview}
              className="max-w-xs bg-zinc-900 dark:bg-white
                         text-white dark:text-zinc-900 px-6 py-3
                         rounded-full font-medium text-sm
                         hover:bg-zinc-700 dark:hover:bg-zinc-100
                         transition-colors text-center">
              Nova entrevista →
            </button>
          </div>
        </section>

      </div>

    </div>
  );
}
