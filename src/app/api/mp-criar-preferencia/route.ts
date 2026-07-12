import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Preference } from 'mercadopago';
import { mpConfig, PRECOS, DESCRICOES, type PlanoKey } from '@/lib/mp-config';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUser, splitName } from '@/lib/services/auth-server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde alguns minutos.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { plano, sessionId } = body;

    // Identidade (+ email/nome/data de cadastro) só do token verificado — o
    // external_reference do pagamento é amarrado a esse UUID e o webhook
    // credita a partir dele. Aceitar authUserId do corpo permitiria
    // criar/creditar pagamento em nome de outro usuário.
    const authUser = await getAuthUser(req);

    if (!plano) {
      return NextResponse.json({ error: 'Plano é obrigatório.' }, { status: 400 });
    }

    if (!authUser || !UUID_RE.test(authUser.id)) {
      return NextResponse.json({ error: 'Usuário inválido.' }, { status: 401 });
    }

    const authUserId = authUser.id;

    if (!(plano in PRECOS)) {
      return NextResponse.json(
        { error: 'Plano inválido.' },
        { status: 400 }
      );
    }

    // 'finalizar-atual' sem sessionId válido gera crédito órfão (session_id
    // NULL) — a sessão nunca é encontrada de volta e o usuário acaba pagando
    // de novo. Nunca confiar só no frontend para essa amarração.
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

      if (!sess || sess.auth_user_id !== authUserId) {
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

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://entrevistador-ai.vercel.app'
    ).replace(/\/$/, '');

    const externalRef = `${authUserId}|${plano}|${sessionId ?? 'novo'}`;

    // Dados extras do comprador para reduzir recusa por antifraude no MP.
    // `name` só existe de fato pra quem entrou via Google — cadastro por
    // email/senha (AuthForm.tsx) não coleta nome hoje, então first/last_name
    // ficam ausentes (nunca vazios) pra maioria dos usuários.
    const { firstName, lastName } = splitName(authUser.name);

    // Device ID (window.MP_DEVICE_SESSION_ID, gerado pelo security.js do MP
    // — ver PaymentFlow.tsx) reduz recusa de cartão por antifraude. Só
    // aplica ao Checkout Pro avulso, opcional: nunca falhar por ausência.
    const meliSessionId = req.headers.get('x-meli-session-id') ?? undefined;

    const preference = new Preference(mpConfig);
    const result = await preference.create({
      requestOptions: meliSessionId ? { meliSessionId } : undefined,
      body: {
        items: [{
          id:          plano,
          title:       DESCRICOES[plano as PlanoKey],
          quantity:    1,
          unit_price:  PRECOS[plano as PlanoKey],
          currency_id: 'BRL',
          category_id: 'services',
        }],
        payer: {
          ...(authUser.email && { email: authUser.email }),
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
        },
        // O SDK tipa `additional_info` como `string`, mas a API REST do MP
        // aceita (e esse campo antifraude documentado exige) um objeto —
        // cast só pra satisfazer o compilador, sem mudar o payload enviado.
        additional_info: ({
          items: [{
            id:          plano,
            title:       DESCRICOES[plano as PlanoKey],
            description: 'Crédito para simulação de entrevista de emprego com IA',
            category_id: 'services',
            quantity:    1,
            unit_price:  PRECOS[plano as PlanoKey],
          }],
          payer: {
            ...(firstName && { first_name: firstName }),
            ...(lastName && { last_name: lastName }),
            ...(authUser.createdAt && { registration_date: authUser.createdAt }),
          },
        } as unknown) as string,
        back_urls: {
          success: `${baseUrl}/pagamento/sucesso?plano=${plano}&session=${sessionId ?? ''}`,
          failure: `${baseUrl}/pagamento/falhou?plano=${plano}&session=${sessionId ?? ''}`,
          pending: `${baseUrl}/pagamento/pendente?plano=${plano}&session=${sessionId ?? ''}`,
        },
        auto_return:        'approved',
        notification_url:   `${baseUrl}/api/mp-webhook`,
        external_reference: externalRef,
      },
    });

    await supabase
      .from('payment_sessions')
      .insert({
        session_id:       sessionId ?? null,
        auth_user_id:     authUserId,
        plano,
        mp_preference_id: result.id,
        status:           'pending',
      });

    return NextResponse.json({
      preferenceId: result.id,
      initPoint:    result.init_point,
    });

  } catch {
    return NextResponse.json(
      { error: 'Erro ao criar preferência.' },
      { status: 500 }
    );
  }
}
