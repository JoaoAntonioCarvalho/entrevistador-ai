import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lightQueryRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUserId } from '@/lib/services/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(lightQueryRateLimit, ip)) {
    return NextResponse.json({ hasPending: false }, { status: 429 });
  }

  try {
    const authUserId = await getAuthUserId(req);

    if (!authUserId) {
      return NextResponse.json({ hasPending: false });
    }

    // Sessão em andamento e não paga do usuário logado
    // Usa NOT IN para status e cobertura explícita de payment_status null/unpaid
    const { data: session } = await supabase
      .from('sessions')
      .select('id, job_titulo, job_empresa, config, created_at, status, payment_status, transcript')
      .eq('auth_user_id', authUserId)
      .not('status', 'in', '(completed,discarded,feedback)')
      .or('payment_status.is.null,payment_status.neq.paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ hasPending: false });
    }

    // Sessões anteriores ao salvamento completo não têm transcript — pagar
    // para "continuar" não teria de onde restaurar. Só o boolean vai ao
    // cliente, nunca o transcript em si.
    const restauravel =
      Array.isArray(session.transcript) && session.transcript.length > 0;

    return NextResponse.json({
      hasPending:  true,
      sessionId:   session.id,
      jobTitulo:   session.job_titulo  ?? 'Entrevista em andamento',
      jobEmpresa:  session.job_empresa ?? '',
      config:      session.config,
      createdAt:   session.created_at,
      restauravel,
    });

  } catch {
    return NextResponse.json({ hasPending: false });
  }
}
