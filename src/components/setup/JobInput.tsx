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

  const [mode, setMode] = useState<Mode>('choose');

  const [text,     setText]    = useState('');
  const [status,   setStatus]  = useState<Status>('idle');
  const [job,      setJob]     = useState<Job | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [cargo,        setCargo]        = useState('');
  const [generatedJob, setGeneratedJob] = useState<Job | null>(null);
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState('');

  if (mode === 'choose') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-fg text-center mb-4">
          Sobre qual vaga você quer praticar?
        </p>

        <button
          onClick={() => setMode('specific')}
          className="w-full flex items-center gap-4 p-4 border border-border
                     rounded-xl hover:border-border-strong hover:bg-muted
                     transition-all text-left"
        >
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-muted-fg" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              Tenho uma vaga específica
            </p>
            <p className="text-xs text-muted-fg mt-0.5">
              Cole o job description completo
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-fg ml-auto" />
        </button>

        <button
          onClick={() => setMode('practice')}
          className="w-full flex items-center gap-4 p-4 border border-border
                     rounded-xl hover:border-border-strong hover:bg-muted
                     transition-all text-left"
        >
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-muted-fg" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              Quero praticar para uma área
            </p>
            <p className="text-xs text-muted-fg mt-0.5">
              Digite só o cargo — criamos a vaga para você
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-fg ml-auto" />
        </button>
      </div>
    );
  }

  if (mode === 'specific') {
    const isAnalyzing = status === 'analyzing';
    const isSuccess   = status === 'success';

    if (status === 'error') {
      return (
        <div className="space-y-4">
          <button
            onClick={() => { setStatus('idle'); setMode('choose'); }}
            className="flex items-center gap-1 text-sm text-muted-fg
                       hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-6
                          flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[#dc2626]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
            <button
              onClick={() => { setStatus('idle'); setErrorMsg(''); }}
              className="w-full rounded-lg border border-border
                         hover:bg-muted px-4 py-2.5 text-sm font-medium
                         text-foreground transition-colors"
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
          className="flex items-center gap-1 text-sm text-muted-fg
                     hover:text-foreground mb-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex flex-col gap-1.5">
          <textarea
            value={text}
            onChange={(e) => !isSuccess && setText(e.target.value.slice(0, 5000))}
            readOnly={isSuccess}
            placeholder="Cole aqui a descrição completa da vaga..."
            className="w-full border border-border rounded-xl px-4 py-3
                       text-base text-foreground placeholder:text-muted-fg
                       focus:outline-none focus:border-border-strong
                       focus:ring-2 focus:ring-foreground/5 resize-none
                       bg-card min-h-[160px]"
            rows={7}
          />
          <p className="text-xs text-muted-fg text-right">
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
            className="w-full bg-foreground text-background disabled:opacity-40
                       disabled:cursor-not-allowed px-4 py-2.5 text-sm
                       font-medium rounded-lg hover:opacity-90
                       transition-opacity flex items-center justify-center
                       gap-2"
          >
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAnalyzing ? 'Analisando...' : 'Analisar vaga'}
          </button>
        )}

        {isSuccess && job && (
          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4]
                          p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#16a34a]">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-semibold">Vaga identificada</span>
            </div>
            <div>
              <p className="font-medium text-foreground">{job.titulo || '—'}</p>
              <p className="text-sm text-muted-fg">
                {job.empresa || 'Empresa não identificada'}
              </p>
            </div>
            {(job.requisitos_obrigatorios ?? []).length > 0 && (
              <ul className="text-xs text-muted-fg space-y-1">
                {(job.requisitos_obrigatorios ?? []).slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-border-strong mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
                {(job.requisitos_obrigatorios ?? []).length > 3 && (
                  <li className="text-muted-fg">
                    +{(job.requisitos_obrigatorios ?? []).length - 3} requisitos detectados
                  </li>
                )}
              </ul>
            )}
            <button
              onClick={() => onComplete(job)}
              className="mt-1 w-full bg-foreground text-background px-4 py-2.5
                         text-sm font-medium rounded-lg hover:opacity-90
                         transition-opacity"
            >
              Confirmar e continuar
            </button>
          </div>
        )}
      </div>
    );
  }

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
      const rawJob = data.job ?? {};
      setGeneratedJob({
        ...rawJob,
        requisitos_obrigatorios: rawJob.requisitos_obrigatorios ?? [],
        requisitos_desejaveis:   rawJob.requisitos_desejaveis   ?? [],
        responsabilidades:       rawJob.responsabilidades       ?? [],
        stack_tecnica:           rawJob.stack_tecnica           ?? [],
      });
    } catch {
      setGenError('Não foi possível gerar a vaga. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  if (generatedJob) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] text-muted-fg uppercase tracking-eyebrow mb-1">
                Vaga gerada pela IA
              </p>
              <h3 className="font-semibold text-foreground text-xl">
                {generatedJob.titulo}
              </h3>
              <p className="text-sm text-muted-fg">{generatedJob.empresa}</p>
            </div>
            <button
              onClick={() => setGeneratedJob(null)}
              className="text-xs text-muted-fg hover:text-foreground underline transition-colors"
            >
              Gerar outra
            </button>
          </div>

          {(generatedJob.requisitos_obrigatorios ?? []).length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-muted-fg uppercase
                            tracking-eyebrow mb-2">
                Requisitos principais
              </p>
              <ul className="space-y-1">
                {generatedJob.requisitos_obrigatorios.slice(0, 4).map((r, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-muted-fg flex-shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(generatedJob.stack_tecnica ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {generatedJob.stack_tecnica.slice(0, 6).map((s, i) => (
                <span key={i}
                      className="text-xs bg-muted text-muted-fg px-2
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
            className="flex-1 border border-border text-foreground py-2.5
                       rounded-lg text-sm hover:bg-muted
                       transition-colors"
          >
            Gerar outra
          </button>
          <button
            onClick={() => onComplete(generatedJob)}
            className="flex-1 bg-foreground text-background py-2.5 rounded-lg
                       text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Usar esta vaga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setMode('choose')}
        className="flex items-center gap-1 text-sm text-muted-fg
                   hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div>
        <label className="text-sm font-medium text-foreground">
          Qual cargo ou área você quer praticar?
        </label>
        <input
          value={cargo}
          onChange={e => setCargo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          placeholder="Ex: Product Manager, Desenvolvedor React Sênior, Analista de Dados..."
          className="mt-1 w-full border border-border rounded-lg px-3
                     py-2.5 text-base text-foreground placeholder:text-muted-fg
                     focus:outline-none focus:border-border-strong
                     focus:ring-2 focus:ring-foreground/5 bg-card"
        />
        <p className="text-xs text-muted-fg mt-1">
          Quanto mais específico, melhor a entrevista
        </p>
      </div>

      {genError && <p className="text-sm text-[#dc2626]">{genError}</p>}

      <button
        onClick={handleGenerate}
        disabled={cargo.trim().length < 3 || generating}
        className="w-full bg-foreground text-background py-3 rounded-lg font-medium
                   text-sm hover:opacity-90 disabled:opacity-40
                   disabled:cursor-not-allowed transition-opacity flex
                   items-center justify-center gap-2"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando vaga...</>
        ) : 'Gerar vaga →'}
      </button>
    </div>
  );
}
