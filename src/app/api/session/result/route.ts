import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lightQueryRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Leitura PÚBLICA de um resultado de entrevista (link compartilhável
// /resultado/[id]). Passa pela service-role para que a anon key não precise
// acessar `sessions` diretamente (ver db/rls-policies.sql, Opção A).
//
// Retorna SOMENTE colunas seguras para exibição pública. NUNCA transcript,
// user_id, auth_user_id, config, nem os campos internos das evaluations
// (pergunta, resposta, resposta_ideal) — apenas nota/positivo/melhoria, que é
// o que a página de resultado usa.
const CAMPOS_PUBLICOS = `
  id, created_at, idioma,
  job_titulo, job_empresa,
  score_geral, score_clareza, score_relevancia, score_profundidade,
  competencia_comunicacao, competencia_resolucao, competencia_tecnico,
  competencia_lideranca, competencia_adaptabilidade,
  feedback_script, evaluations
`;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(lightQueryRateLimit, ip)) {
    return NextResponse.json({ session: null }, { status: 429 });
  }

  try {
    const { id } = await req.json();

    if (!id || typeof id !== 'string' || !UUID_RE.test(id)) {
      return NextResponse.json({ session: null }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('sessions')
      .select(CAMPOS_PUBLICOS)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ session: null }, { status: 404 });
    }

    // Sessão existe mas o feedback ainda não terminou de processar (janela
    // entre o fim da entrevista e o salvamento com scores reais em
    // /feedback). Sinaliza ao frontend para não exibir score zerado.
    const feedbackCompleto =
      data.score_geral !== null &&
      data.score_geral !== undefined &&
      data.competencia_comunicacao !== null &&
      data.competencia_comunicacao !== undefined;

    if (!feedbackCompleto) {
      return NextResponse.json({ session: null, processando: true }, { status: 200 });
    }

    // Sanitizar evaluations: manter só o que a página exibe, descartando
    // pergunta/resposta/resposta_ideal (conteúdo interno da avaliação).
    const evaluationsSeguras = Array.isArray(data.evaluations)
      ? data.evaluations.map((e: Record<string, unknown>) => ({
          nota:     typeof e?.nota === 'number' ? e.nota : 0,
          positivo: typeof e?.positivo === 'string' ? e.positivo : '',
          melhoria: typeof e?.melhoria === 'string' ? e.melhoria : '',
        }))
      : [];

    return NextResponse.json({
      session: { ...data, evaluations: evaluationsSeguras },
    });
  } catch {
    return NextResponse.json({ session: null }, { status: 500 });
  }
}
