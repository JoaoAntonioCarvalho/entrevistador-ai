import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { PreApproval } from 'mercadopago';
import { mpConfig } from '@/lib/mp-config';
import { lightQueryRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUserId } from '@/lib/services/auth-server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Cancela a assinatura recorrente do usuário no MercadoPago. O acesso ao mês já
// pago continua até os créditos expirarem — apenas não renova.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(lightQueryRateLimit, ip)) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde.' }, { status: 429 });
  }

  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return NextResponse.json({ error: 'Usuário inválido.' }, { status: 401 });
  }

  try {
    // Assinatura ativa do próprio usuário (deriva a identidade do token).
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('mp_preapproval_id, status, plano')
      .eq('auth_user_id', authUserId)
      .in('status', ['authorized', 'pending', 'paused'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.mp_preapproval_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 404 });
    }

    await new PreApproval(mpConfig).update({
      id:   sub.mp_preapproval_id,
      body: { status: 'cancelled' },
    });

    await supabase.from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('mp_preapproval_id', sub.mp_preapproval_id)
      .eq('auth_user_id', authUserId);

    await Promise.resolve(
      supabase.from('audit_log').insert({
        evento:        'assinatura_cancelada_pelo_usuario',
        auth_user_id:  authUserId,
        plano:         sub.plano,
        mp_payment_id: sub.mp_preapproval_id,
        ip,
        created_at:    new Date().toISOString(),
      })
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'subscription-cancel' } });
    return NextResponse.json({ error: 'Erro ao cancelar assinatura.' }, { status: 500 });
  }
}
