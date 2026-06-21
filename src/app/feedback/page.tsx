'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';

const STEPS = {
  pt: [
    'Analisando suas respostas...',
    'Avaliando competências...',
    'Identificando pontos de melhoria...',
    'Gerando seu relatório personalizado...',
  ],
  en: [
    'Analyzing your answers...',
    'Evaluating competencies...',
    'Identifying improvement areas...',
    'Generating your personalized report...',
  ],
};

export default function FeedbackPage() {
  const router            = useRouter();
  const session           = useSessionStore(s => s.session);
  const setFeedbackScript = useSessionStore(s => s.setFeedbackScript);
  const setScores         = useSessionStore(s => s.setScores);
  const setCompetencias   = useSessionStore(s => s.setCompetencias);
  const setStatus         = useSessionStore(s => s.setStatus);

  const lang  = (session?.config?.idioma ?? 'pt') as 'pt' | 'en';
  const steps = STEPS[lang];

  const [stepIndex, setStepIndex] = useState(0);
  const [progress,  setProgress]  = useState(0);
  const [done,      setDone]      = useState(false);

  const feedbackCalledRef = useRef(false);

  // Proteção de rota
  useEffect(() => {
    if (!session?.candidate) router.push('/setup');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avançar steps visualmente a cada 1.2s
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animar barra de progresso até 90% — o último 10% só quando a API responder
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + 2;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Chamar API de feedback
  useEffect(() => {
    if (feedbackCalledRef.current) return;
    feedbackCalledRef.current = true;

    if (!session?.evaluations?.length) {
      router.push('/setup');
      return;
    }

    async function gerarFeedback() {
      try {
        const res = await fetch('/api/interview/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluations:   session.evaluations,
            config:        session.config,
            candidateName: session.candidate?.nome ?? '',
            jobTitle:      session.job?.titulo ?? '',
            sessionId:     session.id,
          }),
        });

        if (!res.ok) throw new Error('Erro na API de feedback');

        const data = await res.json();

        setFeedbackScript(JSON.stringify(data.feedback_script));
        setScores(data.scores);
        setCompetencias(data.competencias);
        setStatus('feedback');

        setProgress(100);
        setDone(true);

        setTimeout(() => router.push('/dashboard'), 600);

      } catch {
        toast.error(
          lang === 'pt'
            ? 'Erro ao gerar feedback. Redirecionando...'
            : 'Error generating feedback. Redirecting...'
        );
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    }

    gerarFeedback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-65px)] bg-white dark:bg-zinc-950
                      flex items-center justify-center px-6
                      transition-colors duration-200">
        <div className="w-full max-w-md text-center">

          {/* Spinner / checkmark */}
          <div className="w-16 h-16 mx-auto mb-8 relative">
            <div className={`w-16 h-16 rounded-full border-4
                            border-zinc-200 dark:border-zinc-700
                            border-t-zinc-900 dark:border-t-white
                            ${done ? '' : 'animate-spin'}`} />
            {done && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-900 dark:text-white" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Step atual */}
          <p className="text-lg font-medium text-zinc-900 dark:text-white
                        mb-2 min-h-[28px] transition-all duration-300">
            {done
              ? (lang === 'pt' ? 'Relatório pronto!' : 'Report ready!')
              : steps[stepIndex]}
          </p>

          <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-8">
            {lang === 'pt'
              ? 'Analisando sua performance com inteligência artificial'
              : 'Analyzing your performance with artificial intelligence'}
          </p>

          {/* Barra de progresso */}
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800
                          rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 dark:bg-white rounded-full
                         transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
            {progress < 100
              ? (lang === 'pt' ? 'Isso leva alguns segundos...' : 'This takes a few seconds...')
              : (lang === 'pt' ? 'Redirecionando...' : 'Redirecting...')}
          </p>

        </div>
      </div>
    </>
  );
}
