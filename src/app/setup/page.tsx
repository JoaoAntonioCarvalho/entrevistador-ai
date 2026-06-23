'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import ResumeUpload from '@/components/setup/ResumeUpload';
import JobInput from '@/components/setup/JobInput';
import InterviewConfig from '@/components/setup/InterviewConfig';
import { AvatarProfile, Candidate, InterviewConfig as IConfig, Job } from '@/lib/types';
import { Header } from '@/components/layout/Header';
import { notifycurriculo, notifyVaga } from '@/lib/services/telegram';

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
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : active
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ring-4 ring-zinc-900/10 dark:ring-white/20'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
              }`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-xs font-medium ${
                active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-24 h-px mx-2 mb-5 transition-colors ${
                done ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'
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
  const { session, initSession, setCandidate, setJob, setConfig, setStatus, setAvatarProfiles } = useSessionStore();
  const [step,            setStep]            = useState<1 | 2 | 3>(1);
  const [warning,         setWarning]         = useState<string | null>(null);
  const [showWarning,     setShowWarning]     = useState(false);
  const [avatarProfiles,  setLocalProfiles]   = useState<AvatarProfile[] | null>(null);
  const [loadingAvatars,  setLoadingAvatars]  = useState(false);
  const [savedManualData, setSavedManualData] = useState<ManualFormData | null>(null);

  useEffect(() => {
    initSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 3 && !session.job) {
      setStep(2);
    }
  }, [step, session.job]);

  function handleResume(candidate: Candidate) {
    setCandidate(candidate);
    notifycurriculo(candidate.nome || 'Candidato');
    setStep(2);
  }

  async function handleJob(job: Job) {
    setJob(job);
    notifyVaga(job.titulo || 'Vaga não informada', job.empresa || '');
    setStep(3);
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

    setStatus('active');
    router.push('/camera-check');
  }

  const stepTitles: Record<number, string> = {
    1: 'Seu currículo',
    2: 'A vaga',
    3: 'Configure a entrevista',
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">

      <Header backTo="/" backLabel="← Início" />

      <main className="max-w-2xl mx-auto px-6 py-10">

        <Stepper current={step} />

        {warning && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border
                          border-yellow-200 bg-yellow-50 px-4 py-3 text-sm
                          text-yellow-700">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{warning} Revise os dados antes de continuar.</span>
            <button
              onClick={() => setWarning(null)}
              className="ml-auto shrink-0 text-yellow-600 hover:text-yellow-800
                         transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mb-8 flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="text-sm text-zinc-500 hover:text-zinc-700
                         transition-colors"
            >
              ← Voltar
            </button>
          )}
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
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
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full
                          shadow-2xl">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex
                            items-center justify-center mx-auto mb-4">
              <span className="text-yellow-600 text-xl">⚠</span>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 text-center
                           mb-2">
              Entrevista menos personalizada
            </h3>
            <p className="text-sm text-zinc-500 text-center leading-relaxed
                          mb-6">
              Você não enviou um currículo e está usando uma vaga gerada
              pela IA. A entrevista funcionará normalmente, mas as perguntas
              serão mais genéricas e menos focadas no seu perfil real.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 border border-zinc-200 text-zinc-600
                           py-2.5 rounded-xl text-sm hover:bg-zinc-50
                           transition-colors"
              >
                Voltar e melhorar
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  setStatus('active');
                  router.push('/camera-check');
                }}
                className="flex-1 bg-zinc-900 text-white py-2.5 rounded-xl
                           text-sm font-medium hover:bg-zinc-700
                           transition-colors"
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
