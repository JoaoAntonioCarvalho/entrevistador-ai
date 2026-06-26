import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { authUserId, sessionId } = await req.json();

    console.log('[credits/check] authUserId:', authUserId);
    console.log('[credits/check] sessionId:', sessionId);

    if (!authUserId) {
      return NextResponse.json({ hasCredit: false, creditId: null });
    }

    if (sessionId) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('payment_status')
        .eq('id', sessionId)
        .single();

      console.log('[credits/check] session.payment_status:', sessionData?.payment_status);

      if (sessionData?.payment_status === 'paid') {
        return NextResponse.json({ hasCredit: true, creditId: 'session-paid', perguntas: 7 });
      }
    }

    const { data: credit, error } = await supabase
      .from('credits')
      .select('id, perguntas, expires_at')
      .eq('auth_user_id', authUserId)
      .eq('usado', false)
      .eq('mp_status', 'approved')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    console.log('[credits/check] credit encontrado:', credit);
    console.log('[credits/check] error:', error?.message);

    if (credit) {
      return NextResponse.json({
        hasCredit: true,
        creditId:  credit.id,
        perguntas: credit.perguntas,
      });
    }

    return NextResponse.json({ hasCredit: false, creditId: null });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[credits/check] ERRO:', msg);
    return NextResponse.json({ hasCredit: false, creditId: null });
  }
}
