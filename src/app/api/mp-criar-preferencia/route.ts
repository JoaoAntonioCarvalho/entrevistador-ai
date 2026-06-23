import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Preference } from 'mercadopago';
import { mpConfig, PRECOS, DESCRICOES, type PlanoKey } from '@/lib/mp-config';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { plano, sessionId, authUserId } = await req.json();

    if (!plano || !authUserId) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    if (!(plano in PRECOS)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://entrevistador-ai.vercel.app';

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
          failure: `${baseUrl}/pagamento/falhou`,
          pending: `${baseUrl}/pagamento/pendente`,
        },
        auto_return:        'approved',
        notification_url:   `${baseUrl}/api/mp-webhook`,
        external_reference: `${authUserId}|${plano}|${sessionId ?? 'novo'}`,
      },
    });

    await supabase.from('payment_sessions').insert({
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
      { error: 'Erro ao criar preferência de pagamento.' },
      { status: 500 }
    );
  }
}
