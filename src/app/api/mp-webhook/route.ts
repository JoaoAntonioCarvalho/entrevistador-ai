import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Payment, PreApproval } from 'mercadopago';
import { mpConfig, MP_ACCESS_TOKEN, PERGUNTAS_POR_PLANO, type PlanoKey } from '@/lib/mp-config';
import { webhookRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENSAL_QTD = 6; // entrevistas por ciclo mensal

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verificarAssinaturaMP(req: NextRequest, bodyText: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') ?? '';
  if (!xSignature) return false;

  const ts = xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1];
  const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.split('=')[1];
  if (!ts || !v1) return false;

  const dataIdQuery = req.nextUrl.searchParams.get('data.id');
  let dataIdBody = '';
  try { dataIdBody = JSON.parse(bodyText)?.data?.id ?? ''; } catch { /* ignorar */ }
  const dataId = dataIdQuery ?? dataIdBody;

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

  try {
    const bodyText = await req.text();
    const assinaturaValida = verificarAssinaturaMP(req, bodyText);
    const body = JSON.parse(bodyText);

    const tipo   = String(body.type ?? body.topic ?? '');
    const dataId = body.data?.id ?? body.id;
    if (!dataId) return NextResponse.json({ ok: true });

    // A fonte da verdade em todos os casos é buscar o recurso na API do MP com
    // nosso access token — não pode ser forjado por quem chama o webhook. O MP
    // ora manda `type` (subscription_*), ora `topic` (preapproval /
    // authorized_payment) — cobrimos as duas formas.
    if (tipo.includes('authorized_payment')) {
      await handleAuthorizedPayment(String(dataId), ip);
    } else if (tipo.includes('preapproval')) {
      await handlePreapproval(String(dataId));
    } else if (tipo === 'payment') {
      await handlePayment(String(dataId), assinaturaValida, ip);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'mp-webhook' } });
    return NextResponse.json({ ok: true });
  }
}

// ── Pagamento avulso (finalizar-atual, credito-7, credito-14) ───────────────
async function handlePayment(paymentId: string, assinaturaValida: boolean, ip: string) {
  const paymentClient = new Payment(mpConfig);
  const payment = await paymentClient.get({ id: Number(paymentId) });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preferenceId = (payment as any).preference_id as string | undefined;
  if (preferenceId) {
    await supabase
      .from('payment_sessions')
      .update({ mp_payment_id: String(paymentId), status: payment.status ?? 'unknown' })
      .eq('mp_preference_id', preferenceId);
  }

  if (payment.status !== 'approved') return;

  const ref        = payment.external_reference ?? '';
  const partes     = ref.split('|');
  const authUserId = partes[0];
  const plano      = partes[1];
  const sessionId  = partes[2] && partes[2] !== 'novo' ? partes[2] : null;

  if (!authUserId || !UUID_RE.test(authUserId) || !plano) return;

  if (!assinaturaValida) {
    Sentry.captureMessage(
      'mp-webhook: assinatura HMAC inválida — processado via fallback (pagamento aprovado confirmado pela API do MP)',
      { level: 'warning', tags: { route: 'mp-webhook', step: 'assinatura-fallback' },
        extra: { paymentId: String(paymentId), authUserId, plano } },
    );
  }

  const { data: creditosExistentes } = await supabase
    .from('credits').select('id').eq('mp_payment_id', String(paymentId)).limit(1);
  if (creditosExistentes && creditosExistentes.length > 0) return;

  const perguntas  = PERGUNTAS_POR_PLANO[plano as PlanoKey] ?? 7;
  const isMensal   = plano.startsWith('mensal-'); // legado — mensal agora é assinatura
  const quantidade = isMensal ? MENSAL_QTD : 1;

  const creditos = Array.from({ length: quantidade }, () => ({
    auth_user_id:  authUserId,
    tipo:          plano,
    perguntas,
    usado:         false,
    session_id:    plano === 'finalizar-atual' && sessionId ? sessionId : null,
    mp_payment_id: String(paymentId),
    mp_status:     'approved',
    expires_at:    isMensal ? new Date(Date.now() + 30 * 864e5).toISOString() : null,
  }));

  const { error: creditError } = await supabase.from('credits').insert(creditos);
  if (creditError) Sentry.captureException(creditError, { tags: { route: 'mp-webhook', step: 'credits' } });

  if (plano === 'finalizar-atual' && sessionId) {
    const { error: sessError } = await supabase
      .from('sessions').update({ payment_status: 'paid' }).eq('id', sessionId);
    if (sessError) Sentry.captureException(sessError, { tags: { route: 'mp-webhook', step: 'session' } });
  }

  void auditLog({ evento: 'pagamento_aprovado', authUserId, plano, mpId: String(paymentId), ip });
}

