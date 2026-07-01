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
  // Sem secret configurado não há como validar. Retornamos false (assinatura
  // não confiável) e deixamos o fallback — confirmação via API do MP — decidir.
  if (!secret) return false;

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') ?? '';

  if (!xSignature) return false;

  const ts = xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1];
  const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.split('=')[1];

  if (!ts || !v1) return false;

  // Usar data.id da QUERY STRING (padrão oficial do MP), com fallback pro body
  const dataIdQuery = req.nextUrl.searchParams.get('data.id');
  let dataIdBody = '';
  try { dataIdBody = JSON.parse(bodyText)?.data?.id ?? ''; } catch { /* ignorar */ }
  const dataId = dataIdQuery ?? dataIdBody;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  // Comparação sempre timing-safe. timingSafeEqual lança se os tamanhos
  // divergem (v1 malformado) — nesse caso a assinatura é inválida.
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

  try {
    const bodyText = await req.text();

    // A validação HMAC continua sendo a primeira verificação, mas não é mais
    // o único ponto de falha silenciosa: se ela falhar, ainda confirmamos o
    // pagamento pela API autoritativa do MP antes de decidir (ver fallback).
    const assinaturaValida = verificarAssinaturaMP(req, bodyText);

    const body = JSON.parse(bodyText);

    const tipo      = body.type ?? body.topic;
    const paymentId = body.data?.id ?? body.id;

    if (tipo !== 'payment' || !paymentId) {
      return NextResponse.json({ ok: true });
    }

    // Fonte da verdade: busca o pagamento na API do MP usando nosso access
    // token. Isso não pode ser forjado por quem chama o webhook — é o que
    // torna o fallback de assinatura seguro contra requisições falsificadas.
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

    // Fallback defensivo e temporário: a assinatura HMAC falhou, mas a API do
    // MP confirma pagamento aprovado com external_reference (UUID) válido.
    // Processamos mesmo assim e registramos alerta no Sentry, até o
    // MP_WEBHOOK_SECRET ser sincronizado corretamente entre painel e Vercel.
    if (!assinaturaValida) {
      Sentry.captureMessage(
        'mp-webhook: assinatura HMAC inválida — processado via fallback (pagamento aprovado confirmado pela API do MP)',
        {
          level: 'warning',
          tags: { route: 'mp-webhook', step: 'assinatura-fallback' },
          extra: { paymentId: String(paymentId), authUserId, plano },
        },
      );
    }

    // Idempotência: MP reenvia webhooks e o fallback abre espaço para replays.
    // Se já existe crédito para este pagamento, não criamos de novo.
    const { data: creditosExistentes } = await supabase
      .from('credits')
      .select('id')
      .eq('mp_payment_id', String(paymentId))
      .limit(1);

    if (creditosExistentes && creditosExistentes.length > 0) {
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
