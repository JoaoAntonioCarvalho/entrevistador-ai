import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('[session/save] variáveis de ambiente ausentes',
      { url: !!supabaseUrl, key: !!serviceKey });
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta.' },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { session, authUserId, userId } = await req.json();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Session ID obrigatório.' },
        { status: 400 },
      );
    }

    const sessionData: Record<string, unknown> = {
      id:                          session.id,
      user_id:                     userId ?? 'anonymous',
      auth_user_id:                authUserId ?? null,
      created_at:                  session.created_at,
      status:                      session.status ?? 'active',
      // Só inclui payment_status se for 'paid' — evita sobrescrever o valor
      // atualizado pelo webhook do Mercado Pago com 'pending' em saves subsequentes
      ...(session.paymentStatus === 'paid' ? { payment_status: 'paid' } : {}),
      job_titulo:                  session.job?.titulo      ?? null,
      job_empresa:                 session.job?.empresa     ?? null,
      score_geral:                 session.scores?.geral    ?? null,
      score_clareza:               session.scores?.clareza  ?? null,
      score_relevancia:            session.scores?.relevancia   ?? null,
      score_profundidade:          session.scores?.profundidade ?? null,
      competencia_comunicacao:     session.competencias?.comunicacao          ?? null,
      competencia_resolucao:       session.competencias?.resolucao_problemas  ?? null,
      competencia_tecnico:         session.competencias?.conhecimento_tecnico  ?? null,
      competencia_lideranca:       session.competencias?.lideranca             ?? null,
      competencia_adaptabilidade:  session.competencias?.adaptabilidade        ?? null,
      total_perguntas:             session.evaluations?.length ?? null,
      idioma:                      session.config?.idioma ?? null,
      tipo:                        session.config?.tipo   ?? null,
      nivel:                       session.config?.nivel  ?? null,
      feedback_script:             session.feedback_script ?? null,
      transcript:                  session.conversation ?? [],
      evaluations:                 session.evaluations  ?? [],
      config:                      session.config       ?? {},
    };

    const { error } = await supabase
      .from('sessions')
      .upsert(sessionData, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar sessão.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch {
    return NextResponse.json({ error: 'Erro ao salvar sessão.' }, { status: 500 });
  }
}
