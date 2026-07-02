import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUserId } from '@/lib/services/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }

  try {
    const { sessionId } = await req.json();
    const authUserId = await getAuthUserId(req);

    if (!sessionId || !authUserId) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // Marcar sessão como descartada — só permite para sessão do próprio usuário e não paga
    await supabase
      .from('sessions')
      .update({ status: 'discarded' })
      .eq('id', sessionId)
      .eq('auth_user_id', authUserId)
      .is('payment_status', null);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao descartar sessão.' }, { status: 500 });
  }
}
