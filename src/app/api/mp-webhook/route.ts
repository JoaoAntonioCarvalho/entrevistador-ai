import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Payment } from 'mercadopago';
import { mpConfig, PERGUNTAS_POR_PLANO, type PlanoKey } from '@/lib/mp-config';
import { webhookRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verificarAssinaturaMP(req: NextRequest, bodyText: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  console.error('[mp-webhook][debug] secret length:', secret?.length ?? 0);
  if (!secret) {
    console.error('[mp-webhook][debug] SEM secret configurado — pulando verificação');
    return true;
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') ?? '';

  if (!xSignature) {
    console.error('[mp-webhook][debug] SEM header x-signature — rejeitando');
    return false;
  }

  const ts = xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1];
  const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.split('=')[1];

  if (!ts || !v1) {
    console.error('[mp-webhook][debug] ts ou v1 ausentes no header. xSignature recebido:', xSignature);
    return false;
  }

  // Usar data.id da QUERY STRING (padrão oficial do MP), com fallback pro body
  const dataIdQuery = req.nextUrl.searchParams.get('data.id');
  let dataIdBody = '';
  try { dataIdBody = JSON.parse(bodyText)?.data?.id ?? ''; } catch { /* ignorar */ }
  const dataId = dataIdQuery ?? dataIdBody;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const bate = hmac === v1; // comparação simples só para o log — o return usa timingSafeEqual

  console.error('[mp-webhook][debug] dataIdQuery:', dataIdQuery, '| dataIdBody:', dataIdBody);
  console.error('[mp-webhook][debug] manifest:', manifest);
  console.error('[mp-webhook][debug] hmac calculado:', hmac);
  console.error('[mp-webhook][debug] v1 recebido:   ', v1);
  console.error('[mp-webhook][debug] bate (comparação simples):', bate);

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch (e) {
    console.error('[mp-webhook][debug] timingSafeEqual lançou erro (tamanhos diferentes?):', e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(webhookRateLimit, ip)) {
    return NextResponse.json({ ok: true }, { status: 429 });
  }

  try {
    const bodyText = await req.text();

    if (!verificarAssinaturaMP(req, bodyText)) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = JSON.parse(bodyText);

    const tipo      = body.type ?? body.topic;
    const paymentId = body.data?.id ?? body.id;

    if (tipo !== 'payment' || !paymentId) {
      return NextResponse.json({ ok: true });
    }

    const paymentClient = new Payment(mpConfig);
    const payment = await paymentClient.get({ id: Number(paymentId) });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preferenceId = (payment as any).preference_id as string | undefined;

    if (preferenceId) {
      await supabase
        .from('payment_sessions')
        .update({
          mp_payment_id: String(paymentId),
          status:        payment.status ?? 'unknown',
        })
        .eq('mp_preference_id', preferenceId);
    }

    if (payment.status !== 'approved') {
      return NextResponse.json({ ok: true });
    }

    const ref        = payment.external_reference ?? '';
    const partes     = ref.split('|');
    const authUserId = partes[0];
    const plano      = partes[1];
    const sessionId  = partes[2] && partes[2] !== 'novo' ? partes[2] : null;

    if (!authUserId || !UUID_RE.test(authUserId) || !plano) {
      return NextResponse.json({ ok: true });
    }

    const perguntas  = PERGUNTAS_POR_PLANO[plano as PlanoKey] ?? 7;
    const isMensal   = plano.startsWith('mensal-');
    const quantidade = isMensal ? 6 : 1;

    const creditos = Array.from({ length: quantidade }, () => ({
      auth_user_id:  authUserId,
      tipo:          plano,
      perguntas,
      usado:         false,
      session_id:    plano === 'finalizar-atual' && sessionId ? sessionId : null,
      mp_payment_id: String(paymentId),
      mp_status:     'approved',
      expires_at:    isMensal
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    }));

    const { error: creditError } = await supabase.from('credits').insert(creditos);
    if (creditError) {
      Sentry.captureException(creditError, { tags: { route: 'mp-webhook', step: 'credits' } });
    }

    if (plano === 'finalizar-atual' && sessionId) {
      const { error: sessError } = await supabase
        .from('sessions')
        .update({ payment_status: 'paid' })
        .eq('id', sessionId);

      if (sessError) {
        Sentry.captureException(sessError, { tags: { route: 'mp-webhook', step: 'session' } });
      }
    }

    // Audit log — falha silenciosa, não bloqueia o fluxo
    void Promise.resolve(
      supabase.from('audit_log').insert({
        evento:        'pagamento_aprovado',
        auth_user_id:  authUserId,
        plano,
        mp_payment_id: String(paymentId),
        ip,
        created_at:    new Date().toISOString(),
      })
    ).catch(() => {});

    return NextResponse.json({ ok: true });

  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'mp-webhook' } });
    return NextResponse.json({ ok: true });
  }
}
