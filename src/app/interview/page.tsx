'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle, Send, Sun, Moon, Volume2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSessionStore } from '@/lib/store';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import AvatarDisplay from '@/components/interview/AvatarDisplay';
import TranscriptPanel from '@/components/interview/TranscriptPanel';
import MicrophoneButton from '@/components/interview/MicrophoneButton';
import CameraWidget from '@/components/interview/CameraWidget';
import SilentModeHint from '@/components/interview/SilentModeHint';
import { PaymentGateModal } from '@/components/interview/PaymentGateModal';
import type { InterviewSession, InterviewTurnResponse } from '@/lib/types';
import { notifyEntrevistaIniciada } from '@/lib/services/telegram';
import { saveSessionToSupabase } from '@/lib/services/supabase';
import { authedFetch } from '@/lib/services/api-client';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

type InterviewState = 'loading' | 'speaking' | 'waiting' | 'processing' | 'ended';

export default function InterviewPage() {
  const router = useRouter();
  const { session, addConversationTurn, addEvaluation, setStatus } = useSessionStore();
  const addCustoIA  = useSessionStore(s => s.addCustoIA);
  const addCustoTTS = useSessionStore(s => s.addCustoTTS);
  const { user, loading: authLoading } = useAuth();

  // Sessão válida persistida no store (reload no meio da entrevista)
  const temSessaoSalva =
    !!session?.id &&
    !!session?.candidate?.nome &&
    (session?.conversation?.length ?? 0) > 0 &&
    session?.status === 'active';

  // Estado de retomada — declarado antes do useRouteGuard para poder desligar o guard.
  // Inicia false e é setado para true no mount effect ao detectar ?resume=true.
  // Persiste mesmo após os params de URL serem removidos.
  const [isResuming, setIsResuming]           = useState(false);
  const [resumeSessionId, setResumeSessionId] = useState('');

  // Se há sessão salva ou está retomando, a entrevista não precisa dos dados de /setup.
  // Na primeira renderização isResuming = false, mas useRouteGuard lê a URL internamente
  // e não redireciona quando ?resume=true está presente.
  useRouteGuard({ needsCandidate: !temSessaoSalva && !isResuming, needsJob: !temSessaoSalva && !isResuming });

  const totalPerguntas = session.config?.perguntas ?? 10;

  const [interviewState, setInterviewState] = useState<InterviewState>('loading');
  const [perguntasRespondidas, setPerguntasRespondidas] = useState(0);
  const perguntasRespondidasRef = useRef(0);
  const [voiceError, setVoiceError]     = useState(false);
  const [visibleText, setVisibleText]   = useState('');
  const [isThinking, setIsThinking]     = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [speechChecked, setSpeechChecked] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showEscape, setShowEscape] = useState(false);
  const [showVoiceTip, setShowVoiceTip] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  // Fechou o gate sem pagar: microfone bloqueado até confirmar crédito —
  // sem isso o usuário tenta responder de novo e pode ganhar pergunta extra
  const [gateDismissed, setGateDismissed] = useState(false);
  const [paymentGateMotivo, setPaymentGateMotivo] = useState<'normal' | 'free_limit'>('normal');
  const [mostrarDica, setMostrarDica] = useState(true);
  const [wasReloaded, setWasReloaded] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showSilentHint, setShowSilentHint] = useState(false);

  const isIOS = typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof window !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const needsUnlock = isIOS || isSafari;

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === 'dark';

  const consecutiveErrors         = useRef(0);
  const lastCandidateResponse     = useRef('');
  const isProcessingTurnRef       = useRef(false);
  const resetVoiceInputRef        = useRef<() => void>(() => {});
  const voiceErrorCallbackRef     = useRef<() => void>(() => {});
  const pendingInterviewerTextRef = useRef<string>('');
  const prevVoiceStateRef         = useRef<string>('idle');
  const firstTurnCalledRef        = useRef(false);
  const audioContextRef           = useRef<AudioContext | null>(null);
  const creditConsumedRef         = useRef(false);
  const prevUserRef               = useRef<string | null>(null);
  const resumeVerifiedRef         = useRef(false);
  // Evita exibir payment gate após retorno confirmado de /pagamento/sucesso
  const pagamentoConfirmadoRef    = useRef(false);
  // Uma única retentativa silenciosa de 402 por confirmação de pagamento —
  // cobre a corrida entre o webhook do MP criar o crédito e o primeiro
  // turno pós-retorno chegar antes disso. Reseta a cada nova confirmação.
  const retriedAfterPaymentRef    = useRef(false);
  // Persiste o último user.id conhecido — garante que saveSessionToSupabase
  // recebe o ID mesmo se user ainda for null por timing de auth
  const authUserIdRef             = useRef<string | null>(null);
  // Popup de silencioso iOS: só na primeira fala, nunca reaparece na sessão
  const silentHintUsedRef         = useRef(false);
  const silentHintTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Suprime o aviso de saída (beforeunload) quando a navegação para fora da
  // página foi disparada pelo próprio app (redirect para o Mercado Pago)
  const suppressLeaveWarningRef   = useRef(false);

  const incrementarPerguntas = useCallback(() => {
    perguntasRespondidasRef.current += 1;
    setPerguntasRespondidas(perguntasRespondidasRef.current);
    return perguntasRespondidasRef.current;
  }, []);

  const voiceOutput = useVoiceOutput({
    lang:         session.config?.idioma === 'en' ? 'en-US' : 'pt-BR',
    avatarId:     session.config?.avatar_id,
    voiceId:      session.config?.avatar_id,
    sessionId:    session.id,
    onTTSChars:   (chars) => addCustoTTS(chars),
    onError:      () => voiceErrorCallbackRef.current(),
    onSpeakStart: () => { setIsThinking(false); setVisibleText(''); },
    onWordReveal: (text) => setVisibleText(text),
    onSpeakEnd:   () => { setVisibleText(''); setIsThinking(false); },
    // Ref, não snapshot: o hook lê o contexto no momento da execução —
    // o contexto nasce no toque de unlock, DEPOIS da render que criou
    // a closure do primeiro turno
    audioContextRef: audioContextRef,
    // Recuperação de congelamento (iOS): o hook recria o contexto e devolve
    // o novo aqui — a ref é a fonte da verdade para as próximas falas
    onAudioContextRecreated: (ctx) => { audioContextRef.current = ctx; },
  });
  const speakRef = useRef(voiceOutput.speak);
  speakRef.current = voiceOutput.speak;

  const callTurn = useCallback(async (
    isFirst: boolean,
    response?: string,
    perguntasAtualizadas?: number
  ): Promise<void> => {
    try {
      setWasReloaded(false); // limpa banner de restauração ao retomar
      setInterviewState('processing');
      setIsThinking(true);
      setVisibleText('');
      setVoiceError(false);

      // Usar valor explícito ou ref — NUNCA o estado
      const perguntasParaCalculo =
        perguntasAtualizadas ?? perguntasRespondidasRef.current;
      const isLastTurn = !isFirst && perguntasParaCalculo >= totalPerguntas;

      const res = await authedFetch('/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate:            session.candidate,
          job:                  session.job,
          config:               session.config,
          conversation:         session.conversation,
          candidateResponse:    response ?? '',
          isFirstTurn:          isFirst,
          isLastTurn:           isLastTurn,
          perguntasRespondidas: perguntasParaCalculo,
          totalPerguntas:       totalPerguntas,
          sessionId:            session.id,
        }),
      });

      if (res.status === 402) {
        // Ler corpo antes de descartar — o backend inclui avaliação e motivo
        const data402 = await res.json().catch(() => ({}));

        // Se acabamos de confirmar pagamento nesta sessão, pode ser
        // race condition do webhook ainda processando — esperar 1.5s e
        // tentar mais uma vez antes de mostrar o gate de novo.
        if (pagamentoConfirmadoRef.current && !retriedAfterPaymentRef.current) {
          retriedAfterPaymentRef.current = true;
          await new Promise(r => setTimeout(r, 1500));
          return callTurnRef.current(isFirst, response, perguntasAtualizadas);
        }

        if (!isFirst && response && data402.avaliacao) {
          addEvaluation({
            pergunta:       currentQuestion,
            resposta:       response,
            nota:           data402.avaliacao.nota          ?? 5,
            positivo:       data402.avaliacao.positivo      ?? '',
            melhoria:       data402.avaliacao.melhoria      ?? '',
            resposta_ideal: data402.avaliacao.resposta_ideal ?? '',
          });
        }
        setPaymentGateMotivo(
          data402.motivo === 'free_limit_exceeded' ? 'free_limit' : 'normal'
        );
        setShowPaymentGate(true);
        setInterviewState('waiting');
        setIsThinking(false);
        isProcessingTurnRef.current = false;
        saveSessionToSupabase(useSessionStore.getState().session, authUserIdRef.current ?? user?.id ?? null).catch(() => {});
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as InterviewTurnResponse & {
        _usage?: { inputTokens: number; outputTokens: number; model: string };
        error?: string;
      };

      if (!data?.fala) throw new Error('Resposta inválida da API');

      if (data._usage) {
        addCustoIA(data._usage.inputTokens, data._usage.outputTokens, data._usage.model);
      }

      if (!isFirst && response && data.avaliacao) {
        addEvaluation({
          pergunta:      currentQuestion,
          resposta:      response,
          nota:          data.avaliacao.nota ?? 5,
          positivo:      data.avaliacao.positivo ?? '',
          melhoria:      data.avaliacao.melhoria ?? '',
          resposta_ideal: data.avaliacao.resposta_ideal ?? '',
        });
      }

      if (isFirst) setStatus('active'); // marca sessão como ativa para persistência
      setInterviewState('speaking');
      // isThinking permanece true até onSpeakStart — cobre o carregamento do TTS
      pendingInterviewerTextRef.current = data.fala;
      setCurrentQuestion(data.fala);
      await voiceOutput.speak(data.fala);

    } catch {
      setIsThinking(false);
      setInterviewState('waiting');
      resetVoiceInputRef.current();
      toast.error('Erro ao processar resposta. Tente novamente.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, totalPerguntas, currentQuestion, addEvaluation, voiceOutput]);

  // Sempre aponta para o callTurn mais recente — evita closure stale do session
  const callTurnRef = useRef(callTurn);
  callTurnRef.current = callTurn;

  const handleTranscript = useCallback((text: string) => {
    if (isProcessingTurnRef.current) {
      return;
    }
    if (!text?.trim()) return;

    isProcessingTurnRef.current = true;

    addConversationTurn({
      role:      'candidate',
      text:      text.trim(),
      timestamp: new Date().toISOString(),
    });

    const novasPerguntas = incrementarPerguntas();

    // Safety: libera a trava após 20s mesmo se a API travar
    const turnTimeout = setTimeout(() => {
      if (isProcessingTurnRef.current) {
        isProcessingTurnRef.current = false;
        setInterviewState('waiting');
      }
    }, 20000);

    // callTurnRef.current garante que chamamos sempre o callTurn mais recente
    // (com session.conversation atualizado) mesmo com handleTranscript estável
    callTurnRef.current(false, text.trim(), novasPerguntas).finally(() => {
      clearTimeout(turnTimeout);
      setTimeout(() => {
        isProcessingTurnRef.current = false;
      }, 500);
    });
  // Deps mínimas: addConversationTurn e incrementarPerguntas são estáveis.
  // callTurn é acessado via ref — sem precisar declarar como dep.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addConversationTurn, incrementarPerguntas]);

  const voiceInput = useVoiceInput({
    lang: session.config?.idioma === 'en' ? 'en-US' : 'pt-BR',
    onTranscript: handleTranscript,
    onError: (err) => toast.error(`Microfone: ${err}`),
    onInterimTranscript: (texto) => setInterimTranscript(texto),
  });

  // Manter refs de reset e erro de voz atualizadas a cada render
  resetVoiceInputRef.current = voiceInput.resetState;
  voiceErrorCallbackRef.current = () => {
    setVoiceError(true);
    setInterviewState('waiting');
    voiceInput.resetState();
  };

  // Cancelar timeout do microfone quando entrevistador começa a falar
  useEffect(() => {
    if (interviewState === 'speaking') {
      voiceInput.cancelarTimeout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewState]);

  // Popup "não está ouvindo?" (iOS apenas): 3s após a PRIMEIRA fala começar,
  // some quando ela termina ou ao toque, nunca reaparece na sessão. Puramente
  // visual — observa interviewState, não altera nenhuma lógica de áudio.
  useEffect(() => {
    if (!isIOS) return;
    if (interviewState === 'speaking' && !silentHintUsedRef.current) {
      silentHintUsedRef.current = true;
      silentHintTimerRef.current = setTimeout(() => setShowSilentHint(true), 3000);
      return;
    }
    if (interviewState !== 'speaking' && silentHintUsedRef.current) {
      if (silentHintTimerRef.current) {
        clearTimeout(silentHintTimerRef.current);
        silentHintTimerRef.current = null;
      }
      setShowSilentHint(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewState, isIOS]);

  // Limpa o timer do popup no unmount
  useEffect(() => () => {
    if (silentHintTimerRef.current) clearTimeout(silentHintTimerRef.current);
  }, []);

  // Mark speech support check complete after mount
  useEffect(() => {
    setSpeechChecked(true);
  }, []);

  // Auto-hide voice tip after 8s on first listen
  useEffect(() => {
    if (voiceInput.state === 'listening' && showVoiceTip) {
      const t = setTimeout(() => setShowVoiceTip(false), 8000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceInput.state]);

  // Primeiro turno
  useEffect(() => {
    if (!session.candidate) return;
    if (needsUnlock && !audioUnlocked) return;
    const id = setTimeout(() => {
      if (!firstTurnCalledRef.current &&
          useSessionStore.getState().session.conversation.length === 0) {
        firstTurnCalledRef.current = true;
        notifyEntrevistaIniciada(
          session.candidate?.nome || 'Candidato',
          session.job?.titulo    || 'Vaga não informada',
          {
            avatar:    session.config?.avatar_id  ?? 'sarah',
            idioma:    session.config?.idioma     ?? 'pt',
            perguntas: session.config?.perguntas  ?? 0,
            nivel:     session.config?.nivel      ?? '',
            tipo:      session.config?.tipo       ?? '',
          }
        );
        callTurn(true);
      }
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.candidate, audioUnlocked]);

  // Detectar fim da fala do avatar → confirmar mensagem no histórico e liberar microfone
  useEffect(() => {
    // Rastrear transições: só agir quando voiceOutput passou por non-idle antes de idle
    if (voiceOutput.state !== 'idle') {
      prevVoiceStateRef.current = voiceOutput.state;
      return;
    }
    if (interviewState !== 'speaking') return;
    // Guard: se voiceOutput nunca saiu do idle (Web Speech async), não é fim-de-fala real
    if (prevVoiceStateRef.current === 'idle') return;
    prevVoiceStateRef.current = 'idle';

    setVisibleText('');
    setIsThinking(false);

    if (pendingInterviewerTextRef.current) {
      addConversationTurn({
        role:      'interviewer',
        text:      pendingInterviewerTextRef.current,
        timestamp: new Date().toISOString(),
      });
      pendingInterviewerTextRef.current = '';
    }

    const perguntasAtuais = perguntasRespondidasRef.current;

    if (perguntasAtuais >= totalPerguntas) {
      setInterviewState('ended');
      setStatus('completed');
      saveSessionToSupabase(
        { ...useSessionStore.getState().session, status: 'completed' },
        authUserIdRef.current ?? user?.id ?? null,
      ).catch(() => {});
      setTimeout(() => router.push('/feedback'), 1500);
      return;
    }

    setInterviewState('waiting');
    voiceInput.resetState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceOutput.state, interviewState]);

  // Botão de escape após 10s em 'processing'
  useEffect(() => {
    if (interviewState === 'processing') {
      const t = setTimeout(() => setShowEscape(true), 10000);
      return () => clearTimeout(t);
    }
    setShowEscape(false);
  }, [interviewState]);

  // Consumir crédito ao encerrar entrevista (fire-and-forget)
  useEffect(() => {
    if (interviewState !== 'ended') return;
    if (creditConsumedRef.current || !user?.id) return;
    creditConsumedRef.current = true;
    authedFetch('/api/credits/consume', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId:  session.id,
        perguntas:  session.config?.perguntas ?? totalPerguntas,
      }),
    }).catch((e) => {
      // Falha ao consumir crédito deixa um crédito pago "não usado" — não
      // quebra a UX, mas é uma perda de receita potencial que queremos observar.
      Sentry.captureException(e, { tags: { route: 'credits-consume', origin: 'interview-client' } });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewState]);

  // Verificar crédito ao detectar login durante a entrevista (retorno pós-gate)
  async function verificarPagamentoAntesDeContinar() {
    try {
      const res = await authedFetch('/api/credits/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId:  session?.id ?? null,
        }),
      });
      const data = await res.json();

      if (!data.hasCredit) {
        setShowPaymentGate(true);
        setInterviewState('waiting');
        isProcessingTurnRef.current = false;
      } else {
        // Tem crédito — retomar do ponto correto
        const candidateTurns = session.conversation.filter(t => t.role === 'candidate').length;
        perguntasRespondidasRef.current = candidateTurns;
        setPerguntasRespondidas(candidateTurns);
        setGateDismissed(false);
        setInterviewState('waiting');
      }
    } catch {
      setShowPaymentGate(true);
      setInterviewState('waiting');
    }
  }

  useEffect(() => {
    if (user?.id && prevUserRef.current === null) {
      const candidateTurns = session.conversation.filter(t => t.role === 'candidate').length;
      if (candidateTurns >= 3) {
        verificarPagamentoAntesDeContinar();
      }
    }
    prevUserRef.current = user?.id ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Persiste user.id na ref e atualiza o banco com auth_user_id quando user carrega
  useEffect(() => {
    if (!user?.id) return;
    authUserIdRef.current = user.id;
    if (session?.id && session.status === 'active') {
      saveSessionToSupabase(session, user.id).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cleanup AudioContext ao sair da página (iOS)
  useEffect(() => {
    return () => {
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  // Aviso de saída (fechar aba, atualizar, digitar nova URL) durante a
  // entrevista — suprimido no redirect deliberado para o Mercado Pago e
  // depois que a entrevista termina
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (suppressLeaveWarningRef.current) return;
      if (interviewState === 'ended') return;
      if (!session.candidate) return;

      e.preventDefault();
      e.returnValue = ''; // necessário para o Chrome disparar o dialog
      return '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [interviewState, session.candidate]);

  // Auto-ocultar dica de primeira pergunta após 6 segundos
  useEffect(() => {
    if (!mostrarDica) return;
    const t = setTimeout(() => setMostrarDica(false), 6000);
    return () => clearTimeout(t);
  }, [mostrarDica]);

  // Mount: detectar modo resume e params de URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isResume      = params.get('resume') === 'true';
    const hasShowPayment = params.get('showPayment') === 'true';
    const sessId        = params.get('sessionId') ?? '';

    // Bloquear o first-turn automático em qualquer modo de retomada
    if (isResume || hasShowPayment) {
      firstTurnCalledRef.current = true;
    }

    // Overlay de sessão pendente não paga → mostrar gate imediatamente
    if (hasShowPayment) {
      setShowPaymentGate(true);
      setInterviewState('waiting');
    }

    // Retorno pós-pagamento confirmado → marcar crédito como válido localmente
    const paidParam = params.get('paid') === 'true';
    if (paidParam) {
      pagamentoConfirmadoRef.current = true;
      retriedAfterPaymentRef.current = false; // libera uma nova retentativa para esta confirmação
    }

    // Retorno pós-pagamento → verificar crédito e continuar
    if (isResume) {
      setIsResuming(true);
      setResumeSessionId(sessId);
      const url = new URL(window.location.href);
      url.searchParams.delete('resume');
      url.searchParams.delete('sessionId');
      url.searchParams.delete('showPayment');
      url.searchParams.delete('paid');
      window.history.replaceState({}, '', url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restaurar estado ao recarregar página com sessão em andamento
  useEffect(() => {
    if (!temSessaoSalva) return;

    const perguntasJaRespondidas =
      session.conversation?.filter(c => c.role === 'candidate').length ?? 0;

    perguntasRespondidasRef.current = perguntasJaRespondidas;
    setPerguntasRespondidas(perguntasJaRespondidas);
    firstTurnCalledRef.current = true; // impede auto-first-turn na restauração

    // currentQuestion é state local, não persistido — sem isso a próxima
    // avaliação grava a pergunta como string vazia após o reload
    const lastInterviewerMsg = session.conversation
      .filter(t => t.role === 'interviewer')
      .slice(-1)[0]?.text ?? '';
    setCurrentQuestion(lastInterviewerMsg);

    if (perguntasJaRespondidas < totalPerguntas) {
      setInterviewState('waiting');
      setIsThinking(false);
    }

    setWasReloaded(true);

    const url = new URL(window.location.href);
    url.searchParams.delete('resume');
    url.searchParams.delete('sessionId');
    window.history.replaceState({}, '', url.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // SOMENTE no mount

  // Verificar crédito quando retomando pós-pagamento
  // Aguarda authLoading = false para garantir que user?.id está definitivo
  // antes de chamar callTurn (evita race condition: auth demora > 1s e callTurn
  // dispara com authUserId = null → gate rejeita crédito válido).
  useEffect(() => {
    if (!isResuming || resumeVerifiedRef.current) return;
    if (authLoading) return;
    // iOS/Safari: aguardar o toque de desbloqueio de áudio antes de
    // retomar — sem isso o TTS toca sem som (AudioContext inexistente)
    if (needsUnlock && !audioUnlocked) return;
    resumeVerifiedRef.current = true;

    async function verificarCreditoResume() {
      try {
        const res = await authedFetch('/api/credits/check', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId:  resumeSessionId,
          }),
        });
        const data = await res.json();

        if (data.hasCredit || pagamentoConfirmadoRef.current) {
          // Se o store foi esvaziado (ex: /setup chamou initSession antes do pagamento),
          // restaurar a sessão completa a partir do backup salvo em localStorage
          if (!useSessionStore.getState().session.candidate && resumeSessionId) {
            try {
              const rawBackup = localStorage.getItem('mockai-resume-backup');
              if (rawBackup) {
                const backup = JSON.parse(rawBackup) as InterviewSession;
                if (backup.id === resumeSessionId) {
                  useSessionStore.getState().setSession(backup);
                  localStorage.removeItem('mockai-resume-backup');
                }
              }
            } catch { /* silencioso */ }
          }

          // Restaurar contagem de perguntas pelo histórico da conversa
          const conv = useSessionStore.getState().session.conversation;
          const candidateTurns = conv.filter(t => t.role === 'candidate');
          const count      = candidateTurns.length;
          const lastText   = candidateTurns[count - 1]?.text ?? '';

          // currentQuestion é state local, não persistido — sem isso a
          // avaliação do turno pós-retomada grava a pergunta como string vazia
          const lastInterviewerMsg = conv
            .filter(t => t.role === 'interviewer')
            .slice(-1)[0]?.text ?? '';
          setCurrentQuestion(lastInterviewerMsg);

          perguntasRespondidasRef.current = count;
          setPerguntasRespondidas(count);
          setShowPaymentGate(false);
          setGateDismissed(false);

          // Guarda defensivo: se candidate ainda for null após todos os restores
          // (ex: localStorage limpo em modo privado), não chamar callTurn — evita
          // 400 "Dados da sessão incompletos" e redireciona para setup com aviso.
          const sessaoRestaurada = useSessionStore.getState().session;
          if (!sessaoRestaurada.candidate || !sessaoRestaurada.job) {
            toast.error('Sessão expirada. Inicie uma nova entrevista.');
            router.push('/setup');
            return;
          }

          // Chamar próxima pergunta automaticamente após UI estabilizar
          setTimeout(() => {
            callTurnRef.current(false, lastText, count);
          }, 1000);
        } else {
          setShowPaymentGate(true);
          setInterviewState('waiting');
        }
      } catch {
        setShowPaymentGate(true);
        setInterviewState('waiting');
      }
    }

    verificarCreditoResume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResuming, user?.id, authLoading, audioUnlocked]);


  // A entrevista só encerra automaticamente: ao completar todas as perguntas
  // ou como escape do modal de erro (falhas consecutivas de API). Não existe
  // botão de "encerrar agora" durante o fluxo normal.
  async function handleEndInterview() {
    setInterviewState('ended');
    const nome = session.candidate?.nome ?? 'candidato';
    const farewell =
      session.config?.idioma === 'en'
        ? `Thank you for your time, ${nome}. You will receive your detailed feedback shortly.`
        : `Obrigado pela sua participação, ${nome}. Em instantes você receberá um feedback completo.`;
    speakRef.current(farewell);
    setStatus('completed');
    saveSessionToSupabase(
      { ...useSessionStore.getState().session, status: 'completed' },
      authUserIdRef.current ?? user?.id ?? null,
    ).catch(() => {});
    setTimeout(() => router.push('/feedback'), 4000);
  }

  function handleManualSubmit() {
    const text = manualInput.trim();
    if (!text || interviewState !== 'waiting') return;
    setManualInput('');
    handleTranscript(text);
  }

  const showUnsupportedBanner = speechChecked && !voiceInput.isSupported;

  const micState = (() => {
    if (gateDismissed)                    return 'disabled' as const;
    if (interviewState === 'ended')       return 'disabled' as const;
    if (interviewState === 'loading')     return 'disabled' as const;
    if (interviewState === 'processing')  return 'disabled' as const;
    if (interviewState === 'speaking')    return 'disabled' as const;
    if (voiceError)                       return 'disabled' as const;
    if (voiceInput.state === 'listening') return 'listening' as const;
    if (voiceInput.state === 'processing') return 'processing' as const;
    if (interviewState === 'waiting')     return 'idle' as const;
    return 'disabled' as const;
  })();

  function handleMicClick() {
    setMostrarDica(false);
    if (voiceInput.state === 'listening') {
      voiceInput.stopListening();
    } else if (voiceInput.state === 'idle' && interviewState === 'waiting') {
      voiceInput.startListening();
    }
  }

  if (!session.candidate && !isResuming) return null;

  const encerrando = interviewState === 'ended';

  return (
    <div className={`h-screen flex flex-col overflow-hidden relative ${isDark ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'}`}>
      {needsUnlock && !audioUnlocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95">
          <div className="text-center px-8 max-w-sm">
            <p className="text-white text-xl font-semibold mb-2">
              Pronto para começar?
            </p>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              Toque para iniciar a entrevista
            </p>
            <div className="flex items-start gap-3 text-left border border-zinc-700 rounded-lg px-4 py-3 mb-8">
              <Volume2 className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-300 leading-relaxed">
                {session.config?.idioma === 'en'
                  ? "Turn off silent mode (side switch) — the interviewer speaks to you out loud. Just raising the volume won't work: silent mode must be off."
                  : 'Tire o celular do modo silencioso (chavinha lateral) — o entrevistador fala com você por voz. Só aumentar o volume não funciona: o modo silencioso precisa estar desativado.'}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const ctx = new AudioContext();
                  audioContextRef.current = ctx;
                  // resume() disparado DENTRO do gesto de toque, de forma
                  // síncrona, antes de qualquer await — iOS só considera o
                  // contexto desbloqueado se isso acontecer no próprio gesto
                  if (ctx.state !== 'running') void ctx.resume();
                  const buf = ctx.createBuffer(1, 1, 22050);
                  const src = ctx.createBufferSource();
                  src.buffer = buf;
                  src.connect(ctx.destination);
                  src.start(0);
                  // NÃO fechar — manter vivo para uso pelo hook
                } catch { /* silencioso */ }
                setAudioUnlocked(true);
                if (!firstTurnCalledRef.current) {
                  firstTurnCalledRef.current = true;
                  // via ref — a closure desta render é anterior ao toque
                  setTimeout(() => callTurnRef.current(true), 500);
                }
              }}
              className="bg-white text-zinc-900 px-8 py-4 rounded-full font-semibold text-base hover:bg-zinc-100 transition-colors w-full mb-6"
            >
              Iniciar entrevista
            </button>
          </div>
        </div>
      )}

      <CameraWidget candidateName={session.candidate?.nome ?? ''} />

      {isIOS && showSilentHint && (
        <SilentModeHint
          idioma={session.config?.idioma}
          onDismiss={() => setShowSilentHint(false)}
        />
      )}

      {/* Unsupported browser banner */}
      {showUnsupportedBanner && (
        <div className="shrink-0 bg-yellow-900/80 border-b border-yellow-700 px-4 py-2 flex items-center gap-2 text-yellow-200 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          ⚠ Seu navegador não suporta captura de voz. Use Google Chrome para a melhor experiência.
        </div>
      )}

      {/* Error modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-sm w-full mx-4 flex flex-col gap-5">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="font-semibold text-lg">Problema de conexão</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Ocorreram erros consecutivos ao contactar a API. O que deseja fazer?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  consecutiveErrors.current = 0;
                  callTurn(false, lastCandidateResponse.current || undefined);
                }}
                className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  handleEndInterview();
                }}
                className="w-full rounded-md border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-400 px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Encerrar entrevista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`flex items-center justify-between px-5 py-3 border-b flex-shrink-0 ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-100 bg-white'}`}>
        <span className="text-sm font-medium text-zinc-500">
          Entrevistador.IA
        </span>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span>{session.config?.idioma === 'en' ? 'Question' : 'Pergunta'}</span>
          <span className={`font-mono tabular-nums font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            {Math.min(perguntasRespondidas + 1, totalPerguntas)}
          </span>
          <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>/</span>
          <span>{totalPerguntas}</span>
          {encerrando && (
            <span className="ml-1 text-zinc-400 animate-pulse">·</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              aria-label="Alternar tema"
            >
              {isDark
                ? <Sun  className="w-3.5 h-3.5" />
                : <Moon className="w-3.5 h-3.5" />
              }
            </button>
          )}
        </div>
      </header>

      {/* Banner de entrevista restaurada após reload */}
      {temSessaoSalva && wasReloaded && (
        <div className="shrink-0 text-xs text-zinc-500 text-center py-2 animate-fade-in-up">
          Entrevista restaurada — continue sua resposta
        </div>
      )}

      {/* Voice tip banner */}
      {showVoiceTip && voiceInput.state === 'listening' && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-zinc-800 text-zinc-200 text-xs text-center py-2 px-4">
          💡 Dica: se uma palavra não for reconhecida corretamente, é normal — pense na palavra mais próxima e continue.
          <button
            onClick={() => setShowVoiceTip(false)}
            className="ml-3 underline opacity-70 hover:opacity-100"
          >
            Entendi
          </button>
        </div>
      )}

      {/* Gate fechado sem pagamento: microfone bloqueado, oferecer reabertura */}
      {gateDismissed && !showPaymentGate && (
        <button
          onClick={() => setShowPaymentGate(true)}
          className="absolute bottom-[120px] left-1/2 -translate-x-1/2
                     bg-zinc-900/90 dark:bg-zinc-100/90
                     text-white dark:text-zinc-900
                     text-sm px-4 py-2.5 rounded-full
                     shadow-lg whitespace-nowrap
                     hover:opacity-90 transition-opacity
                     animate-fade-in-up z-10">
          {session.config?.idioma === 'en'
            ? 'Continue interview →'
            : 'Continuar entrevista →'}
        </button>
      )}

      {/* Dica da primeira pergunta — desaparece após 6s ou ao tocar o microfone */}
      {!gateDismissed && mostrarDica && perguntasRespondidas === 0 && interviewState === 'waiting' && (
        <div className="absolute bottom-[120px] left-1/2 -translate-x-1/2
                        bg-zinc-900/90 dark:bg-zinc-100/90
                        text-white dark:text-zinc-900
                        text-sm px-4 py-2.5 rounded-full
                        shadow-lg whitespace-nowrap
                        animate-fade-in-up z-10">
          {session.config?.idioma === 'en'
            ? '👆 Tap the microphone to start answering'
            : '👆 Toque no microfone para começar a responder'}
        </div>
      )}

      {/* Body — coluna única */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Avatar compacto */}
        <div className="flex-shrink-0 flex justify-center pt-5 pb-2">
          <AvatarDisplay
            avatarId={session.config.avatar_id}
            isSpeaking={voiceOutput.state === 'speaking'}
            isListening={voiceInput.state === 'listening'}
            isThinking={isThinking}
            size="small"
            customProfile={session.avatar_profiles?.find(
              p => p.id === session.config.avatar_id
            )}
            idioma={session.config.idioma}
            isDark={isDark}
          />
        </div>

        {/* Chat — ocupa o espaço restante
            O texto em tempo real do entrevistador é revelado
            diretamente dentro do histórico via liveInterviewerText */}
        <div className="flex-1 min-h-0">
          <TranscriptPanel
            conversation={session.conversation}
            isListening={voiceInput.state === 'listening'}
            isThinking={isThinking}
            liveInterviewerText={visibleText}
            interimTranscript={interimTranscript}
            lang={session.config?.idioma === 'en' ? 'en' : 'pt'}
            isDark={isDark}
          />
        </div>

      </div>

      {/* Footer */}
      <footer className={`shrink-0 flex flex-col items-center justify-center gap-2 border-t px-4 py-4 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-100'}`}>
        {interviewState === 'ended' ? (
          <p className="text-sm text-zinc-500">Redirecionando para o feedback...</p>
        ) : showUnsupportedBanner ? (
          <div className="flex w-full max-w-lg gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Digite sua resposta..."
              disabled={interviewState !== 'waiting'}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim() || interviewState !== 'waiting'}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-3 py-2 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {voiceError && (() => {
              const t = session.config?.idioma === 'en' ? {
                erro:      'Audio playback failed. The response was generated.',
                ouvir:     '🔊 Listen again',
                continuar: 'Continue without audio',
              } : {
                erro:      'Erro ao reproduzir áudio. A resposta foi gerada.',
                ouvir:     '🔊 Ouvir novamente',
                continuar: 'Continuar sem áudio',
              };
              return (
                <div className="flex flex-col items-center gap-2 mb-4">
                  <p className="text-sm text-red-400">{t.erro}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (currentQuestion) {
                          setVoiceError(false);
                          setInterviewState('speaking');
                          voiceOutput.speak(currentQuestion);
                        }
                      }}
                      className="text-xs bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                      {t.ouvir}
                    </button>
                    <button
                      onClick={() => {
                        setVoiceError(false);
                        setInterviewState('waiting');
                      }}
                      className="text-xs border border-zinc-600 text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      {t.continuar}
                    </button>
                  </div>
                </div>
              );
            })()}
            <MicrophoneButton
              state={micState}
              onClick={handleMicClick}
              lang={session.config?.idioma === 'en' ? 'en' : 'pt'}
            />
            {showEscape && (
              <button
                onClick={() => {
                  isProcessingTurnRef.current = false;
                  voiceInput.resetState();
                  setInterviewState('waiting');
                  setShowEscape(false);
                  toast(session.config?.idioma === 'en'
                    ? 'Ready to continue.'
                    : 'Pronto para continuar.');
                }}
                className="text-xs text-zinc-500 underline mt-2"
              >
                {session.config?.idioma === 'en'
                  ? 'Click here if the microphone freezes'
                  : 'Clique aqui se o microfone travar'}
              </button>
            )}
          </>
        )}
      </footer>

      {showPaymentGate && (
        <PaymentGateModal
          sessionId={session.id}
          motivo={paymentGateMotivo}
          onClose={() => { setShowPaymentGate(false); setGateDismissed(true); }}
          onBeforeRedirectToPayment={() => { suppressLeaveWarningRef.current = true; }}
        />
      )}
    </div>
  );
}
