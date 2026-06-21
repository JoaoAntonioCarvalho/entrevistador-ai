'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle, AlertCircle, Loader2,
  FileText, Dumbbell, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { Job } from '@/lib/types';
import { useSessionStore } from '@/lib/store';

interface Props {
  onComplete:  (job: Job) => void;
  onWarning?:  (msg: string) => void;
  sessionId?:  string;
}

type Mode   = 'choose' | 'specific' | 'practice';
type Status = 'idle' | 'analyzing' | 'success' | 'error';

export default function JobInput({ onComplete, onWarning, sessionId }: Props) {
  const { session } = useSessionStore();
  const sid = sessionId ?? session.id;

  // ── modo ──────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('choose');

  // ── specific ──────────────────────────────────────────────
  const [text,     setText]    = useState('');
  const [status,   setStatus]  = useState<Status>('idle');
  const [job,      setJob]     = useState<Job | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ── practice ──────────────────────────────────────────────
  const [cargo,        setCargo]        = useState('');
  const [generatedJob, setGeneratedJob] = useState<Job | null>(null);
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState('');

  // ── TELA INICIAL ──────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500 text-center mb-4">
          Sobre qual vaga você quer praticar?
        </p>

        <button
          onClick={() => setMode('specific')}
          className="w-full flex items-center gap-4 p-4 border border-zinc-200
                     rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500
                     hover:bg-zinc-50 dark:hover:bg-zinc-800
                     transition-all text-left dark:border-zinc-700"
        >
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white text-sm">
              Tenho uma vaga específica
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cole o job description completo
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 ml-auto" />
        </button>

        <button
          onClick={() => setMode('practice')}
          className="w-full flex items-center gap-4 p-4 border border-zinc-200
                     rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500
                     hover:bg-zinc-50 dark:hover:bg-zinc-800
                     transition-all text-left dark:border-zinc-700"
        >
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white text-sm">
              Quero praticar para uma área
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Digite só o cargo — criamos a vaga para você
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 ml-auto" />
        </button>
      </div>
    );
  }

  // ── MODO ESPECÍFICO ───────────────────────────────────────
  if (mode === 'specific') {
    const isAnalyzing = status === 'analyzing';
    const isSuccess   = status === 'success';

    if (status === 'error') {
      return (
        <div className="space-y-4">
          <button
            onClick={() => { setStatus('idle'); setMode('choose'); }}
            className="flex items-center gap-1 text-sm text-zinc-500
                       hover:text-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="rounded-lg border border-red-200 bg-red-50 p-6
                          flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
            <button
              onClick={() => { setStatus('idle'); setErrorMsg(''); }}
              className="w-full rounded-md border border-zinc-200
                         hover:bg-zinc-50 px-4 py-2.5 text-sm font-medium
                         text-zinc-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setMode('choose')}
          className="flex items-center gap-1 text-sm text-zinc-500
                     hover:text-zinc-700 mb-0"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex flex-col gap-1.5">
          <textarea
            value={text}
            onChange={(e) => !isSuccess && setText(e.target.value.slice(0, 5000))}
            readOnly={isSuccess}
            placeholder="Cole aqui a descrição completa da vaga..."
            className="w-full border border-zinc-200 rounded-xl px-4 py-3
                       text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                       focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500
                       focus:ring-2 focus:ring-zinc-900/5 resize-none
                       bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 min-h-[160px]"
            rows={7}
          />
          <p className="text-xs text-zinc-500 text-right">
            {text.length} / 5000 caracteres
          </p>
        </div>

        {!isSuccess && (
          <button
            onClick={async () => {
              if (text.trim().length < 100) return;
              setStatus('analyzing');
              try {
                const res  = await fetch('/api/parse-job', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ jobDescription: text, sessionId: sid }),
                });
                const data = await res.json();
                if (res.status === 429) {
                  toast.error(data.error ?? 'Muitas requisições. Aguarde alguns minutos.');
                  setStatus('idle');
                  return;
                }
                if (!res.ok) throw new Error(data.error ?? 'Erro ao analisar vaga.');
                if (data.warning) onWarning?.(data.warning);
                setJob(data.job);
                setStatus('success');
              } catch (e: unknown) {
                setErrorMsg(e instanceof Error ? e.message : 'Erro inesperado.');
                setStatus('error');
              }
            }}
            disabled={text.trim().length < 100 || isAnalyzing}
            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 disabled:opacity-40
                       disabled:cursor-not-allowed px-4 py-2.5 text-sm
                       font-medium rounded-xl hover:bg-zinc-700 dark:hover:bg-zinc-100
                       transition-colors flex items-center justify-center
                       gap-2"
          >
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAnalyzing ? 'Analisando...' : 'Analisar vaga'}
          </button>
        )}

        {isSuccess && job && (
          <div className="rounded-lg border border-green-200 bg-green-50
                          p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-semibold">Vaga identificada</span>
            </div>
            <div>
              <p className="font-medium text-zinc-900">{job.titulo || '—'}</p>
              <p className="text-sm text-zinc-500">
                {job.empresa || 'Empresa não identificada'}
              </p>
            </div>
            {job.requisitos_obrigatorios.length > 0 && (
              <ul className="text-xs text-zinc-500 space-y-1">
                {job.requisitos_obrigatorios.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
                {job.requisitos_obrigatorios.length > 3 && (
                  <li className="text-zinc-400">
                    +{job.requisitos_obrigatorios.length - 3} requisitos detectados
                  </li>
                )}
              </ul>
            )}
            <button
              onClick={() => onComplete(job)}
              className="mt-1 w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5
                         text-sm font-medium rounded-xl hover:bg-zinc-700 dark:hover:bg-zinc-100
                         transition-colors"
            >
              Confirmar e continuar
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── MODO PRÁTICO ──────────────────────────────────────────
  async function handleGenerate() {
    if (cargo.trim().length < 3) return;
    setGenerating(true);
    setGenError('');
    try {
      const res  = await fetch('/api/generate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo: cargo.trim(), sessionId: sid }),
      });
      const data = await res.json();
      if (res.status === 429) {
        toast.error(data.error ?? 'Muitas requisições. Aguarde alguns minutos.');
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar vaga. Tente novamente.');
      setGeneratedJob(data.job);
    } catch {
      setGenError('Não foi possível gerar a vaga. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  // Preview da vaga gerada
  if (generatedJob) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                Vaga gerada pela IA
              </p>
              <h3 className="font-semibold text-zinc-900 dark:text-white text-xl">
                {generatedJob.titulo}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{generatedJob.empresa}</p>
            </div>
            <button
              onClick={() => setGeneratedJob(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700 underline"
            >
              Gerar outra
            </button>
          </div>

          {generatedJob.requisitos_obrigatorios.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase
                            tracking-wide mb-2">
                Requisitos principais
              </p>
              <ul className="space-y-1">
                {generatedJob.requisitos_obrigatorios.slice(0, 4).map((r, i) => (
                  <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                    <span className="text-zinc-400 flex-shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {generatedJob.stack_tecnica.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {generatedJob.stack_tecnica.slice(0, 6).map((s, i) => (
                <span key={i}
                      className="text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-2
                                 py-1 rounded-md">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setGeneratedJob(null)}
            className="flex-1 border border-zinc-200 dark:border-zinc-700
                       text-zinc-600 dark:text-zinc-400 py-2.5
                       rounded-xl text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800
                       transition-colors"
          >
            Gerar outra
          </button>
          <button
            onClick={() => onComplete(generatedJob)}
            className="flex-1 bg-zinc-900 text-white py-2.5 rounded-xl
                       text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Usar esta vaga ✓
          </button>
        </div>
      </div>
    );
  }

  // Campo de entrada do cargo
  return (
    <div className="space-y-4">
      <button
        onClick={() => setMode('choose')}
        className="flex items-center gap-1 text-sm text-zinc-500
                   hover:text-zinc-700"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div>
        <label className="text-sm font-medium text-zinc-700">
          Qual cargo ou área você quer praticar?
        </label>
        <input
          value={cargo}
          onChange={e => setCargo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          placeholder="Ex: Product Manager, Desenvolvedor React Sênior, Analista de Dados..."
          className="mt-1 w-full border border-zinc-200 rounded-lg px-3
                     py-2.5 text-base text-zinc-900 placeholder:text-zinc-400
                     focus:outline-none focus:border-zinc-400
                     focus:ring-2 focus:ring-zinc-900/5 bg-white"
        />
        <p className="text-xs text-zinc-500 mt-1">
          Quanto mais específico, melhor a entrevista
        </p>
      </div>

      {genError && <p className="text-sm text-red-500">{genError}</p>}

      <button
        onClick={handleGenerate}
        disabled={cargo.trim().length < 3 || generating}
        className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium
                   text-sm hover:bg-zinc-700 disabled:opacity-40
                   disabled:cursor-not-allowed transition-colors flex
                   items-center justify-center gap-2"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando vaga...</>
        ) : 'Gerar vaga →'}
      </button>
    </div>
  );
}
