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
    // token verificado, nunca do corpo — auth_user_id é salvo direto na
    // linha de payment_sessions e o webhook credita a partir dela.
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

    // A Orders API (diferente do Checkout Pro clássico) limita
    // external_reference a 64 caracteres — dois UUIDs concatenados (ex:
    // `${authUserId}|${plano}|${sessionId}`) passam disso e o MP rejeita com
    // 400 "length must be <= 64". Por isso aqui o external_reference é só um
    // UUID curto (36 chars); authUserId/plano/sessionId ficam salvos como
    // colunas próprias em payment_sessions, e o webhook (mp-webhook-pix)
    // recupera esses dados fazendo lookup por esse UUID em vez de decodificar
    // a string. O fluxo de cartão (mp-criar-preferencia, Preference API
    // clássica) não tem esse limite e continua usando a string concatenada.
    const shortRef = crypto.randomUUID();
    const valor = PRECOS[plano as PlanoKey].toFixed(2);

    // `name` só existe de fato pra quem entrou via Google — cadastro por
    // email/senha não coleta nome hoje (ver AuthForm.tsx), então
    // first/last_name ficam ausentes (nunca vazios) pra maioria dos usuários.
    // NUNCA usar "APRO" como first_name aqui — é valor exclusivo de teste do
    // MP que força aprovação automática; em produção usa o nome real ou omite.
    const { firstName, lastName } = splitName(authUser.name);

    // Insere ANTES de chamar o MP: o webhook depende dessa linha existir pra
    // recuperar auth_user_id/plano/session_id a partir do shortRef. Se isso
    // falhar, não faz sentido seguir e criar uma cobrança que o webhook nunca
    // vai conseguir reconciliar.
    const { error: insertError } = await supabase
      .from('payment_sessions')
      .insert({
        session_id:       sessionId ?? null,
        auth_user_id:     authUser.id,
        plano,
        mp_preference_id: shortRef,
        status:           'pending',
      });

    if (insertError) {
      console.error('[mp-criar-pix][debug] erro ao inserir payment_sessions:', insertError);
      console.error('[mp-criar-pix][debug] código do erro:', insertError.code);
      console.error('[mp-criar-pix][debug] mensagem:', insertError.message);
      console.error('[mp-criar-pix][debug] detalhe:', insertError.details);
      return NextResponse.json({ error: 'Erro ao criar cobrança Pix.' }, { status: 500 });
    }

    const requestBody = {
      type: 'online',
      external_reference: shortRef,
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
    };

    // DIAGNÓSTICO TEMPORÁRIO — remover após identificar a causa das falhas
    // no Pix. Exceção pontual à regra do CLAUDE.md de não reintroduzir logs
    // verbosos; nunca loga o access token completo.
    console.error('[mp-criar-pix][debug] isProducao:', isProducao);
    console.error('[mp-criar-pix][debug] access token length:', MP_ORDERS_ACCESS_TOKEN?.length ?? 0);
    console.error('[mp-criar-pix][debug] access token preview:', MP_ORDERS_ACCESS_TOKEN ? `${MP_ORDERS_ACCESS_TOKEN.slice(0, 10)}...` : 'AUSENTE');
    console.error('[mp-criar-pix][debug] payload enviado:', JSON.stringify(requestBody));

    const resp = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ORDERS_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(requestBody),
    });

    const order = await resp.json().catch(() => null);

    console.error('[mp-criar-pix][debug] status HTTP do MP:', resp.status);
    console.error('[mp-criar-pix][debug] corpo da resposta do MP:', JSON.stringify(order));

    if (!resp.ok || !order?.id) {
      console.error('[mp-criar-pix][debug] REQUEST FALHOU — payload enviado:', JSON.stringify(requestBody));
      await supabase
        .from('payment_sessions')
        .update({ status: 'error' })
        .eq('mp_preference_id', shortRef);
      return NextResponse.json(
        { error: 'Erro ao criar cobrança Pix.', debug: order },
        { status: 502 }
      );
    }

    const payment = order.transactions?.payments?.[0];
    const qrCode = payment?.payment_method?.qr_code;
    const qrCodeBase64 = payment?.payment_method?.qr_code_base64;

    return NextResponse.json({
      orderId:      order.id,
      qrCode,
      qrCodeBase64,
      expiresIn:    30 * 60,
    });

  } catch (error) {
    console.error('[mp-criar-pix][debug] EXCEÇÃO NÃO TRATADA:', error);
    console.error('[mp-criar-pix][debug] stack:', error instanceof Error ? error.stack : 'sem stack');
    return NextResponse.json(
      { error: 'Erro ao criar cobrança Pix.' },
      { status: 500 }
    );
  }
}
