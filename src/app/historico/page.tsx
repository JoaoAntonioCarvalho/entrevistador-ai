'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClipboardList } from 'lucide-react';
import { getUserHistory, getHistoryByJob, type SessionSummary } from '@/lib/services/supabase';
import { Header } from '@/components/layout/Header';
import { useRouteGuard } from '@/hooks/useRouteGuard';

export const dynamic = 'force-dynamic';

function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]';
  if (score >= 60) return 'bg-muted text-foreground border border-border';
  if (score >= 40) return 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]';
  return 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]';
}

function formatDateLong(iso: string) {
  try {
    return format(new Date(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch { return iso; }
}

function formatDateShort(iso: string) {
  try { return format(new Date(iso), 'dd/MM'); } catch { return ''; }
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { vaga: string } }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card text-sm">
      <p className="text-muted-fg text-xs mb-1">{label}</p>
      <p className="font-semibold text-foreground">Pontuação: {payload[0].value}/100</p>
      {payload[0].payload.vaga && (
        <p className="text-muted-fg text-xs mt-0.5 truncate max-w-[160px]">{payload[0].payload.vaga}</p>
      )}
    </div>
  );
}

export default function HistoricoPage() {
  useRouteGuard({ requireAuth: true });

  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [filteredSessions, setFilteredSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const data = await getUserHistory();
        setSessions(data ?? []);
        setFilteredSessions(data ?? []);
      } catch {
        setSessions([]);
        setFilteredSessions([]);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    if (selectedJob === null) {
      setFilteredSessions(sessions);
    } else {
      getHistoryByJob(selectedJob).then(data => setFilteredSessions(data));
    }
  }, [selectedJob, sessions]);

  const uniqueJobs = Array.from(new Set(sessions.map(s => s.job_titulo))).filter(Boolean);

  const bestScore = sessions.length > 0
    ? Math.max(...sessions.map(s => s.score_geral ?? 0))
    : null;

  const evolution = sessions.length >= 2
    ? (sessions[0].score_geral ?? 0) - (sessions[sessions.length - 1].score_geral ?? 0)
    : null;

  const chartData = [...filteredSessions]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((s, i) => ({
      name: `Entrevista ${i + 1}`,
      score: s.score_geral,
      data: formatDateShort(s.created_at),
      vaga: s.job_titulo,
    }));

  const lineColor = isDark ? '#F7F7F5' : '#0C0C0A';
  const gridColor = isDark ? '#232321' : '#E4E4E1';
  const tickColor = isDark ? '#8A8A82' : '#737373';

  return (
    <div className="min-h-dvh bg-background transition-colors duration-200">
      <Header backTo="/" backLabel="← Início" />
      <div className="max-w-[1120px] mx-auto px-6 py-10 flex flex-col gap-10">

        {/* Cabeçalho */}
        <div>
          <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg mb-3">
            Histórico
          </p>
          <h1 className="text-[32px] font-bold tracking-heading text-foreground leading-tight">
            Suas entrevistas
          </h1>
          <p className="text-muted-fg text-sm mt-1">
            Acompanhe sua evolução ao longo do tempo
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-fg mt-4">Carregando histórico...</p>
            </div>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-muted-fg" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhuma entrevista ainda</h3>
            <p className="text-sm text-muted-fg mt-2 max-w-xs">
              Complete sua primeira entrevista para ver seu histórico e acompanhar sua evolução aqui.
            </p>
            <button
              onClick={() => router.push('/setup')}
              className="mt-6 bg-foreground text-background px-6 py-3 rounded-lg
                         text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Fazer primeira entrevista
            </button>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 items-stretch">
              {[
                {
                  label: 'Total',
                  value: sessions.length.toString(),
                  sub: `entrevista${sessions.length !== 1 ? 's' : ''}`,
                },
                {
                  label: 'Melhor pontuação',
                  labelMobile: 'Melhor nota',
                  value: bestScore?.toString() ?? '—',
                  sub: 'de 100 pontos',
                },
                {
                  label: 'Evolução',
                  value: evolution === null ? '—' : evolution > 0 ? `+${evolution}` : `${evolution}`,
                  sub: 'pontos desde a 1ª sessão',
                  subBreakMobile: true,
                  valueClass:
                    evolution === null ? 'text-muted-fg' :
                    evolution > 0 ? 'text-[#16a34a]' :
                    evolution < 0 ? 'text-[#dc2626]' : 'text-foreground',
                },
              ].map((stat, i) => (
                <div key={i}
                     className="bg-card border border-border rounded-xl p-4 md:p-6 flex flex-col gap-1 h-full min-w-0">
                  <span className="text-[10px] md:text-[11px] font-semibold text-muted-fg
                                   uppercase tracking-eyebrow mb-2 whitespace-nowrap">
                    {stat.labelMobile ? (
                      <>
                        <span className="md:hidden">{stat.labelMobile}</span>
                        <span className="hidden md:inline">{stat.label}</span>
                      </>
                    ) : stat.label}
                  </span>
                  <span className={`text-3xl md:text-4xl font-bold font-mono tabular-nums ${
                    stat.valueClass ?? 'text-foreground'
                  }`}>
                    {stat.value}
                  </span>
                  <span className={`text-muted-fg mt-1 ${
                    stat.subBreakMobile ? 'text-[11px] md:text-sm' : 'text-sm'
                  }`}>
                    {stat.subBreakMobile ? (
                      <>
                        <span className="md:hidden">pontos desde<br />a 1ª sessão</span>
                        <span className="hidden md:inline">{stat.sub}</span>
                      </>
                    ) : stat.sub}
                  </span>
                </div>
              ))}
            </div>

            {/* Filtro por vaga */}
            {uniqueJobs.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedJob(null)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedJob === null
                      ? 'bg-foreground text-background'
                      : 'border border-border text-muted-fg hover:border-border-strong hover:text-foreground'
                  }`}
                >
                  Todas
                </button>
                {uniqueJobs.map(job => (
                  <button
                    key={job}
                    onClick={() => setSelectedJob(job)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors max-w-[200px] truncate ${
                      selectedJob === job
                        ? 'bg-foreground text-background'
                        : 'border border-border text-muted-fg hover:border-border-strong hover:text-foreground'
                    }`}
                  >
                    {job}
                  </button>
                ))}
              </div>
            )}

            {/* Gráfico de evolução */}
            {chartData.length >= 2 ? (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg">
                  Evolução
                </p>
                <h2 className="text-base font-bold text-foreground -mt-2">
                  Pontuação ao longo do tempo
                </h2>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis
                        dataKey="data"
                        tick={{ fill: tickColor, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: tickColor, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={{ fill: lineColor, r: 4 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted px-6 py-8 text-center">
                <p className="text-muted-fg text-sm">
                  Faça mais entrevistas para esta vaga para ver sua evolução aqui.
                </p>
              </div>
            )}

            {/* Lista de sessões */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold tracking-eyebrow uppercase text-muted-fg">
                Sessões
              </p>
              <h2 className="text-base font-bold text-foreground -mt-2">
                Entrevistas realizadas
              </h2>
              <div className="flex flex-col gap-3 mt-1">
                {[...filteredSessions]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(s => (
                    <div
                      key={s.id}
                      className="bg-card border border-border rounded-xl p-5
                                 hover:border-border-strong hover:shadow-card
                                 transition-all duration-200 flex items-start
                                 justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {s.job_titulo || 'Vaga não identificada'}
                        </p>
                        {s.job_empresa && (
                          <p className="text-sm text-muted-fg truncate">{s.job_empresa}</p>
                        )}
                        <p className="text-xs text-muted-fg">{formatDateLong(s.created_at)}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {s.nivel && (
                            <span className="rounded-full border border-border bg-muted
                                             px-2.5 py-0.5 text-[11px] text-muted-fg capitalize">
                              {s.nivel}
                            </span>
                          )}
                          {s.tipo && (
                            <span className="rounded-full border border-border bg-muted
                                             px-2.5 py-0.5 text-[11px] text-muted-fg capitalize">
                              {s.tipo}
                            </span>
                          )}
                          {s.total_perguntas > 0 && (
                            <span className="rounded-full border border-border bg-muted
                                             px-2.5 py-0.5 text-[11px] text-muted-fg">
                              {s.total_perguntas} pergunta{s.total_perguntas !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className={`rounded-xl px-3 py-1.5 font-bold font-mono
                                          tabular-nums text-lg ${scoreBadgeClass(s.score_geral)}`}>
                          {s.score_geral}
                        </span>
                        <button
                          onClick={() => router.push(`/resultado/${s.id}`)}
                          className="text-xs bg-foreground text-background px-3 py-1.5
                                     rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Ver relatório →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
