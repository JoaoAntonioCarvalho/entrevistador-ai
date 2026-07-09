import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { getAuthUserId } from '@/lib/services/auth-server';

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
    const { sessionId, creditId, perguntas } = await req.json() as {
      sessionId?:  string;
      creditId?:   string;
      perguntas?:  number;
    };

    const authUserId = await getAuthUserId(req);
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

    const tamanho = Number(perguntas) || 0;

    // Consumir o crédito do tamanho EXATO da entrevista — avulso não tem
    // sobreposição (um crédito de 14 não gasta numa entrevista de 7 nem
    // vice-versa). Mensal continua flexível: qualquer crédito do plano que
    // cubra o tamanho serve, já que o limite é por ciclo, não por compra
    // avulsa. Empate de tamanho → mais antigo primeiro.
    const { data: creditos } = await supabase
      .from('credits')
      .select('id, perguntas, tipo, created_at')
      .eq('auth_user_id', authUserId)
      .eq('usado', false)
      .eq('mp_status', 'approved')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: true });

    if (!creditos || creditos.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const cobrem = creditos
      .filter(c => {
        const perguntasCredito = Number(c.perguntas) || 0;
        const isMensalCredit = typeof c.tipo === 'string' && c.tipo.startsWith('mensal-');
        return isMensalCredit ? perguntasCredito >= tamanho : perguntasCredito === tamanho;
      })
      .sort((a, b) => (Number(a.perguntas) || 0) - (Number(b.perguntas) || 0));

    // Sem crédito do tamanho exato (nem mensal cobrindo) — não deveria
    // acontecer com o lock do /setup. Não consome nada em vez de gastar um
    // crédito do tamanho errado.
    const alvo = cobrem[0];
    if (!alvo) {
      return NextResponse.json({ ok: true });
    }

    await supabase
      .from('credits')
      .update({ usado: true, session_id: sessionId ?? null })
      .eq('id', alvo.id)
      .eq('auth_user_id', authUserId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
