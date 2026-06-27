import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
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

// ── Salvar sessão ─────────────────────────────────────────
export async function saveSessionToSupabase(
  session: InterviewSession,
  authUserId: string | null = null,
): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true') {
    return;
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? supabaseKey,
  );

  const userId = getOrCreateUserId();

  const row = {
    id:                         session.id,
    user_id:                    userId,
    auth_user_id:               authUserId,
    created_at:                 session.created_at,
    status:                     session.status,
    payment_status:             session.paymentStatus ?? 'pending',
    job_titulo:                 session.job?.titulo ?? '',
    job_empresa:                session.job?.empresa ?? '',
    score_geral:                session.scores?.geral ?? 0,
    score_clareza:              session.scores?.clareza ?? 0,
    score_relevancia:           session.scores?.relevancia ?? 0,
    score_profundidade:         session.scores?.profundidade ?? 0,
    competencia_comunicacao:    session.competencias?.comunicacao ?? 0,
    competencia_resolucao:      session.competencias?.resolucao_problemas ?? 0,
    competencia_tecnico:        session.competencias?.conhecimento_tecnico ?? 0,
    competencia_lideranca:      session.competencias?.lideranca ?? 0,
    competencia_adaptabilidade: session.competencias?.adaptabilidade ?? 0,
    total_perguntas:            session.evaluations?.length ?? 0,
    idioma:                     session.config.idioma,
    tipo:                       session.config.tipo,
    nivel:                      session.config.nivel,
    feedback_script:            session.feedback_script ?? '',
    transcript:                 session.conversation ?? [],
    evaluations:                session.evaluations ?? [],
    config:                     session.config,
  };

  console.log('[supabase] salvando sessão:', {
    id: session.id,
    auth_user_id: authUserId,
    status: session.status,
  });

  const { error } = await supabaseAdmin
    .from('sessions')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('[supabase] erro ao salvar:', error.message);
  } else {
    console.log('[supabase] sessão salva com sucesso');
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

const STATUS_HISTORICO = ['completed', 'feedback', 'active'] as const;

function mapSummary(s: SessionSummary): SessionSummary {
  return {
    id:              s.id,
    created_at:      s.created_at,
    job_titulo:      s.job_titulo  ?? '',
    job_empresa:     s.job_empresa ?? '',
    score_geral:     s.score_geral     ?? 0,
    total_perguntas: s.total_perguntas ?? 0,
    nivel:           s.nivel  ?? '',
    tipo:            s.tipo   ?? '',
    idioma:          s.idioma,
  };
}

export async function getUserHistory(): Promise<SessionSummary[]> {
  const localData = getLocalHistory();

  if (process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true') {
    return localData;
  }

  try {
    const supabaseBrowser = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: { session: authSession } } = await supabaseBrowser.auth.getSession();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const selectFields = `
      id, created_at, job_titulo, job_empresa,
      score_geral, total_perguntas, nivel, tipo, idioma
    `;

    if (authSession?.user) {
      // Buscar por auth_user_id (sessões salvas com usuário logado)
      const { data: byAuth } = await supabaseAdmin
        .from('sessions')
        .select(selectFields)
        .eq('auth_user_id', authSession.user.id)
        .in('status', STATUS_HISTORICO)
        .order('created_at', { ascending: false })
        .limit(50);

      if (byAuth && byAuth.length > 0) {
        return (byAuth as SessionSummary[]).map(mapSummary);
      }

      // Fallback: sessões salvas antes do login têm auth_user_id = null
      // Tentar pelo user_id local (gerado no browser)
      const localUserId = getOrCreateUserId();
      const { data: byLocal } = await supabaseAdmin
        .from('sessions')
        .select(selectFields)
        .eq('user_id', localUserId)
        .in('status', STATUS_HISTORICO)
        .order('created_at', { ascending: false })
        .limit(50);

      if (byLocal && byLocal.length > 0) {
        return (byLocal as SessionSummary[]).map(mapSummary);
      }

      return localData;
    }

    // Usuário não autenticado — fallback para localStorage
    return localData;

  } catch {
    return localData;
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