// ── Assinatura: mudança de status do PreApproval ────────────────────────────
async function handlePreapproval(preapprovalId: string) {
  const pre = await new PreApproval(mpConfig).get({ id: preapprovalId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pre as any;

  const status      = (p.status as string) ?? 'pending';
  const ref         = (p.external_reference as string) ?? '';
  const [authUserId, plano] = ref.split('|');
  const nextPayment = (p.next_payment_date as string) ?? null;

  if (authUserId && UUID_RE.test(authUserId) && plano) {
    await supabase.from('subscriptions').upsert({
      mp_preapproval_id:  preapprovalId,
      auth_user_id:       authUserId,
      plano,
      perguntas:          PERGUNTAS_POR_PLANO[plano as PlanoKey] ?? null,
      status,
      current_period_end: nextPayment,
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'mp_preapproval_id' });
  } else {
    // Sem external_reference confiável — atualiza só o status pela chave.
    await supabase.from('subscriptions')
      .update({ status, current_period_end: nextPayment, updated_at: new Date().toISOString() })
      .eq('mp_preapproval_id', preapprovalId);
  }
}

// ── Assinatura: cobrança mensal autorizada → credita o ciclo ────────────────
async function handleAuthorizedPayment(authorizedPaymentId: string, ip: string) {
  const resp = await fetch(
    `https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`,
    { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } },
  );
  if (!resp.ok) return;
  const ap = await resp.json();

  // Só credita quando a cobrança foi efetivada.
  if (ap?.status !== 'processed') return;

  const preapprovalId = ap?.preapproval_id as string | undefined;
  if (!preapprovalId) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('auth_user_id, plano, perguntas')
    .eq('mp_preapproval_id', preapprovalId)
    .maybeSingle();

  if (!sub?.auth_user_id || !sub.plano) return;

  // Idempotência: cada authorized_payment credita uma única vez.
  const { data: existentes } = await supabase
    .from('credits').select('id').eq('mp_payment_id', String(authorizedPaymentId)).limit(1);
  if (existentes && existentes.length > 0) return;

  const perguntas = Number(sub.perguntas) || PERGUNTAS_POR_PLANO[sub.plano as PlanoKey] || 7;
  const expiresAt = new Date(Date.now() + 32 * 864e5).toISOString();

  const creditos = Array.from({ length: MENSAL_QTD }, () => ({
    auth_user_id:  sub.auth_user_id,
    tipo:          sub.plano,
    perguntas,
    usado:         false,
    session_id:    null,
    mp_payment_id: String(authorizedPaymentId),
    mp_status:     'approved',
    expires_at:    expiresAt,
  }));

  const { error: creditError } = await supabase.from('credits').insert(creditos);
  if (creditError) {
    Sentry.captureException(creditError, { tags: { route: 'mp-webhook', step: 'sub-credits' } });
    return;
  }

  await supabase.from('subscriptions')
    .update({ status: 'authorized', current_period_end: expiresAt, updated_at: new Date().toISOString() })
    .eq('mp_preapproval_id', preapprovalId);

  void auditLog({ evento: 'assinatura_cobranca', authUserId: sub.auth_user_id, plano: sub.plano, mpId: String(authorizedPaymentId), ip });
}

function auditLog(d: { evento: string; authUserId: string; plano: string; mpId: string; ip: string }) {
  return Promise.resolve(
    supabase.from('audit_log').insert({
      evento:        d.evento,
      auth_user_id:  d.authUserId,
      plano:         d.plano,
      mp_payment_id: d.mpId,
      ip:            d.ip,
      created_at:    new Date().toISOString(),
    })
  ).catch(() => {});
}
