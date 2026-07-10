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

    // Verificar payment_status da sessão — EXIGE que pertença ao chamador.
    // O id de uma sessão paga é o mesmo exposto publicamente em
    // /resultado/[id]; sem checar auth_user_id, qualquer pessoa com esse
    // link herdaria hasCredit:true de uma sessão alheia. Pagar sempre exige
    // login, então uma sessão paga sempre tem dono autenticado — exigir
    // authUserId aqui não afeta o fluxo legítimo.
    if (sessionId && authUserId) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('payment_status, auth_user_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionData?.payment_status === 'paid' && sessionData?.auth_user_id === authUserId) {
        return NextResponse.json({
          hasCredit: true, creditId: 'session-paid',
          perguntas: 7, maxPerguntas: 7, totalCreditos: 1, isMensal: false,
        });
      }
    }

    if (!authUserId) {
      return NextResponse.json({ hasCredit: false, creditId: null });
    }

    // Busca TODOS os créditos disponíveis para calcular o MAIOR tamanho
    // (perguntas) que o usuário pode usar. Antes só olhávamos o crédito mais
    // antigo — então quem tinha um crédito de 7 sobrando via a opção de 14
    // bloqueada mesmo depois de comprar um crédito de 14.
    const { data: creditos } = await supabase
      .from('credits')
      .select('id, perguntas, tipo, created_at')
      .eq('auth_user_id', authUserId)
      .eq('usado', false)
      .eq('mp_status', 'approved')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: true });

    if (creditos && creditos.length > 0) {
      const maxPerguntas = Math.max(...creditos.map(c => Number(c.perguntas) || 0));
      const isMensal = creditos.some(
        c => typeof c.tipo === 'string' && c.tipo.startsWith('mensal-'),
      );
      // Contagem de créditos avulsos válidos por quantidade de perguntas —
      // reaproveita `creditos` (já filtrado por usado/aprovado/não-expirado
      // acima) em vez de uma segunda query.
      const creditosPorPerguntas: Record<number, number> = {};
      creditos.forEach(c => {
        const qtd = Number(c.perguntas) || 0;
        creditosPorPerguntas[qtd] = (creditosPorPerguntas[qtd] ?? 0) + 1;
      });
      return NextResponse.json({
        hasCredit:     true,
        creditId:      creditos[0].id,   // mais antigo — mantém compatibilidade
        perguntas:     maxPerguntas,     // MAIOR tamanho disponível (corrige o lock)
        maxPerguntas,
        totalCreditos: creditos.length,
        isMensal,
        creditosPorPerguntas,
      });
    }

    // Sem créditos disponíveis. Verifica se é um assinante mensal que já usou
    // todas as entrevistas do ciclo atual (algum crédito mensal ainda dentro da
    // validade) — para mostrar "plano esgotado" em vez de "Sem crédito", que
    // dava a impressão de que ele nunca pagou.
    const { data: mensalAtivo } = await supabase
      .from('credits')
      .select('tipo, expires_at')
      .eq('auth_user_id', authUserId)
      .like('tipo', 'mensal-%')
      .not('expires_at', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mensalAtivo) {
      // Data de renovação da assinatura (quando aplicável) para a mensagem
      // "renova em X" — agora que o plano renova de verdade.
      const { data: assinatura } = await supabase
        .from('subscriptions')
        .select('current_period_end')
        .eq('auth_user_id', authUserId)
        .eq('status', 'authorized')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        hasCredit:      false,
        creditId:       null,
        isMensal:       true,
        mensalEsgotado: true,
        renovaEm:       assinatura?.current_period_end ?? mensalAtivo.expires_at ?? null,
      });
    }

    return NextResponse.json({ hasCredit: false, creditId: null });

  } catch {
    return NextResponse.json({ hasCredit: false, creditId: null });
  }
}
