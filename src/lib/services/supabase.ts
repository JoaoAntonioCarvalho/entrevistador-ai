import { createClient } from '@supabase/supabase-js';
import { InterviewSession } from '../types';
import { authedFetch } from './api-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

// ── ID anônimo persistente do usuário ─────────────────────
const USER_ID_KEY = 'entrevistador-ai-user-id';

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

// ── Salvar sessão (via API route — evita RLS no browser) ──
export async function saveSessionToSupabase(
  session: InterviewSession,
  authUserId: string | null = null,
): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true') return;
  if (typeof window === 'undefined') return;

  const userId = getOrCreateUserId();
  // authUserId é ignorado pelo servidor (ele deriva a identidade do token via
  // authedFetch). Mantido na assinatura só por compatibilidade com os callers.
  void authUserId;

  try {
    const res = await authedFetch('/api/session/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session, userId }),
    });

    if (!res.ok) {
      console.error('[supabase] falha ao salvar sessão');
    }
  } catch {
    console.error('[supabase] falha ao salvar sessão');
  }
}

// ── Buscar histórico do usuário ───────────────────────────
export interface SessionSummary {
  id: string;
  created_at: string;
  job_titulo: string;
  job_empresa: string;
  score_geral: number;
  total_perguntas: number;
  nivel: string;
  tipo: string;
  idioma?: string;
}


export async function getUserHistory(): Promise<SessionSummary[]> {
  if (typeof window === 'undefined') return [];

  try {
    // authedFetch anexa o token; o servidor deriva o authUserId dele. Só
    // enviamos o localUserId (id anônimo do localStorage) para mesclar sessões
    // antigas sem dono autenticado.
    const res = await authedFetch('/api/session/history', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localUserId: getOrCreateUserId(),
      }),
    });

    if (!res.ok) return getLocalHistory();
    const data = await res.json();
    return data.sessions ?? [];

  } catch {
    return getLocalHistory();
  }
}

// ── Buscar histórico por vaga ─────────────────────────────
// Via rota service-role: a anon key não acessa `sessions` diretamente.
// authedFetch anexa o token; o servidor deriva o authUserId dele e mescla as
// sessões anônimas antigas pelo localUserId.
export async function getHistoryByJob(jobTitulo: string): Promise<SessionSummary[]> {
  if (!USE_SUPABASE) return [];
  if (typeof window === 'undefined') return [];

  try {
    const res = await authedFetch('/api/session/history-by-job', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitulo,
        localUserId: getOrCreateUserId(),
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions ?? [];
  } catch {
    return [];
  }
}

// ── Buscar sessão por ID (pública) ───────────────────────
// Via rota service-role, que devolve só os campos seguros para exibição
// pública (sem transcript, sem resposta_ideal, sem auth_user_id). A anon key
// não lê mais `sessions` diretamente — ver db/rls-policies.sql (Opção A).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSessionById(id: string): Promise<{ session: any | null; processando: boolean }> {
  if (process.env.NEXT_PUBLIC_USE_SUPABASE === 'true' && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/session/result', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) return { session: data.session, processando: false };
        if (data.processando) return { session: null, processando: true };
      }
    } catch { /* fallback para localStorage */ }
  }

  // Fallback: buscar no localStorage (sessões antigas/locais)
  try {
    const raw = localStorage.getItem(`entrevistador-ai-session-${id}`);
    if (raw) {
      return { session: JSON.parse(raw), processando: false };
    }
  } catch { /* não encontrado */ }

  return { session: null, processando: false };
}

// ── Fallback localStorage ─────────────────────────────────
function getLocalHistory(): SessionSummary[] {
  try {
    const raw = localStorage.getItem('entrevistador-ai-sessions');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveToLocalHistory(session: InterviewSession): void {
  try {
    const summaries = getLocalHistory();
    const summary: SessionSummary = {
      id:              session.id,
      created_at:      session.created_at,
      job_titulo:      session.job?.titulo ?? '',
      job_empresa:     session.job?.empresa ?? '',
      score_geral:     session.scores?.geral ?? 0,
      total_perguntas: session.evaluations?.length ?? 0,
      nivel:           session.config.nivel,
      tipo:            session.config.tipo,
    };
    const updatedSummaries = [
      summary,
      ...summaries.filter(s => s.id !== session.id),
    ].slice(0, 50);
    localStorage.setItem(
      'entrevistador-ai-sessions',
      JSON.stringify(updatedSummaries)
    );

    // Salvar sessão COMPLETA separadamente para o "Ver relatório"
    localStorage.setItem(
      `entrevistador-ai-session-${session.id}`,
      JSON.stringify(session)
    );
  } catch { /* silencioso */ }
}

// ── Teste de conectividade (diagnóstico) ─────────────────
export async function testSupabaseConnection(): Promise<void> {
  if (!supabaseUrl || !supabaseKey) {
    return;
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey);

    // Teste 1: verificar conectividade
    const { error } = await client
      .from('sessions')
      .select('count')
      .limit(1);

    if (error) {
      return;
    }

    // Teste 2: inserção de linha temporária
    const testRow = {
      id:          crypto.randomUUID(),
      user_id:     'test-user',
      status:      'test',
      job_titulo:  'Teste de conexão',
      job_empresa: 'Debug',
      score_geral: 0,
    };

    const { error: insertError } = await client
      .from('sessions')
      .insert(testRow)
      .select();

    if (insertError) {
      return;
    }

    // Limpar linha de teste
    await client.from('sessions').delete().eq('id', testRow.id);

  } catch { /* silencioso */ }
}
