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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClipboardList } from 'lucide-react';
import { getUserHistory, getHistoryByJob, type SessionSummary } from '@/lib/services/supabase';
import { Header } from '@/components/layout/Header';
import { useRouteGuard } from '@/hooks/useRouteGuard';

export const dynamic = 'force-dynamic';

function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-50 text-green-700 border border-green-200';
  if (score >= 60) return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (score >= 40) return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  return 'bg-red-50 text-red-700 border border-red-200';
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
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className="font-semibold text-zinc-900">Pontuação: {payload[0].value}/100</p>
      {payload[0].payload.vaga && (
        <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-[160px]">{payload[0].payload.vaga}</p>
      )}
    </div>
  );
}

export default function HistoricoPage() {
  useRouteGuard({ requireAuth: true });

  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white
                    transition-colors duration-200">
      <Header backTo="/" backLabel="← Início" />
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">

        {/* Título da página */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Seu histórico de entrevistas
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Acompanhe sua evolução ao longo do tempo
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-zinc-400 mt-4">Carregando histórico...</p>
            </div>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">Nenhuma entrevista ainda</h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs">
              Complete sua primeira entrevista para ver seu histórico e acompanhar sua evolução aqui.
            </p>
            <button
              onClick={() => router.push('/setup')}
              className="mt-6 bg-zinc-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Fazer primeira entrevista
            </button>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <>
            {/* Resumo geral */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Total</span>
                <span className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-white">{sessions.length}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">entrevista{sessions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Melhor pontuação</span>
                <span className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-white">{bestScore ?? '—'}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">de 100 pontos</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Evolução</span>
                <span className={`text-4xl font-bold tabular-nums ${
                  evolution === null ? 'text-zinc-400'
                  : evolution > 0 ? 'text-green-600'
                  : evolution < 0 ? 'text-red-500'
                  : 'text-zinc-900'
                }`}>
                  {evolution === null ? '—' : evolution > 0 ? `+${evolution}` : `${evolution}`}
                </span>
                <span className="text-sm text-zinc-500 mt-1">pontos desde a 1ª sessão</span>
              </div>
            </div>

            {/* Filtro por vaga */}
            {uniqueJobs.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedJob(null)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedJob === null
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                        : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                <h2 className="text-base font-semibold text-zinc-900">Evolução da pontuação</h2>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis
                        dataKey="data"
                        tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#18181b"
                        strokeWidth={2}
                        dot={{ fill: '#18181b', r: 4 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-6 py-8 text-center">
                <p className="text-zinc-400 text-sm">
                  Faça mais entrevistas para esta vaga para ver sua evolução aqui.
                </p>
              </div>
            )}

            {/* Lista de sessões */}
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-zinc-900">Entrevistas realizadas</h2>
              <div className="flex flex-col gap-3">
                {[...filteredSessions]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(s => (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-card transition-all duration-200 flex items-start justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-white truncate">
                          {s.job_titulo || 'Vaga não identificada'}
                        </p>
                        {s.job_empresa && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{s.job_empresa}</p>
                        )}
                        <p className="text-xs text-zinc-400">{formatDateLong(s.created_at)}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {s.nivel && (
                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] text-zinc-500 capitalize">
                              {s.nivel}
                            </span>
                          )}
                          {s.tipo && (
                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] text-zinc-500 capitalize">
                              {s.tipo}
                            </span>
                          )}
                          {s.total_perguntas > 0 && (
                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] text-zinc-500">
                              {s.total_perguntas} pergunta{s.total_perguntas !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className={`rounded-xl px-3 py-1.5 font-semibold text-lg ${scoreBadgeClass(s.score_geral)}`}>
                          {s.score_geral}
                        </span>
                        <button
                          onClick={() => router.push(`/resultado/${s.id}`)}
                          className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
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
