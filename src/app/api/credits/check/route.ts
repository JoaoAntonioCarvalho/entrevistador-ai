import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUserId } from '@/lib/services/auth-server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ hasCredit: false, creditId: null });
  }

  try {
    const { sessionId } = await req.json();
    const authUserId = await getAuthUserId(req);

    // Verificar payment_status da sessão ANTES de checar authUserId —
    // o webhook do MP seta payment_status independentemente do auth carregar no frontend.
    if (sessionId) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('payment_status')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionData?.payment_status === 'paid') {
        return NextResponse.json({ hasCredit: true, creditId: 'session-paid', perguntas: 7 });
      }
    }

    if (!authUserId) {
      return NextResponse.json({ hasCredit: false, creditId: null });
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
      .maybeSingle();

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
