import { createClient } from '@supabase/supabase-js';
import { InterviewSession } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

function getClient(userId: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { 'x-user-id': userId },
    },
  });
}

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

  try {
    const res = await fetch('/api/session/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session, authUserId, userId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[supabase] erro ao salvar sessão:', data.error ?? res.status);
    } else {
      console.log('[supabase] sessão salva com sucesso', {
        id: session.id, auth_user_id: authUserId, status: session.status,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[supabase] erro ao salvar sessão:', msg);
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
    const { createBrowserClient: makeBrowserClient } = await import('@supabase/ssr');
    const browser = makeBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { session: authSession } } = await browser.auth.getSession();

    const res = await fetch('/api/session/history', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authUserId:  authSession?.user?.id ?? null,
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
export async function getHistoryByJob(jobTitulo: string): Promise<SessionSummary[]> {
  if (!USE_SUPABASE) return [];
  const userId = getOrCreateUserId();
  const client = getClient(userId);

  const { data, error } = await client
    .from('sessions')
    .select('id, created_at, job_titulo, job_empresa, score_geral, total_perguntas, nivel, tipo')
    .eq('user_id', userId)
    .ilike('job_titulo', `%${jobTitulo}%`)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data as SessionSummary[]) ?? [];
}

// ── Buscar sessão por ID (pública) ───────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSessionById(id: string): Promise<any | null> {
  // Tentar Supabase primeiro se estiver ativo
  if (process.env.NEXT_PUBLIC_USE_SUPABASE === 'true') {
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data;
      }
    } catch { /* fallback para localStorage */ }
  }

  // Fallback: buscar no localStorage
  try {
    const raw = localStorage.getItem(`entrevistador-ai-session-${id}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch { /* não encontrado */ }

  return null;
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
