'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AvatarProfile,
  Candidate,
  CompetencyScores,
  ConversationTurn,
  InterviewConfig,
  InterviewSession,
  Job,
  SessionScores,
  TurnEvaluation,
} from './types';
import { DEFAULT_CONFIG } from './constants';

const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  'google/gemini-3.1-flash-lite': { in: 0.25 / 1e6, out: 1.50 / 1e6 },
  'google/gemini-2.5-flash':      { in: 0.30 / 1e6, out: 2.50 / 1e6 },
  'anthropic/claude-haiku-4.5':   { in: 1.00 / 1e6, out: 5.00 / 1e6 },
  'claude-haiku-4-5-20251001':    { in: 1.00 / 1e6, out: 5.00 / 1e6 },
  'claude-sonnet-4-5':            { in: 3.00 / 1e6, out: 15.0 / 1e6 },
};

interface CustoSessao {
  ia: number;
  tts: number;
  total: number;
  tts_chars: number;
  tts_calls: number;
  ia_tokens_in: number;
  ia_tokens_out: number;
}

const CUSTO_INICIAL: CustoSessao = {
  ia: 0, tts: 0, total: 0,
  tts_chars: 0, tts_calls: 0,
  ia_tokens_in: 0, ia_tokens_out: 0,
};

function createEmptySession(): InterviewSession {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: 'setup',
    candidate: null,
    job: null,
    config: { ...DEFAULT_CONFIG },
    conversation: [],
    evaluations: [],
    scores: null,
    competencias: null,
    feedback_script: null,
  };
}

interface SessionStore {
  session: InterviewSession;
  isLoading: boolean;
  error: string | null;
  custoSessao: CustoSessao;
  setupStep: number;

  initSession: () => void;
  setCandidate: (candidate: Candidate) => void;
  setJob: (job: Job) => void;
  setConfig: (config: Partial<InterviewConfig>) => void;
  setStatus: (status: InterviewSession['status']) => void;
  addConversationTurn: (turn: ConversationTurn) => void;
  addEvaluation: (evaluation: TurnEvaluation) => void;
  setScores: (scores: SessionScores) => void;
  setCompetencias: (competencias: CompetencyScores) => void;
  setFeedbackScript: (script: string) => void;
  setAvatarProfiles: (profiles: AvatarProfile[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetSession: () => void;
  repeatSession: () => void;
  setSession: (session: InterviewSession) => void;
  addCustoIA: (inputTokens: number, outputTokens: number, model: string) => void;
  addCustoTTS: (chars: number) => void;
  resetCusto: () => void;
  setSetupStep: (step: number) => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      session: createEmptySession(),
      isLoading: false,
      error: null,
      custoSessao: { ...CUSTO_INICIAL },
      setupStep: 1,

      initSession: () =>
        set({ session: createEmptySession(), custoSessao: { ...CUSTO_INICIAL } }),

      setCandidate: (candidate) =>
        set((state) => ({ session: { ...state.session, candidate } })),

      setJob: (job) =>
        set((state) => ({ session: { ...state.session, job } })),

      setConfig: (config) =>
        set((state) => ({
          session: {
            ...state.session,
            config: { ...state.session.config, ...config },
          },
        })),

      setAvatarProfiles: (avatar_profiles) =>
        set((state) => ({ session: { ...state.session, avatar_profiles } })),

      setStatus: (status) =>
        set((state) => ({ session: { ...state.session, status } })),

      addConversationTurn: (turn) =>
        set((state) => ({
          session: {
            ...state.session,
            conversation: [...state.session.conversation, turn],
          },
        })),

      addEvaluation: (evaluation) =>
        set((state) => ({
          session: {
            ...state.session,
            evaluations: [...state.session.evaluations, evaluation],
          },
        })),

      setScores: (scores) =>
        set((state) => ({ session: { ...state.session, scores } })),

      setCompetencias: (competencias) =>
        set((state) => ({ session: { ...state.session, competencias } })),

      setFeedbackScript: (script) =>
        set((state) => ({ session: { ...state.session, feedback_script: script } })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      resetSession: () =>
        set({ session: createEmptySession(), isLoading: false, error: null, custoSessao: { ...CUSTO_INICIAL }, setupStep: 1 }),

      repeatSession: () =>
        set((state) => ({
          session: {
            id:              crypto.randomUUID(),
            created_at:      new Date().toISOString(),
            status:          'active',
            candidate:       state.session.candidate,
            job:             state.session.job,
            config:          { ...state.session.config },
            conversation:    [],
            evaluations:     [],
            scores:          null,
            competencias:    null,
            feedback_script: null,
          },
          isLoading: false,
          error: null,
          custoSessao: { ...CUSTO_INICIAL },
        })),

      setSession: (session) => set({ session }),

      addCustoIA: (inputTokens, outputTokens, model) => {
        const prices = MODEL_PRICES[model] ?? { in: 0, out: 0 };
        const custo = inputTokens * prices.in + outputTokens * prices.out;
        set(state => ({
          custoSessao: {
            ...state.custoSessao,
            ia:            state.custoSessao.ia + custo,
            total:         state.custoSessao.total + custo,
            ia_tokens_in:  state.custoSessao.ia_tokens_in + inputTokens,
            ia_tokens_out: state.custoSessao.ia_tokens_out + outputTokens,
          },
        }));
      },

      addCustoTTS: (chars) => {
        // OpenAI TTS-1-HD: $0.015 por 1.000 chars
        const custo = (chars / 1000) * 0.015;
        set(state => ({
          custoSessao: {
            ...state.custoSessao,
            tts:       state.custoSessao.tts + custo,
            total:     state.custoSessao.total + custo,
            tts_chars: state.custoSessao.tts_chars + chars,
            tts_calls: state.custoSessao.tts_calls + 1,
          },
        }));
      },

      resetCusto: () => set({ custoSessao: { ...CUSTO_INICIAL } }),

      setSetupStep: (step) => set({ setupStep: step }),
    }),
    {
      name: 'mockai-session',
      partialize: (state) => ({ session: state.session, setupStep: state.setupStep }),
    }
  )
);
