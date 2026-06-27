'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { usePendingSession } from '@/hooks/usePendingSession';
import ResumeUpload from '@/components/setup/ResumeUpload';
import JobInput from '@/components/setup/JobInput';
import InterviewConfig from '@/components/setup/InterviewConfig';
import { AvatarProfile, Candidate, InterviewConfig as IConfig, Job } from '@/lib/types';
import { Header } from '@/components/layout/Header';
import { notifyCurriculo, notifyVaga } from '@/lib/services/telegram';
import { useHasHistory } from '@/hooks/useHasHistory';

export const dynamic = 'force-dynamic';

const STEPS = [
  { label: 'Currículo' },
  { label: 'Vaga' },
  { label: 'Configuração' },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {STEPS.map((step, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center
                              justify-center text-sm font-semibold
                              transition-all ${
                done
                  ? 'bg-foreground text-background'
                  : active
                  ? 'bg-foreground text-background ring-4 ring-foreground/10'
                  : 'bg-muted text-muted-fg'
              }`}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5"
                       strokeLinecap="round" strokeLinejoin="round"
                       aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : num}
              </div>
              <span className={`text-xs font-medium ${
                active ? 'text-foreground' : 'text-muted-fg'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-24 h-px mx-2 mb-5 transition-colors ${
                done ? 'bg-foreground' : 'bg-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ManualFormData {
  nome: string;
  cargo: string;
  experiencia: string;
  habilidades: string;
}

export default function SetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { session, initSession, setCandidate, setJob, setConfig, setStatus, setAvatarProfiles } = useSessionStore();
  const { pending, checked: pendingChecked } = usePendingSession();
  const { hasHistory } = useHasHistory();
  const setupStep    = useSessionStore(s => s.setupStep);
  const setSetupStep = useSessionStore(s => s.setSetupStep);
  const [step,            setStep]            = useState<1 | 2 | 3>(
    (setupStep >= 1 && setupStep <= 3 ? setupStep : 1) as 1 | 2 | 3
  );
  const [warning,         setWarning]         = useState<string | null>(null);
  const [showWarning,     setShowWarning]     = useState(false);
  const [avatarProfiles,  setLocalProfiles]   = useState<AvatarProfile[] | null>(null);
  const [loadingAvatars,  setLoadingAvatars]  = useState(false);
  const [savedManualData, setSavedManualData] = useState<ManualFormData | null>(null);

  function irParaPasso(novoStep: 1 | 2 | 3) {
    setStep(novoStep);
    setSetupStep(novoStep);
  }

  useEffect(() => {
    // Se voltando de /planos com step 3 e dados de sessão, não reinicializar
    if (setupStep === 3 && session.candidate && session.job) {
      setStep(3);
      return;
    }
    initSession();
    setSetupStep(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 3 && !session.job) {
      irParaPasso(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session.job]);

  function handleResume(candidate: Candidate, mode: 'upload' | 'manual' | 'pulou') {
    setCandidate(candidate);
    notifyCurriculo(
      candidate.nome || 'Candidato',
      mode,
      candidate.cargo_atual || undefined,
      candidate.experiencias?.length || undefined,
      candidate.habilidades?.length ? candidate.habilidades : undefined,
    );
    irParaPasso(2);
  }

  async function handleJob(job: Job) {
    setJob(job);
    const modoVaga = job.descricao_completa && job.descricao_completa.length >= 100
      ? 'colou' as const
      : 'gerada' as const;
    notifyVaga(job.titulo || 'Vaga não informada', job.empresa || '', modoVaga);
    irParaPasso(3);
    setLoadingAvatars(true);
    setLocalProfiles(null);

    try {
      const res  = await fetch('/api/generate-avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, sessionId: session.id }),
      });
      const data = await res.json();

      const profiles: AvatarProfile[] = [
        {
          id: 'sarah', nome: 'Sarah', genero: 'feminino',
          imagem: '/avatars/sarah.jpg', voice_id_pt: '', voice_id_en: '',
          titulo_pt:        data.avatars.sarah.titulo_pt,
          descricao_pt:     data.avatars.sarah.descricao_pt,
          especialidade_pt: data.avatars.sarah.especialidade_pt,
          titulo_en:        data.avatars.sarah.titulo_en,
          descricao_en:     data.avatars.sarah.descricao_en,
          especialidade_en: data.avatars.sarah.especialidade_en,
        },
        {
          id: 'carlos', nome: 'Carlos', genero: 'masculino',
          imagem: '/avatars/carlos.jpg', voice_id_pt: '', voice_id_en: '',
          titulo_pt:        data.avatars.carlos.titulo_pt,
          descricao_pt:     data.avatars.carlos.descricao_pt,
          especialidade_pt: data.avatars.carlos.especialidade_pt,
          titulo_en:        data.avatars.carlos.titulo_en,
          descricao_en:     data.avatars.carlos.descricao_en,
          especialidade_en: data.avatars.carlos.especialidade_en,
        },
        {
          id: 'alex', nome: 'Alex', genero: 'neutro',
          imagem: '/avatars/alex.jpg', voice_id_pt: '', voice_id_en: '',
          titulo_pt:        data.avatars.alex.titulo_pt,
          descricao_pt:     data.avatars.alex.descricao_pt,
          especialidade_pt: data.avatars.alex.especialidade_pt,
          titulo_en:        data.avatars.alex.titulo_en,
          descricao_en:     data.avatars.alex.descricao_en,
          especialidade_en: data.avatars.alex.especialidade_en,
        },
      ];

      setLocalProfiles(profiles);
      setAvatarProfiles(profiles);
    } catch {
      // Fallback: InterviewConfig usará AVATAR_PROFILES dos constants
      setLocalProfiles(null);
    } finally {
      setLoadingAvatars(false);
    }
  }

  function handleWarning(msg: string) {
    setWarning(msg);
  }

  async function iniciarEntrevista() {
    if (hasHistory && user?.id) {
      try {
        const res = await fetch('/api/credits/check', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ authUserId: user.id, sessionId: null }),
        });
        const data = await res.json();
        if (!data.hasCredit) {
          router.push('/planos');
          return;
        }
      } catch { /* em caso de erro, permitir prosseguir */ }
    }
    setSetupStep(1);
    setStatus('active');
    router.push('/camera-check');
  }

  function handleConfig(cfg: IConfig) {
    setConfig(cfg);

    const candidateIsEmpty =
      !session.candidate?.experiencias?.length &&
      !session.candidate?.habilidades?.length;

    const jobIsGenerated =
      !session.job?.descricao_completa ||
      session.job.descricao_completa.length < 100;

    if (candidateIsEmpty && jobIsGenerated) {
      setShowWarning(true);
      return;
    }

    iniciarEntrevista();
  }

  const stepTitles: Record<number, string> = {
    1: 'Seu currículo',
    2: 'A vaga',
    3: 'Configure a entrevista',
  };

  return (
    <div className="min-h-dvh bg-background transition-colors duration-200">

      <Header backTo="/" backLabel="← Início" />

      {/* Bloquear setup se há sessão ativa não paga */}
      {pendingChecked && pending && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950
                        flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">

            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800
                            rounded-full flex items-center justify-center
                            mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round"
                   className="text-zinc-700 dark:text-zinc-300">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Você tem uma entrevista em andamento
            </h2>

            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-2">
              {pending.jobTitulo}
              {pending.jobEmpresa ? ` — ${pending.jobEmpresa}` : ''}
            </p>

            <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-8">
              Para começar uma nova entrevista, você precisa finalizar
              ou descartar a entrevista atual primeiro.
            </p>

            {/* Card de desconto */}
            <div className="bg-zinc-950 dark:bg-zinc-100 rounded-2xl p-5 mb-4 text-left">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-zinc-400
                              dark:text-zinc-500 uppercase tracking-widest">
                  Finalizar esta entrevista
                </p>
                <span className="bg-white dark:bg-zinc-900 text-zinc-900
                                 dark:text-white text-[11px] font-bold
                                 px-2 py-0.5 rounded-full">
                  -23% OFF
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-white dark:text-zinc-900">
                  R$9,90
                </span>
                <span className="text-base text-zinc-500 dark:text-zinc-400 line-through">
                  R$12,90
                </span>
              </div>
              <button
                onClick={() => router.push(
                  `/interview?resume=true&sessionId=${pending.sessionId}&showPayment=true`
                )}
                className="w-full bg-white dark:bg-zinc-900 text-zinc-900
                           dark:text-white py-3 rounded-full font-semibold
                           text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800
                           transition-colors"
              >
                Continuar e finalizar →
              </button>
            </div>

            {/* Descartar */}
            <button
              onClick={async () => {
                try {
                  await fetch('/api/session/discard', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId:  pending.sessionId,
                      authUserId: user?.id,
                    }),
                  });
                } catch { /* silencioso */ }
                window.location.reload();
              }}
              className="text-sm text-zinc-400 dark:text-zinc-500
                         hover:text-zinc-600 dark:hover:text-zinc-400
                         transition-colors underline"
            >
              Descartar entrevista e começar do zero
            </button>

          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 py-10">

        <Stepper current={step} />

        {warning && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border
                          border-[#fde68a] bg-[#fefce8] px-4 py-3 text-sm
                          text-[#92400e]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{warning} Revise os dados antes de continuar.</span>
            <button
              onClick={() => setWarning(null)}
              className="ml-auto shrink-0 hover:opacity-70 transition-opacity text-xs"
              aria-label="Fechar aviso"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mb-8 flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => irParaPasso((step - 1) as 1 | 2 | 3)}
              className="text-sm text-muted-fg hover:text-foreground
                         transition-colors"
            >
              ← Voltar
            </button>
          )}
          <h1 className="text-2xl font-bold tracking-heading-sm text-foreground">
            {stepTitles[step]}
          </h1>
        </div>

        {step === 1 && (
          <ResumeUpload
            onComplete={handleResume}
            onWarning={handleWarning}
            initialManualData={savedManualData}
            onManualDataChange={setSavedManualData}
          />
        )}
        {step === 2 && (
          <JobInput onComplete={handleJob} onWarning={handleWarning}
                    sessionId={session.id} />
        )}
        {step === 3 && session.job && (
          <InterviewConfig
            job={session.job}
            onComplete={handleConfig}
            profiles={avatarProfiles ?? undefined}
            loadingProfiles={loadingAvatars}
          />
        )}

      </main>

      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 px-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-modal">
            <div className="w-12 h-12 bg-[#fefce8] rounded-lg flex
                            items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-[#92400e]" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground text-center mb-2">
              Entrevista menos personalizada
            </h3>
            <p className="text-sm text-muted-fg text-center leading-relaxed mb-6">
              Você não enviou um currículo e está usando uma vaga gerada
              pela IA. A entrevista funcionará normalmente, mas as perguntas
              serão mais genéricas e menos focadas no seu perfil real.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 border border-border text-foreground
                           py-2.5 rounded-lg text-sm hover:bg-muted
                           transition-colors"
              >
                Voltar e melhorar
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  iniciarEntrevista();
                }}
                className="flex-1 bg-foreground text-background py-2.5 rounded-lg
                           text-sm font-medium hover:opacity-90
                           transition-opacity"
              >
                Continuar assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
