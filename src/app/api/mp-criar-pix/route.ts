import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { isProducao, PRECOS, type PlanoKey } from '@/lib/mp-config';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUser, splitName } from '@/lib/services/auth-server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_ORDERS_ACCESS_TOKEN = isProducao
  ? process.env.MP_ORDERS_ACCESS_TOKEN_PROD!
  : process.env.MP_ORDERS_ACCESS_TOKEN_TEST!;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde alguns minutos.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { plano, sessionId } = body;

    // Mesma regra de segurança de mp-criar-preferencia: identidade só do
    // token verificado, nunca do corpo — o external_reference é amarrado a
    // esse UUID e o webhook credita a partir dele.
    const authUser = await getAuthUser(req);

    if (!plano) {
      return NextResponse.json({ error: 'Plano é obrigatório.' }, { status: 400 });
    }

    if (!authUser || !UUID_RE.test(authUser.id)) {
      return NextResponse.json({ error: 'Usuário inválido.' }, { status: 401 });
    }

    if (!(plano in PRECOS)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    // Pix avulso apenas — mensal é assinatura recorrente e só cartão.
    if (plano === 'mensal-starter' || plano === 'mensal-pro') {
      return NextResponse.json({ error: 'Plano mensal não aceita Pix.' }, { status: 400 });
    }

    // 'finalizar-atual' sem sessionId válido pertencente ao chamador gera
    // crédito órfão — mesma checagem de ownership de mp-criar-preferencia.
    if (plano === 'finalizar-atual') {
      if (!sessionId || !UUID_RE.test(sessionId)) {
        return NextResponse.json(
          { error: 'Sessão inválida para finalizar entrevista.' },
          { status: 400 }
        );
      }

      const { data: sess } = await supabase
        .from('sessions')
        .select('id, auth_user_id, status, payment_status')
        .eq('id', sessionId)
        .maybeSingle();

      if (!sess || sess.auth_user_id !== authUser.id) {
        return NextResponse.json(
          { error: 'Sessão não encontrada.' },
          { status: 404 }
        );
      }
      if (sess.payment_status === 'paid') {
        return NextResponse.json(
          { error: 'Esta entrevista já foi paga.' },
          { status: 409 }
        );
      }
    }

    const externalRef = `${authUser.id}|${plano}|${sessionId ?? 'novo'}`;
    const valor = PRECOS[plano as PlanoKey].toFixed(2);

    // `name` só existe de fato pra quem entrou via Google — cadastro por
    // email/senha não coleta nome hoje (ver AuthForm.tsx), então
    // first/last_name ficam ausentes (nunca vazios) pra maioria dos usuários.
    // NUNCA usar "APRO" como first_name aqui — é valor exclusivo de teste do
    // MP que força aprovação automática; em produção usa o nome real ou omite.
    const { firstName, lastName } = splitName(authUser.name);

    const resp = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ORDERS_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: 'online',
        external_reference: externalRef,
        total_amount: valor,
        processing_mode: 'automatic',
        payer: {
          ...(authUser.email && { email: authUser.email }),
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
        },
        transactions: {
          payments: [{
            amount: valor,
            payment_method: { id: 'pix', type: 'bank_transfer' },
            expiration_time: 'PT30M',
          }],
        },
      }),
    });

    const order = await resp.json();

    if (!resp.ok || !order?.id) {
      return NextResponse.json({ error: 'Erro ao criar cobrança Pix.' }, { status: 502 });
    }

    const payment = order.transactions?.payments?.[0];
    const qrCode = payment?.payment_method?.qr_code;
    const qrCodeBase64 = payment?.payment_method?.qr_code_base64;

    await supabase
      .from('payment_sessions')
      .insert({
        session_id:       sessionId ?? null,
        auth_user_id:     authUser.id,
        plano,
        mp_preference_id: String(order.id),
        status:           'pending',
      });

    return NextResponse.json({
      orderId:      order.id,
      qrCode,
      qrCodeBase64,
      expiresIn:    30 * 60,
    });

  } catch {
    return NextResponse.json(
      { error: 'Erro ao criar cobrança Pix.' },
      { status: 500 }
    );
  }
}
