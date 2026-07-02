import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUserId } from '@/lib/services/auth-server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CAMPOS = `
  id, created_at, job_titulo, job_empresa,
  score_geral, total_perguntas, nivel, tipo,
  status, payment_status, auth_user_id, user_id
`;

const STATUS_VALIDOS = ['completed', 'feedback', 'active'];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ sessions: [] }, { status: 429 });
  }

  try {
    const { localUserId } = await req.json();
    const authUserId = await getAuthUserId(req);

    let sessions: Record<string, unknown>[] = [];

    // 1. Buscar por auth_user_id (mais confiável)
    if (authUserId) {
      const { data } = await supabase
        .from('sessions')
        .select(CAMPOS)
        .eq('auth_user_id', authUserId)
        .in('status', STATUS_VALIDOS)
        .order('created_at', { ascending: false })
        .limit(50);

      sessions = data ?? [];
    }

    // 2. Buscar por user_id local e mesclar (cobre sessões com auth_user_id NULL)
    if (localUserId && localUserId !== 'server') {
      const idsExistentes = sessions.map(s => s.id);

      const { data: byLocal } = await supabase
        .from('sessions')
        .select(CAMPOS)
        .eq('user_id', localUserId)
        .in('status', STATUS_VALIDOS)
        .order('created_at', { ascending: false })
        .limit(50);

      const novas = (byLocal ?? []).filter(
        s => !idsExistentes.includes(s.id),
      );

      sessions = [...sessions, ...novas];
    }

    sessions.sort((a, b) =>
      new Date(b.created_at as string).getTime() -
      new Date(a.created_at as string).getTime(),
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
