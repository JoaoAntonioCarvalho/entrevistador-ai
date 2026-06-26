import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Preference } from 'mercadopago';
import { mpConfig, PRECOS, DESCRICOES, type PlanoKey } from '@/lib/mp-config';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('[mp-criar-preferencia] iniciando...');

  try {
    const body = await req.json();
    const { plano, sessionId, authUserId } = body;

    console.log('[mp-criar-preferencia] plano:', plano);
    console.log('[mp-criar-preferencia] sessionId:', sessionId);
    console.log('[mp-criar-preferencia] authUserId:', authUserId);

    if (!plano) {
      return NextResponse.json(
        { error: 'Plano é obrigatório.' },
        { status: 400 }
      );
    }

    if (!authUserId) {
      console.error('[mp-criar-preferencia] ERRO: authUserId vazio!');
      return NextResponse.json(
        { error: 'Usuário não autenticado.' },
        { status: 401 }
      );
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

    console.log('[mp-criar-preferencia] external_reference:', externalRef);
    console.log('[mp-criar-preferencia] baseUrl:', baseUrl);

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

    console.log('[mp-criar-preferencia] preference.id:', result.id);
    console.log('[mp-criar-preferencia] init_point:', result.init_point);

    const { error: dbError } = await supabase
      .from('payment_sessions')
      .insert({
        session_id:       sessionId ?? null,
        auth_user_id:     authUserId,
        plano,
        mp_preference_id: result.id,
        status:           'pending',
      });

    if (dbError) {
      console.error('[mp-criar-preferencia] erro ao salvar no banco:', dbError.message);
    } else {
      console.log('[mp-criar-preferencia] salvo no banco com sucesso');
    }

    return NextResponse.json({
      preferenceId: result.id,
      initPoint:    result.init_point,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[mp-criar-preferencia] ERRO CRÍTICO:', msg);
    if (error instanceof Error) console.error('[mp-criar-preferencia] stack:', error.stack);
    return NextResponse.json(
      { error: 'Erro ao criar preferência: ' + msg },
      { status: 500 }
    );
  }
}
