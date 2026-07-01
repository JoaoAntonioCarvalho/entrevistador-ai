import { NextRequest, NextResponse } from 'next/server';
import { Job, normalizeJob } from '@/lib/types';
import { callAIJSON } from '@/lib/services/claude';
import { parseRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

function extractJobTitle(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[0]?.slice(0, 80) ?? 'Vaga não identificada';
}

function extractSkillsFromText(text: string): string[] {
  const common = [
    'JavaScript','TypeScript','React','Node.js','Python','Java','SQL',
    'AWS','Docker','Git','Vue','Angular','PostgreSQL','MongoDB',
    'GraphQL','REST','Kubernetes','Azure','GCP',
  ];
  return common.filter(s => text.toLowerCase().includes(s.toLowerCase())).slice(0, 8);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!await checkRateLimit(parseRateLimit, ip)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos.' },
        { status: 429 }
      );
    }

    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Corpo muito grande. Máximo 10 MB.' }, { status: 413 });
    }

    const { jobDescription, sessionId = 'unknown' } = (await req.json()) as { jobDescription: string; sessionId?: string };

    if (!jobDescription || jobDescription.trim().length < 30) {
      return NextResponse.json(
        { error: 'Descrição da vaga muito curta (mínimo 30 caracteres).' },
        { status: 400 }
      );
    }

    const systemPrompt =
      'Você é um parser de vagas de emprego. Extraia as informações exatamente. Se não existir, use array vazio.';

    const userMessage = `Extraia as informações da vaga abaixo e retorne um JSON com exatamente esta estrutura:
{
  "titulo": "string",
  "empresa": "string",
  "requisitos_obrigatorios": ["string"],
  "requisitos_desejaveis": ["string"],
  "responsabilidades": ["string"],
  "stack_tecnica": ["string"],
  "descricao_completa": "string"
}

Vaga:
${jobDescription.slice(0, 5000)}`;

    try {
      const job = normalizeJob(await callAIJSON<Job>('parsing', systemPrompt, userMessage, 2000, sessionId));
      job.descricao_completa = jobDescription.slice(0, 500);
      return NextResponse.json({ job });
    } catch {
      const fallbackJob: Job = {
        titulo: extractJobTitle(jobDescription),
        empresa: '',
        requisitos_obrigatorios: [],
        requisitos_desejaveis: [],
        responsabilidades: [],
        stack_tecnica: extractSkillsFromText(jobDescription),
        descricao_completa: jobDescription.slice(0, 500),
      };
      return NextResponse.json({
        job: fallbackJob,
        warning: 'Parsing parcial — revise os dados antes de iniciar.',
      });
    }
  } catch {
    return NextResponse.json({ error: 'Erro interno ao processar a vaga.' }, { status: 500 });
  }
}
