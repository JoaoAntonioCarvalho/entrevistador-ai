import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { authUserId, sessionId, creditId } = await req.json() as {
      authUserId?: string;
      sessionId?:  string;
      creditId?:   string;
    };

    if (!authUserId || !UUID_RE.test(authUserId)) {
      return NextResponse.json({ ok: true }); // anônimo ou ID inválido
    }

    // Se veio creditId específico, marcar só ele
    if (creditId && creditId !== 'session-paid') {
      await supabase
        .from('credits')
        .update({ usado: true, session_id: sessionId ?? null })
        .eq('id', creditId)
        .eq('auth_user_id', authUserId);

      return NextResponse.json({ ok: true });
    }

    // Marcar o crédito mais antigo não usado
    const { data: credit } = await supabase
      .from('credits')
      .select('id')
      .eq('auth_user_id', authUserId)
      .eq('usado', false)
      .eq('mp_status', 'approved')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (credit) {
      await supabase
        .from('credits')
        .update({ usado: true, session_id: sessionId ?? null })
        .eq('id', credit.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
