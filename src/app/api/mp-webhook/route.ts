import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Payment } from 'mercadopago';
import { mpConfig, PERGUNTAS_POR_PLANO, type PlanoKey } from '@/lib/mp-config';

export async function POST(req: NextRequest) {
  console.log('[mp-webhook] recebeu notificação');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await req.json();
    console.log('[mp-webhook] body:', JSON.stringify(body));

    if (body.type !== 'payment') {
      console.log('[mp-webhook] tipo ignorado:', body.type);
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    console.log('[mp-webhook] paymentId:', paymentId);
    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const paymentClient = new Payment(mpConfig);
    const payment = await paymentClient.get({ id: Number(paymentId) });
    console.log('[mp-webhook] payment.status:', payment.status);
    console.log('[mp-webhook] external_reference:', payment.external_reference);

    const ref = payment.external_reference ?? '';
    const [authUserId, plano, sessionId] = ref.split('|');
    console.log('[mp-webhook] authUserId:', authUserId, '| plano:', plano, '| sessionId:', sessionId);

    if (payment.status !== 'approved') {
      if (authUserId && plano) {
        await supabase
          .from('payment_sessions')
          .update({ mp_payment_id: String(paymentId), status: payment.status ?? 'pending' })
          .eq('auth_user_id', authUserId)
          .eq('plano', plano)
          .eq('status', 'pending');
      }
      return NextResponse.json({ ok: true });
    }

    if (!authUserId || !plano) {
      console.log('[mp-webhook] ERRO: authUserId ou plano vazio — abortando');
      return NextResponse.json({ ok: true });
    }

    const perguntas  = PERGUNTAS_POR_PLANO[plano as PlanoKey] ?? 7;
    const isMensal   = plano.startsWith('mensal-');
    const quantidade = isMensal ? 6 : 1;
    console.log('[mp-webhook] criando', quantidade, 'crédito(s) para', authUserId, 'plano:', plano);

    const creditos = Array.from({ length: quantidade }, () => ({
      auth_user_id:  authUserId,
      tipo:          plano,
      perguntas,
      usado:         false,
      session_id:    plano === 'finalizar-atual' && sessionId !== 'novo' ? sessionId : null,
      mp_payment_id: String(paymentId),
      mp_status:     'approved',
      expires_at:    isMensal
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    }));

    const { error: creditError } = await supabase.from('credits').insert(creditos);
    if (creditError) console.log('[mp-webhook] ERRO ao inserir créditos:', creditError.message);
    else console.log('[mp-webhook] créditos inseridos com sucesso');

    if (plano === 'finalizar-atual' && sessionId && sessionId !== 'novo') {
      await supabase
        .from('sessions')
        .update({ payment_status: 'paid' })
        .eq('id', sessionId);
      console.log('[mp-webhook] sessions.payment_status=paid para', sessionId);
    }

    await supabase
      .from('payment_sessions')
      .update({ mp_payment_id: String(paymentId), status: 'approved' })
      .eq('auth_user_id', authUserId)
      .eq('plano', plano)
      .eq('status', 'pending');

    console.log('[mp-webhook] concluído com sucesso');
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[mp-webhook] ERRO:', error);
    Sentry.captureException(error, {
      tags: { route: 'mp-webhook' },
    });
    // Sempre 200 pro MP — senão fica retentando
    return NextResponse.json({ ok: true });
  }
}
