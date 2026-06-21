import { NextRequest, NextResponse } from 'next/server';
import { Candidate } from '@/lib/types';
import { callAIJSON } from '@/lib/services/claude';
import { parseRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

function extractName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[0]?.slice(0, 60) ?? 'Candidato';
}

function extractSkills(text: string): string[] {
  const common = [
    'JavaScript','TypeScript','React','Node.js','Python','Java','SQL',
    'AWS','Docker','Git','CSS','HTML','Vue','Angular','PostgreSQL',
    'MongoDB','Redis','GraphQL','REST','API','Scrum','Agile',
  ];
  return common.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  ).slice(0, 10);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(parseRateLimit, ip)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde alguns minutos.' },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const sessionId = (formData.get('sessionId') as string | null) ?? 'unknown';
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx');

  let rawText = '';

  try {
    if (isPdf) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse');
      const result = await pdfParse(buffer);
      rawText = result.text;
    } else if (isDocx) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      return NextResponse.json(
        { error: 'Formato não suportado. Use PDF ou DOCX.' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível ler o arquivo. Tente com outro PDF ou DOCX.' },
      { status: 422 }
    );
  }

  if (rawText.trim().length < 50) {
    return NextResponse.json(
      { error: 'Texto não encontrado no arquivo.' },
      { status: 422 }
    );
  }

  const systemPrompt =
    'Você é um parser de currículos. Extraia as informações exatamente como estão. Não invente dados. Se um campo não existir, use string vazia ou array vazio.';

  const userMessage = `Extraia as informações do currículo abaixo e retorne um JSON com exatamente esta estrutura:
{
  "nome": "string",
  "cargo_atual": "string",
  "experiencias": [{ "cargo": "string", "empresa": "string", "periodo": "string", "descricao": "string" }],
  "habilidades": ["string"],
  "formacao": [{ "curso": "string", "instituicao": "string", "periodo": "string" }],
  "certificacoes": ["string"]
}

Currículo:
${rawText.slice(0, 6000)}`;

  try {
    const candidate = await callAIJSON<Candidate>('parsing', systemPrompt, userMessage, 2000, sessionId);
    return NextResponse.json({ candidate });
  } catch {
    const fallbackCandidate: Candidate = {
      nome: extractName(rawText),
      cargo_atual: '',
      experiencias: [],
      habilidades: extractSkills(rawText),
      formacao: [],
      certificacoes: [],
    };
    return NextResponse.json({
      candidate: fallbackCandidate,
      warning: 'Parsing parcial — alguns campos podem estar incompletos.',
    });
  }
}
