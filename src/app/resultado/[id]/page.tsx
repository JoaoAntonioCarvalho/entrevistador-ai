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
import { useTheme } from 'next-themes';
import { Progress } from '@/components/ui/progress';
import { getSessionById } from '@/lib/services/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

function qualityLabel(geral: number) {
  if (geral >= 80) return { text: 'Excelente',       classes: 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]' };
  if (geral >= 60) return { text: 'Bom',             classes: 'bg-muted text-foreground border-border' };
  if (geral >= 40) return { text: 'Regular',         classes: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]' };
  return { text: 'Precisa melhorar', classes: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]' };
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

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSessionById(id).then(({ session: data, processando: proc }) => {
      setSession(data);
      setProcessando(!!proc);
      setLoading(false);
    });
  }, [id]);

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (processando) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center
                      justify-center gap-4 text-center px-4">
        <div className="w-8 h-8 border-2 border-border border-t-foreground
                        rounded-full animate-spin" />
        <p className="text-muted-fg">
          Este relatório ainda está sendo processado. Tente novamente
          em alguns instantes.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-border px-6 py-2.5
                     text-sm font-medium hover:bg-muted transition-colors"
        >
          Atualizar
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center
                      justify-center gap-4 text-center px-4">
        <p className="text-muted-fg">Resultado não encontrado ou ainda não disponível.</p>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg bg-foreground text-background px-6 py-2.5
                     text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Ir para o início
        </button>
      </div>
    );
  }

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
    <div className="min-h-dvh bg-background pb-24">
      <Header
        rightContent={
          <span className="rounded-full border border-border bg-muted
                           px-3 py-1 text-xs text-muted-fg font-medium">
            Resultado compartilhado
          </span>
        }
      />

      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Hero card */}
        <div className="rounded-xl border border-border bg-card shadow-card p-8
                        flex flex-col items-center gap-3 text-center">
          <div className="flex items-end gap-1 leading-none">
            <span className="text-7xl font-bold font-mono tabular-nums text-foreground">
              {scoreGeral}
            </span>
            <span className="text-2xl text-muted-fg font-light mb-2">/100</span>
          </div>
          <span className={`rounded-full border px-4 py-1 text-sm font-semibold ${quality.classes}`}>
            {quality.text}
          </span>
          <div className="mt-2 flex flex-col gap-0.5">
            <p className="font-semibold text-foreground text-lg">
              {jobTitulo || 'Vaga não informada'}
              {jobEmpresa ? ` @ ${jobEmpresa}` : ''}
            </p>
            <p className="text-muted-fg text-sm">{dateStr}</p>
          </div>
        </div>

        {/* Três métricas */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Clareza',      value: scoreClareza      },
            { label: 'Relevância',   value: scoreRelevancia   },
            { label: 'Profundidade', value: scoreProfundidade },
          ].map(({ label, value }) => (
            <div key={label}
                 className="rounded-xl bg-card border border-border p-4
                            flex flex-col gap-2 shadow-card">
              <div className="flex justify-between text-sm">
                <span className="text-muted-fg">{label}</span>
                <span className="font-medium">
                  <span className="text-foreground font-mono tabular-nums">{value}</span>
                  <span className="text-muted-fg">/10</span>
                </span>
              </div>
              <Progress value={value * 10}
                        className="h-2 bg-muted [&>div]:bg-foreground" />
            </div>
          ))}
        </div>

        {/* Radar de competências */}
        {radarDataMapped.some(d => d.value > 0) && (
          <div className="rounded-xl border border-border bg-card shadow-card p-6
                          flex flex-col gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Competências avaliadas
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarDataMapped}
                          margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke={isDark ? '#232321' : '#E4E4E1'} />
                <PolarAngleAxis dataKey="subject"
                                tick={{ fill: isDark ? '#8A8A82' : '#737373', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]}
                                 tick={{ fill: isDark ? '#3D3D3A' : '#ABABAA', fontSize: 10 }} />
                <Radar name="Score" dataKey="value"
                       stroke={isDark ? '#F7F7F5' : '#0C0C0A'}
                       fill={isDark ? '#F7F7F5' : '#0C0C0A'}
                       fillOpacity={0.12} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Destaques — usa feedback_script se disponível, senão avaliações */}
        {feedbackCard ? (
          <div className="rounded-xl border border-border bg-card shadow-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-foreground">
                {isEnglish ? 'Interview Summary' : 'Resumo da entrevista'}
              </h2>
              {isEnglish && (
                <div className="flex gap-1">
                  <span className="text-xs bg-muted text-muted-fg px-2 py-0.5 rounded-full">EN</span>
                  <span className="text-xs bg-foreground text-background px-2 py-0.5 rounded-full">PT</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">

              <div className="border-l-4 border-l-emerald-400 bg-[#f0fdf4] pl-4 py-3 pr-4 rounded-r-xl">
                <p className="text-[11px] font-semibold text-[#16a34a] mb-1
                               uppercase tracking-eyebrow">
                  {isEnglish ? 'Strength' : 'Ponto forte'}
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {feedbackCard.ponto_forte}
                </p>
                {isEnglish && feedbackCard.ponto_forte_pt && (
                  <div className="mt-2 pt-2 border-t border-[#bbf7d0]">
                    <p className="text-xs text-muted-fg mb-1">🇧🇷 Português</p>
                    <p className="text-sm text-muted-fg leading-relaxed italic">
                      {feedbackCard.ponto_forte_pt}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-l-4 border-l-amber-400 bg-[#fffbeb] pl-4 py-3 pr-4 rounded-r-xl">
                <p className="text-[11px] font-semibold text-[#92400e] mb-1
                               uppercase tracking-eyebrow">
                  {isEnglish ? 'Main improvement' : 'Principal melhoria'}
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {feedbackCard.melhoria_principal}
                </p>
                {isEnglish && feedbackCard.melhoria_principal_pt && (
                  <div className="mt-2 pt-2 border-t border-[#fde68a]">
                    <p className="text-xs text-muted-fg mb-1">🇧🇷 Português</p>
                    <p className="text-sm text-muted-fg leading-relaxed italic">
                      {feedbackCard.melhoria_principal_pt}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-l-4 border-l-zinc-300 bg-muted pl-4 py-3 pr-4 rounded-r-xl">
                <p className="text-[11px] font-semibold text-muted-fg mb-1
                               uppercase tracking-eyebrow">
                  {isEnglish ? 'Recommendation' : 'Recomendação'}
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {feedbackCard.recomendacao}
                </p>
                {isEnglish && feedbackCard.recomendacao_pt && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-fg mb-1">🇧🇷 Português</p>
                    <p className="text-sm text-muted-fg leading-relaxed italic">
                      {feedbackCard.recomendacao_pt}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (bestEval || worstEval) && (
          <div className="rounded-xl border border-border bg-card shadow-card p-6
                          flex flex-col gap-5">
            <h2 className="text-base font-semibold text-foreground">Destaques</h2>
            {bestEval && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[#16a34a]
                                 uppercase tracking-eyebrow">
                  Ponto forte
                </span>
                <p className="text-sm text-foreground leading-relaxed">
                  {bestEval.positivo}
                </p>
              </div>
            )}
            {worstEval && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[#92400e]
                                 uppercase tracking-eyebrow">
                  Área de melhoria
                </span>
                <p className="text-sm text-foreground leading-relaxed">
                  {worstEval.melhoria}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-xl border border-border bg-card shadow-card p-8
                        flex flex-col items-center gap-4 text-center">
          <p className="font-semibold text-foreground text-lg">Quer praticar também?</p>
          <p className="text-muted-fg text-sm max-w-sm">
            Simule entrevistas reais com IA, receba feedback detalhado e evolua a cada sessão.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-foreground text-background px-8 py-3
                       text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Começar agora — é grátis
          </button>
        </div>

      </div>

      {/* Botão de compartilhar sticky */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-full bg-foreground text-background
                     px-6 py-3 text-sm font-medium shadow-modal
                     hover:opacity-90 transition-opacity"
        >
          <Share2 className="w-4 h-4" />
          {copied ? 'Link copiado!' : 'Copiar link'}
        </button>
      </div>
    </div>
  );
}
