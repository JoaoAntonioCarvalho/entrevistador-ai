'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import { saveSessionToSupabase, saveToLocalHistory } from '@/lib/services/supabase';
import { authedFetch } from '@/lib/services/api-client';
import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

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

  // Aviso de saída — cobre a janela entre o fim da entrevista e o
  // salvamento completo do relatório (com scores reais). `done` só vira
  // true depois que saveSessionToSupabase já foi tentado em gerarFeedback.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (done) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [done]);

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

    async function chamarApiFeedback() {
      const res = await authedFetch('/api/interview/feedback', {
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
      return res.json();
    }

    // Fallback local: garante que o usuário sempre chega ao dashboard com
    // scores, mesmo se a API falhar duas vezes (o guard do dashboard exige
    // scores — sem isso o candidato terminaria a entrevista sem relatório).
    function feedbackLocal() {
      const notaMedia = session.evaluations.reduce((s, e) => s + e.nota, 0)
        / session.evaluations.length;
      const nota = Math.round(notaMedia);
      const isEn = lang === 'en';
      return {
        feedback_script: {
          ponto_forte:        isEn ? 'You showed good engagement throughout the interview.'      : 'Você demonstrou boa disposição ao longo da entrevista.',
          melhoria_principal: isEn ? 'Work on structuring your answers with concrete examples.'  : 'Procure estruturar melhor suas respostas com exemplos concretos.',
          recomendacao:       isEn ? 'Practice the STAR method to organize your responses.'      : 'Pratique o método STAR para organizar suas respostas nas próximas entrevistas.',
          ...(isEn ? {
            ponto_forte_pt:        'Você demonstrou boa disposição ao longo da entrevista.',
            melhoria_principal_pt: 'Procure estruturar melhor suas respostas com exemplos concretos.',
            recomendacao_pt:       'Pratique o método STAR para organizar suas respostas nas próximas entrevistas.',
          } : {}),
        },
        scores: {
          geral: Math.round(notaMedia * 10),
          clareza: nota, relevancia: nota, profundidade: nota,
        },
        competencias: {
          comunicacao: nota, resolucao_problemas: nota,
          conhecimento_tecnico: nota, lideranca: nota, adaptabilidade: nota,
        },
      };
    }

    async function gerarFeedback() {
      let data;
      try {
        data = await chamarApiFeedback();
      } catch {
        try {
          // Uma retentativa antes do fallback local
          await new Promise(r => setTimeout(r, 1500));
          data = await chamarApiFeedback();
        } catch {
          data = feedbackLocal();
        }
      }

      setFeedbackScript(JSON.stringify(data.feedback_script));
      setScores(data.scores);
      setCompetencias(data.competencias);
      setStatus('feedback');

      // Persistir já com scores — se o usuário fechar a aba antes do
      // dashboard montar, o histórico e o link público não ficam zerados.
      try {
        const sessaoAtual = useSessionStore.getState().session;
        saveToLocalHistory(sessaoAtual);
        await saveSessionToSupabase(sessaoAtual);
      } catch { /* dashboard tenta salvar de novo ao montar */ }

      setProgress(100);
      setDone(true);

      setTimeout(() => router.push('/dashboard'), 600);
    }

    gerarFeedback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-[calc(100dvh-65px)] bg-background
                      flex items-center justify-center px-6
                      transition-colors duration-200">
        <div className="w-full max-w-md text-center">

          {/* Spinner / checkmark */}
          <div className="w-16 h-16 mx-auto mb-8 relative">
            <div className={`w-16 h-16 rounded-full border-4
                            border-border border-t-foreground
                            ${done ? '' : 'animate-spin'}`} />
            {done && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-foreground" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Step atual */}
          <p className="text-lg font-medium text-foreground
                        mb-2 min-h-[28px] transition-all duration-300">
            {done
              ? (lang === 'pt' ? 'Relatório pronto!' : 'Report ready!')
              : steps[stepIndex]}
          </p>

          <p className="text-sm text-muted-fg mb-8">
            {lang === 'pt'
              ? 'Analisando sua performance com inteligência artificial'
              : 'Analyzing your performance with artificial intelligence'}
          </p>

          {/* Barra de progresso */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-muted-fg mt-3">
            {progress < 100
              ? (lang === 'pt' ? 'Isso leva alguns segundos...' : 'This takes a few seconds...')
              : (lang === 'pt' ? 'Redirecionando...' : 'Redirecting...')}
          </p>

        </div>
      </div>
    </>
  );
}
