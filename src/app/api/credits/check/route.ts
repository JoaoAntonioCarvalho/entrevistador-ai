import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { authUserId, sessionId } = await req.json();

    if (!authUserId) {
      return NextResponse.json({ hasCredit: false, creditId: null });
    }

    if (sessionId) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('payment_status')
        .eq('id', sessionId)
        .single();

      if (sessionData?.payment_status === 'paid') {
        return NextResponse.json({ hasCredit: true, creditId: 'session-paid' });
      }
    }

    const { data: credit } = await supabase
      .from('credits')
      .select('id, perguntas, expires_at')
      .eq('auth_user_id', authUserId)
      .eq('usado', false)
      .eq('mp_status', 'approved')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (credit) {
      return NextResponse.json({
        hasCredit: true,
        creditId:  credit.id,
        perguntas: credit.perguntas,
      });
    }

    return NextResponse.json({ hasCredit: false, creditId: null });

  } catch {
    return NextResponse.json({ hasCredit: false, creditId: null });
  }
}
