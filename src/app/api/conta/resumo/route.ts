import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

export const dynamic = 'force-dynamic';

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
    const { authUserId } = await req.json();
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Créditos disponíveis
    const { data: creditos } = await supabase
      .from('credits')
      .select('id, tipo, perguntas, usado, expires_at, created_at')
      .eq('auth_user_id', authUserId)
      .order('created_at', { ascending: false });

    // Pagamentos
    const { data: pagamentos } = await supabase
      .from('payment_sessions')
      .select('id, plano, status, created_at, mp_payment_id')
      .eq('auth_user_id', authUserId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Total de entrevistas
    const { count: totalEntrevistas } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('auth_user_id', authUserId)
      .in('status', ['completed', 'feedback']);

    const creditosDisponiveis = (creditos ?? []).filter(
      c => !c.usado && (
        !c.expires_at ||
        new Date(c.expires_at) > new Date()
      )
    );

    const creditosUsados = (creditos ?? []).filter(c => c.usado);

    return NextResponse.json({
      creditosDisponiveis,
      creditosUsados,
      pagamentos:        pagamentos ?? [],
      totalEntrevistas:  totalEntrevistas ?? 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
