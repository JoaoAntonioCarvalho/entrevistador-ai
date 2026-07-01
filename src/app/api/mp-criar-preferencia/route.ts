import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Preference } from 'mercadopago';
import { mpConfig, PRECOS, DESCRICOES, type PlanoKey } from '@/lib/mp-config';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

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
    const { plano, sessionId, authUserId } = body;

    if (!plano) {
      return NextResponse.json({ error: 'Plano é obrigatório.' }, { status: 400 });
    }

    if (!authUserId || !UUID_RE.test(authUserId)) {
      return NextResponse.json({ error: 'Usuário inválido.' }, { status: 401 });
    }

    if (!(plano in PRECOS)) {
      return NextResponse.json(
        { error: 'Plano inválido.' },
        { status: 400 }
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://entrevistador-ai.vercel.app'
    ).replace(/\/$/, '');

    const externalRef = `${authUserId}|${plano}|${sessionId ?? 'novo'}`;

    const preference = new Preference(mpConfig);
    const result = await preference.create({
      body: {
        items: [{
          id:          plano,
          title:       DESCRICOES[plano as PlanoKey],
          quantity:    1,
          unit_price:  PRECOS[plano as PlanoKey],
          currency_id: 'BRL',
        }],
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
