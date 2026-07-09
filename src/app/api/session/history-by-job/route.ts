import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUserId } from '@/lib/services/auth-server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Histórico filtrado por vaga (gráfico de evolução em /historico). Passa pela
// service-role para que a anon key não leia `sessions` diretamente. Identidade
// vem do token; sessões anônimas antigas são mescladas pelo localUserId.
const CAMPOS = `
  id, created_at, job_titulo, job_empresa,
  score_geral, total_perguntas, nivel, tipo, status, auth_user_id, user_id
`;

const STATUS_VALIDOS = ['completed', 'feedback', 'active'];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ sessions: [] }, { status: 429 });
  }

  try {
    const { jobTitulo, localUserId } = await req.json();

    if (!jobTitulo || typeof jobTitulo !== 'string') {
      return NextResponse.json({ sessions: [] });
    }

    const authUserId = await getAuthUserId(req);

    let sessions: Record<string, unknown>[] = [];

    // 1. Por usuário autenticado (fonte confiável)
    if (authUserId) {
      const { data } = await supabase
        .from('sessions')
        .select(CAMPOS)
        .eq('auth_user_id', authUserId)
        .ilike('job_titulo', `%${jobTitulo}%`)
        .in('status', STATUS_VALIDOS)
        .order('created_at', { ascending: true });
      sessions = data ?? [];
    }

    // 2. Por id local anônimo (cobre sessões antigas sem auth_user_id) —
    // nunca sessões já pertencentes a OUTRA conta autenticada, senão um
    // user_id local coincidente vazaria dados entre contas diferentes.
    if (localUserId && localUserId !== 'server') {
      const idsExistentes = sessions.map(s => s.id);
      let query = supabase
        .from('sessions')
        .select(CAMPOS)
        .eq('user_id', localUserId)
        .ilike('job_titulo', `%${jobTitulo}%`)
        .in('status', STATUS_VALIDOS)
        .order('created_at', { ascending: true });

      query = authUserId
        ? query.or(`auth_user_id.is.null,auth_user_id.eq.${authUserId}`)
        : query.is('auth_user_id', null);

      const { data: byLocal } = await query;
      const novas = (byLocal ?? []).filter(s => !idsExistentes.includes(s.id));
      sessions = [...sessions, ...novas];
    }

    // Ordem cronológica ascendente para o gráfico de evolução
    sessions.sort((a, b) =>
      new Date(a.created_at as string).getTime() -
      new Date(b.created_at as string).getTime(),
    );

    const resultado = sessions.map(s => ({
      id:              s.id,
      created_at:      s.created_at,
      job_titulo:      s.job_titulo      ?? '',
      job_empresa:     s.job_empresa     ?? '',
      score_geral:     s.score_geral     ?? 0,
      total_perguntas: s.total_perguntas ?? 0,
      nivel:           s.nivel           ?? '',
      tipo:            s.tipo            ?? '',
    }));

    return NextResponse.json({ sessions: resultado });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
