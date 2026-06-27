import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Payment } from 'mercadopago';
import { mpConfig, PERGUNTAS_POR_PLANO, type PlanoKey } from '@/lib/mp-config';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('[mp-webhook] ← notificação recebida');

  try {
    const body = await req.json();
    console.log('[mp-webhook] body:', JSON.stringify(body));

    // MP envia tipo via 'type' (IPN novo) ou 'topic' (IPN antigo)
    const tipo      = body.type ?? body.topic;
    const paymentId = body.data?.id ?? body.id;

    console.log('[mp-webhook] tipo:', tipo);
    console.log('[mp-webhook] paymentId:', paymentId);

    if (tipo !== 'payment') {
      console.log('[mp-webhook] tipo ignorado:', tipo);
      return NextResponse.json({ ok: true });
    }

    if (!paymentId) {
      console.log('[mp-webhook] sem paymentId — ignorando');
      return NextResponse.json({ ok: true });
    }

    // Buscar detalhes do pagamento no MP
    console.log('[mp-webhook] buscando pagamento no MP...');
    const paymentClient = new Payment(mpConfig);
    const payment = await paymentClient.get({ id: Number(paymentId) });

    // preference_id existe na resposta da API mas não está no tipo do SDK v3
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preferenceId = (payment as any).preference_id as string | undefined;

    console.log('[mp-webhook] payment.status:', payment.status);
    console.log('[mp-webhook] payment.external_reference:', payment.external_reference);
    console.log('[mp-webhook] payment.preference_id:', preferenceId);

    // Atualizar status no banco pelo preference_id (identificador único e preciso)
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
      console.log('[mp-webhook] pagamento não aprovado:', payment.status);
      return NextResponse.json({ ok: true });
    }

    // Pagamento aprovado — processar
    const ref = payment.external_reference ?? '';
    console.log('[mp-webhook] processando ref:', ref);

    const partes     = ref.split('|');
    const authUserId = partes[0];
    const plano      = partes[1];
    const sessionId  = partes[2] && partes[2] !== 'novo' ? partes[2] : null;

    console.log('[mp-webhook] authUserId:', authUserId);
    console.log('[mp-webhook] plano:', plano);
    console.log('[mp-webhook] sessionId:', sessionId);

    if (!authUserId || !plano) {
      console.error('[mp-webhook] ERRO: ref inválida:', ref);
      return NextResponse.json({ ok: true });
    }

    const perguntas  = PERGUNTAS_POR_PLANO[plano as PlanoKey] ?? 7;
    const isMensal   = plano.startsWith('mensal-');
    const quantidade = isMensal ? 6 : 1;

    console.log('[mp-webhook] criando', quantidade, 'crédito(s) de', perguntas, 'perguntas');

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
      console.error('[mp-webhook] ERRO ao criar créditos:', creditError.message);
    } else {
      console.log('[mp-webhook] ✓ créditos criados com sucesso');
    }

    if (plano === 'finalizar-atual' && sessionId) {
      console.log('[mp-webhook] atualizando payment_status sessionId:', sessionId);

      const { data: sessData, error: sessError } = await supabase
        .from('sessions')
        .update({ payment_status: 'paid' })
        .eq('id', sessionId)
        .select('id, payment_status');

      console.log('[mp-webhook] sessão atualizada:', sessData, 'erro:', sessError?.message);

      if (sessError) {
        console.error('[mp-webhook] ERRO ao atualizar sessão:', sessError.message);
      } else {
        console.log('[mp-webhook] ✓ payment_status = paid para sessão:', sessionId);
      }
    }

    console.log('[mp-webhook] ✓ processamento concluído');
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[mp-webhook] ERRO CRÍTICO:', error);
    Sentry.captureException(error, {
      tags: { route: 'mp-webhook' },
    });
    // Sempre 200 pro MP — senão fica retentando
    return NextResponse.json({ ok: true });
  }
}
