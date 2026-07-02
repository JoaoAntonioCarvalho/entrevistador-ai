import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { PreApproval } from 'mercadopago';
import {
  mpConfig, PRECOS, DESCRICOES, PERGUNTAS_POR_PLANO, isAssinatura, type PlanoKey,
} from '@/lib/mp-config';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUser } from '@/lib/services/auth-server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Cria uma ASSINATURA recorrente (mensal) no MercadoPago via PreApproval.
// Só cartão — Pix/boleto não renovam sozinhos. Planos avulsos continuam em
// /api/mp-criar-preferencia. O crédito de cada mês é concedido pelo webhook a
// cada pagamento autorizado (subscription_authorized_payment).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde alguns minutos.' }, { status: 429 });
  }

  try {
    const { plano } = await req.json();

    // Identidade e e-mail do token verificado — o payer_email da assinatura
    // não pode vir do cliente (seria forjável).
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Usuário inválido.' }, { status: 401 });
    }
    if (!authUser.email) {
      return NextResponse.json(
        { error: 'Sua conta não tem e-mail para a assinatura.' },
        { status: 400 },
      );
    }

    if (!isAssinatura(plano)) {
      return NextResponse.json(
        { error: 'Plano de assinatura inválido.' },
        { status: 400 },
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://entrevistador-ai.vercel.app'
    ).replace(/\/$/, '');

    const preapproval = new PreApproval(mpConfig);
    const result = await preapproval.create({
      body: {
        reason:             DESCRICOES[plano as PlanoKey],
        external_reference: `${authUser.id}|${plano}`,
        payer_email:        authUser.email,
        back_url:           `${baseUrl}/pagamento/sucesso?plano=${plano}`,
        auto_recurring: {
          frequency:          1,
          frequency_type:     'months',
          transaction_amount: PRECOS[plano as PlanoKey],
          currency_id:        'BRL',
        },
        status: 'pending',
      },
    });

    // Registra a assinatura (pendente até o usuário autorizar o cartão).
    // Falha aqui não bloqueia o checkout — o webhook reconcilia pelo preapproval_id.
    void supabase
      .from('subscriptions')
      .insert({
        auth_user_id:      authUser.id,
        mp_preapproval_id: result.id,
        plano,
        perguntas:         PERGUNTAS_POR_PLANO[plano as PlanoKey],
        status:            'pending',
      })
      .then(({ error }) => {
        if (error) Sentry.captureException(error, { tags: { route: 'mp-criar-assinatura', step: 'insert' } });
      });

    // PreApproval retorna init_point para o usuário autorizar o cartão.
    return NextResponse.json({ initPoint: result.init_point });

  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'mp-criar-assinatura' } });
    return NextResponse.json(
      { error: 'Erro ao criar assinatura.' },
      { status: 500 },
    );
  }
}
