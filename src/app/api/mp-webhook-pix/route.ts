import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { isProducao, PERGUNTAS_POR_PLANO, type PlanoKey } from '@/lib/mp-config';
import { webhookRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_ORDERS_ACCESS_TOKEN = isProducao
  ? process.env.MP_ORDERS_ACCESS_TOKEN_PROD!
  : process.env.MP_ORDERS_ACCESS_TOKEN_TEST!;

// Validação própria da Orders API — outro secret, outro formato de evento
// (topic "order", não "payment"). NÃO reaproveitar verificarAssinaturaMP de
// mp-webhook/route.ts: o data.id de uma Order vem em MAIÚSCULO
// (ex: ORD01JQ4S4KY8...) e precisa virar minúsculo antes de entrar no
// manifest, senão o HMAC nunca bate — isso não existe no webhook de payment.
function verificarAssinaturaOrdersMP(req: NextRequest): boolean {
  const secret = (isProducao
    ? process.env.MP_ORDERS_WEBHOOK_SECRET_PROD
    : process.env.MP_ORDERS_WEBHOOK_SECRET_TEST
  )?.trim();

  if (!secret) return false;

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') ?? '';
  if (!xSignature) return false;

  const ts = xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1];
  const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.split('=')[1];
  if (!ts || !v1) return false;

  const dataId = (req.nextUrl.searchParams.get('data.id') ?? '').toLowerCase();
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(webhookRateLimit, ip)) {
    return NextResponse.json({ ok: true }, { status: 429 });
  }

  if (!verificarAssinaturaOrdersMP(req)) {
    Sentry.captureMessage(
      'mp-webhook-pix: assinatura HMAC inválida — request rejeitado',
      { level: 'warning', tags: { route: 'mp-webhook-pix' } }
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const orderId = req.nextUrl.searchParams.get('data.id');
  if (!orderId) return NextResponse.json({ ok: true });

  try {
    // Fonte da verdade é sempre a API, nunca o body do webhook — mesmo
    // princípio do webhook de payment.
    const resp = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${MP_ORDERS_ACCESS_TOKEN}` },
    });
    if (!resp.ok) return NextResponse.json({ ok: true });

    const order = await resp.json();

    const payment = order?.transactions?.payments?.[0];

    // Confirmado via teste ao vivo (1ª notificação real de Pix aprovado):
    // a order vem com status "processed" e o pagamento em
    // transactions.payments[0] com status_detail "accredited" — não
    // payment.status "approved" (esse campo não é usado pra Pix nesse
    // endpoint). Substitui a instrumentação temporária que logava a order
    // inteira pra descobrir esses valores.
    console.error('[mp-webhook-pix] status:', order?.status, '/ status_detail:', payment?.status_detail);

    const pagamentoAprovado =
      order?.status === 'processed' &&
      payment?.status_detail === 'accredited';

    // external_reference é só um UUID curto (ver mp-criar-pix/route.ts — a
    // Orders API limita a 64 chars, não cabe mais a string concatenada de
    // authUserId|plano|sessionId). auth_user_id/plano/session_id vêm direto
    // das colunas da linha de payment_sessions criada antes da order, não de
    // decodificar o ref.
    const shortRef = String(order?.external_reference ?? '');

    const { data: paymentSession } = await supabase
      .from('payment_sessions')
      .select('auth_user_id, plano, session_id')
      .eq('mp_preference_id', shortRef)
      .maybeSingle();

    const authUserId = paymentSession?.auth_user_id ?? null;
    const plano       = paymentSession?.plano ?? null;
    const sessionId   = paymentSession?.session_id ?? null;

    if (shortRef) {
      await supabase
        .from('payment_sessions')
        .update({
          mp_payment_id: payment?.id ? String(payment.id) : null,
          status:        order?.status ?? 'unknown',
        })
        .eq('mp_preference_id', shortRef);
    }

    if (!pagamentoAprovado) {
      console.error('[mp-webhook-pix] pagamento ainda não confirmado, status:', order?.status, payment?.status_detail);
      return NextResponse.json({ ok: true });
    }
    if (!authUserId || !UUID_RE.test(authUserId) || !plano || !payment?.id) {
      return NextResponse.json({ ok: true });
    }

    const mpPaymentId = String(payment.id);

    const { data: creditosExistentes } = await supabase
      .from('credits').select('id').eq('mp_payment_id', mpPaymentId).limit(1);
    if (creditosExistentes && creditosExistentes.length > 0) return NextResponse.json({ ok: true });

    const perguntas = PERGUNTAS_POR_PLANO[plano as PlanoKey] ?? 7;

    let sessionIdValido: string | null = null;
    if (sessionId) {
      const { data: sessExiste } = await supabase
        .from('sessions').select('id').eq('id', sessionId).maybeSingle();
      sessionIdValido = sessExiste ? sessionId : null;
    }

    // Mesma proteção de credits_payment_dedup (constraint única em
    // mp_payment_id + payment_seq) usada em mp-webhook/route.ts.
    const { error: creditError } = await supabase
      .from('credits')
      .upsert([{
        auth_user_id:  authUserId,
        tipo:          plano,
        perguntas,
        usado:         false,
        session_id:    plano === 'finalizar-atual' ? sessionIdValido : null,
        mp_payment_id: mpPaymentId,
        payment_seq:   0,
        mp_status:     'approved',
        expires_at:    null,
      }], { onConflict: 'mp_payment_id,payment_seq', ignoreDuplicates: true });
    if (creditError) Sentry.captureException(creditError, { tags: { route: 'mp-webhook-pix', step: 'credits' } });

    if (plano === 'finalizar-atual' && sessionIdValido) {
      const { error: sessError } = await supabase
        .from('sessions').update({ payment_status: 'paid' }).eq('id', sessionIdValido);
      if (sessError) Sentry.captureException(sessError, { tags: { route: 'mp-webhook-pix', step: 'session' } });
    }

    await supabase.from('audit_log').insert({
      evento:        'pagamento_pix_aprovado',
      auth_user_id:  authUserId,
      plano,
      mp_payment_id: mpPaymentId,
      ip,
      created_at:    new Date().toISOString(),
    }).then(() => {}, () => {});

    return NextResponse.json({ ok: true });

  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'mp-webhook-pix' } });
    return NextResponse.json({ ok: true });
  }
}
