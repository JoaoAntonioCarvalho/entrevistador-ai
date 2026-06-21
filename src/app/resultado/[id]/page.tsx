'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Share2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getSessionById } from '@/lib/services/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Header } from '@/components/layout/Header';

function qualityLabel(geral: number) {
  if (geral >= 80) return { text: 'Excelente', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (geral >= 60) return { text: 'Bom',       classes: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (geral >= 40) return { text: 'Regular',   classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  return { text: 'Precisa melhorar', classes: 'bg-red-50 text-red-700 border-red-200' };
}

const COMPETENCY_LABELS: Record<string, string> = {
  comunicacao:           'Comunicação',
  resolucao_problemas:   'Resolução de Problemas',
  conhecimento_tecnico:  'Técnico',
  lideranca:             'Liderança',
  adaptabilidade:        'Adaptabilidade',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SessionRow = Record<string, any>;

export default function ResultadoPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params?.id as string;

  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!id) return;
    getSessionById(id).then(data => {
      setSession(data);
      setLoading(false);
    });
  }, [id]);

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center transition-colors duration-200">
        <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // ── não encontrado ────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-4 transition-colors duration-200">
        <p className="text-zinc-500 dark:text-zinc-400">Resultado não encontrado ou ainda não disponível.</p>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
        >
          Ir para o início
        </button>
      </div>
    );
  }

  // ── dados da sessão ───────────────────────────────────────
  // Normalizar — funciona com Supabase (campos planos) e localStorage (campos aninhados)
  const scoreGeral        = session?.score_geral        ?? session?.scores?.geral        ?? 0;
  const scoreClareza      = session?.score_clareza      ?? session?.scores?.clareza      ?? 0;
  const scoreRelevancia   = session?.score_relevancia   ?? session?.scores?.relevancia   ?? 0;
  const scoreProfundidade = session?.score_profundidade ?? session?.scores?.profundidade ?? 0;

  const competencias = {
    comunicacao:          session?.competencia_comunicacao    ?? session?.competencias?.comunicacao          ?? 0,
    resolucao_problemas:  session?.competencia_resolucao      ?? session?.competencias?.resolucao_problemas  ?? 0,
    conhecimento_tecnico: session?.competencia_tecnico        ?? session?.competencias?.conhecimento_tecnico ?? 0,
    lideranca:            session?.competencia_lideranca      ?? session?.competencias?.lideranca            ?? 0,
    adaptabilidade:       session?.competencia_adaptabilidade ?? session?.competencias?.adaptabilidade       ?? 0,
  };

  const feedbackCard = (() => {
    try {
      const script = session?.feedback_script;
      if (!script) return null;
      if (typeof script === 'object') return script;
      return JSON.parse(script);
    } catch { return null; }
  })();

  const jobTitulo  = session?.job_titulo  ?? session?.job?.titulo  ?? '';
  const jobEmpresa = session?.job_empresa ?? session?.job?.empresa ?? '';
  const idioma     = session?.idioma      ?? session?.config?.idioma ?? 'pt';

  const quality    = qualityLabel(scoreGeral);
  const evaluations: { nota: number; positivo: string; melhoria: string }[] =
    Array.isArray(session?.evaluations) ? session.evaluations : [];

  const bestEval  = evaluations.filter(e => e.nota >= 7)[0] ?? null;
  const worstEval = evaluations.length
    ? evaluations.reduce((a, b) => (a.nota <= b.nota ? a : b))
    : null;

  const isEnglish = idioma === 'en';

  const radarDataMapped = Object.entries(COMPETENCY_LABELS).map(([key, label]) => ({
    subject:  label,
    value:    competencias[key as keyof typeof competencias] ?? 0,
    fullMark: 10,
  }));

  let dateStr = '';
  try {
    dateStr = format(new Date(session.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch { dateStr = session.created_at ?? ''; }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 transition-colors duration-200">
      <Header
        rightContent={
          <span className="rounded-full border border-zinc-200 dark:border-zinc-700
                           bg-zinc-50 dark:bg-zinc-800 px-3 py-1 text-xs
                           text-zinc-500 dark:text-zinc-400 font-medium">
            Resultado compartilhado
          </span>
        }
      />

      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Hero card */}
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
          <div className="flex items-end gap-1 leading-none">
            <span className="text-7xl font-bold text-zinc-900 dark:text-white tabular-nums">
              {scoreGeral}
            </span>
            <span className="text-2xl text-zinc-400 font-light mb-2">/100</span>
          </div>
          <span className={`rounded-full border px-4 py-1 text-sm font-semibold ${quality.classes}`}>
            {quality.text}
          </span>
          <div className="mt-2 flex flex-col gap-0.5">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-lg">
              {jobTitulo || 'Vaga não informada'}
              {jobEmpresa ? ` @ ${jobEmpresa}` : ''}
            </p>
            <p className="text-zinc-400 text-sm">{dateStr}</p>
          </div>
        </div>

        {/* Três métricas */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Clareza',      value: scoreClareza      },
            { label: 'Relevância',   value: scoreRelevancia   },
            { label: 'Profundidade', value: scoreProfundidade },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-4 flex flex-col gap-2 shadow-sm">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
                <span className="font-medium">
                  <span className="text-zinc-900 dark:text-white">{value}</span>
                  <span className="text-zinc-300 dark:text-zinc-500">/10</span>
                </span>
              </div>
              <Progress value={value * 10} className="h-2 bg-zinc-100 dark:bg-zinc-700 [&>div]:bg-zinc-900 dark:[&>div]:bg-white" />
            </div>
          ))}
        </div>

        {/* Radar de competências */}
        {radarDataMapped.some(d => d.value > 0) && (
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 flex flex-col gap-2">
            <h2 className="text-base font-semibold text-zinc-900">Competências avaliadas</h2>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarDataMapped} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke="#18181b" fill="#18181b" fillOpacity={0.12} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Destaques — usa feedback_script se disponível, senão avaliações */}
        {feedbackCard ? (
          <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900">
                {isEnglish ? 'Interview Summary' : 'Resumo da entrevista'}
              </h2>
              {isEnglish && (
                <div className="flex gap-1">
                  <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">EN</span>
                  <span className="text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-full">PT</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-green-700 mb-1 uppercase tracking-wide">
                    {isEnglish ? 'Strength' : 'Ponto forte'}
                  </p>
                  <p className="text-sm text-zinc-700 leading-relaxed">{feedbackCard.ponto_forte}</p>
                  {isEnglish && feedbackCard.ponto_forte_pt && (
                    <div className="mt-2 pt-2 border-t border-zinc-100">
                      <p className="text-xs text-zinc-400 mb-1">🇧🇷 Português</p>
                      <p className="text-sm text-zinc-500 leading-relaxed italic">{feedbackCard.ponto_forte_pt}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-yellow-600 text-sm">↑</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-yellow-700 mb-1 uppercase tracking-wide">
                    {isEnglish ? 'Main improvement' : 'Principal melhoria'}
                  </p>
                  <p className="text-sm text-zinc-700 leading-relaxed">{feedbackCard.melhoria_principal}</p>
                  {isEnglish && feedbackCard.melhoria_principal_pt && (
                    <div className="mt-2 pt-2 border-t border-zinc-100">
                      <p className="text-xs text-zinc-400 mb-1">🇧🇷 Português</p>
                      <p className="text-sm text-zinc-500 leading-relaxed italic">{feedbackCard.melhoria_principal_pt}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm">→</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">
                    {isEnglish ? 'Recommendation' : 'Recomendação'}
                  </p>
                  <p className="text-sm text-zinc-700 leading-relaxed">{feedbackCard.recomendacao}</p>
                  {isEnglish && feedbackCard.recomendacao_pt && (
                    <div className="mt-2 pt-2 border-t border-zinc-100">
                      <p className="text-xs text-zinc-400 mb-1">🇧🇷 Português</p>
                      <p className="text-sm text-zinc-500 leading-relaxed italic">{feedbackCard.recomendacao_pt}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (bestEval || worstEval) && (
          <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-6 flex flex-col gap-5">
            <h2 className="text-base font-semibold text-zinc-900">Destaques</h2>
            {bestEval && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Ponto forte</span>
                <p className="text-sm text-zinc-700 leading-relaxed">{bestEval.positivo}</p>
              </div>
            )}
            {worstEval && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Área de melhoria</span>
                <p className="text-sm text-zinc-700 leading-relaxed">{worstEval.melhoria}</p>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
          <p className="font-semibold text-zinc-900 dark:text-white text-lg">Quer praticar também?</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm">
            Simule entrevistas reais com IA, receba feedback detalhado e evolua a cada sessão.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-3 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Começar agora — é grátis
          </button>
        </div>

      </div>

      {/* Botão de compartilhar sticky */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-full bg-zinc-900 text-white px-6 py-3 text-sm font-medium shadow-lg hover:bg-zinc-800 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {copied ? 'Link copiado!' : 'Copiar link'}
        </button>
      </div>
    </div>
  );
}
