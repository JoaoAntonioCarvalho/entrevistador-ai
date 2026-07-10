import { NextRequest, NextResponse } from 'next/server';
import { callAIJSON } from '@/lib/services/claude';
import { Job, normalizeJob } from '@/lib/types';
import { parseRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { isDailyCapExceeded, addDailyCost, PARSE_CALL_COST_USD } from '@/lib/services/cost-cap';
import { getAuthUserId } from '@/lib/services/auth-server';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!await checkRateLimit(parseRateLimit, ip)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos.' },
        { status: 429 }
      );
    }

    // Disjuntor de custo diário — só tráfego anônimo (gratuito)
    const authUserId = await getAuthUserId(req);
    if (!authUserId && await isDailyCapExceeded()) {
      return NextResponse.json(
        { error: 'Estamos com alta demanda. Tente novamente mais tarde.' },
        { status: 503 }
      );
    }

    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Corpo muito grande. Máximo 10 MB.' }, { status: 413 });
    }

    const { cargo, sessionId = 'unknown' } = await req.json();

    if (!cargo?.trim() || cargo.trim().length < 3) {
      return NextResponse.json(
        { error: 'Descreva o cargo ou área desejada.' },
        { status: 400 }
      );
    }

    const systemPrompt = `Você é um especialista em recrutamento.
Gere uma descrição de vaga fictícia mas realista e detalhada
para o cargo informado. A vaga deve parecer uma vaga real
de uma empresa brasileira de médio/grande porte.
Retorne APENAS JSON válido, sem markdown.`;

    const userMessage = `Gere uma vaga fictícia e realista para: "${cargo.trim()}"

Retorne JSON no formato:
{
  "titulo": "título exato do cargo",
  "empresa": "nome fictício de empresa brasileira plausível",
  "requisitos_obrigatorios": ["requisito 1", "requisito 2"],
  "requisitos_desejaveis": ["requisito 1", "requisito 2"],
  "responsabilidades": ["responsabilidade 1", "responsabilidade 2"],
  "stack_tecnica": ["tecnologia 1", "tecnologia 2"],
  "descricao_completa": "descrição completa da vaga em 3-4 parágrafos"
}

Requisitos:
- Entre 4-6 requisitos obrigatórios relevantes para o cargo
- Entre 2-4 requisitos desejáveis
- Entre 4-6 responsabilidades principais
- Stack técnica apenas se for vaga técnica (senão array vazio)
- Empresa com nome brasileiro convincente mas fictício`;

    try {
      const job = normalizeJob(await callAIJSON<Job>(
        'parsing',
        systemPrompt,
        userMessage,
        1500,
        sessionId ?? 'unknown'
      ));

      if (!authUserId) await addDailyCost(PARSE_CALL_COST_USD);

      return NextResponse.json({ job });
    } catch {
      // callAIJSON agora lança em vez de devolver formato de entrevista
      // disfarçado de Job — degrada graciosamente em vez de 500 genérico.
      const fallbackJob: Job = {
        titulo: cargo.trim(),
        empresa: '',
        requisitos_obrigatorios: [],
        requisitos_desejaveis: [],
        responsabilidades: [],
        stack_tecnica: [],
        descricao_completa: '',
      };
      return NextResponse.json({
        job: fallbackJob,
        warning: 'Não foi possível gerar a vaga automaticamente — preencha os campos manualmente.',
      });
    }

  } catch {
    return NextResponse.json(
      { error: 'Erro ao gerar vaga. Tente novamente.' },
      { status: 500 }
    );
  }
}
