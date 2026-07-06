import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Candidate, normalizeCandidate } from '@/lib/types';
import { callAIJSON } from '@/lib/services/claude';
import { parseRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import { isDailyCapExceeded, addDailyCost, PARSE_CALL_COST_USD } from '@/lib/services/cost-cap';
import { getAuthUserId } from '@/lib/services/auth-server';
import { pdfToBase64Images } from '@/lib/pdf-to-images';

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

function textoTemQualidade(texto: string): boolean {
  if (!texto || texto.trim().length < 300) return false;
  const palavras = texto.trim().split(/\s+/);
  if (palavras.length < 20) return false;
  const letras = texto.replace(/[^a-zA-ZÀ-ú]/g, '');
  if (letras.length < 100) return false;
  return true;
}

function parseJSONCandidate(text: string): Candidate {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try { return JSON.parse(clean) as Candidate; } catch { /* fall through */ }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) as Candidate; } catch { /* fall through */ }
  }

  let depth = 0, start = -1, end = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (text[i] === '}') { depth--; if (depth === 0 && start !== -1) { end = i; break; } }
  }
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)) as Candidate; } catch { /* fall through */ }
  }

  throw new Error('JSON inválido na resposta da IA');
}

async function callVisionForResume(images: string[]): Promise<Candidate> {
  const systemPrompt =
    'Você é um parser de currículos. Extraia as informações exatamente como estão. Não invente dados. Se um campo não existir, use string vazia ou array vazio.';

  const extractPrompt = `Este é um currículo profissional em formato de imagem (PDF escaneado ou com layout visual). Pode ter múltiplas colunas, foto, ícones e formatação gráfica.

Leia TODO o conteúdo visível com atenção, incluindo texto em colunas laterais, seções menores e qualquer texto que apareça em qualquer parte da imagem.

Extraia TODAS as informações e retorne SOMENTE um JSON válido, sem nenhum texto antes ou depois:

{
  "nome": "nome completo da pessoa",
  "cargo_atual": "cargo mais recente ou objetivo",
  "email": "email se visível",
  "telefone": "telefone se visível",
  "experiencias": [
    {
      "cargo": "título do cargo",
      "empresa": "nome da empresa",
      "periodo": "período (ex: Jan 2023 - Dez 2023)",
      "descricao": "resumo das responsabilidades"
    }
  ],
  "habilidades": ["lista", "de", "skills"],
  "formacao": [
    {
      "curso": "nome do curso ou grau",
      "instituicao": "nome da instituição",
      "periodo": "período ou ano de conclusão"
    }
  ],
  "idiomas": ["idioma: nível"],
  "certificacoes": [],
  "resumo": "perfil profissional resumido"
}

Extraia o máximo de informação possível de TODAS as páginas. Se uma informação não estiver visível, use string vazia "". Retorne SOMENTE o JSON, absolutamente nada mais.`;

  if (process.env.OPENROUTER_API_KEY) {
    type OAIContent = { type: string; text?: string; image_url?: { url: string } };
    const imageMessages: OAIContent[] = images.flatMap((img, i) => [
      { type: 'text', text: `Página ${i + 1} do currículo:` },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img}` } },
    ]);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://entrevistador-ia.com.br',
        'X-Title': 'Entrevistador.IA',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [...imageMessages, { type: 'text', text: extractPrompt }] },
        ],
      }),
    });

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const text = data?.choices?.[0]?.message?.content ?? '';
    return parseJSONCandidate(text);
  }

  // Anthropic direto
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content: Anthropic.MessageParam['content'] = [
    ...images.flatMap((img, i) => [
      { type: 'text' as const, text: `Página ${i + 1} do currículo:` },
      {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: img },
      },
    ]),
    { type: 'text' as const, text: extractPrompt },
  ];

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  });

  const responseBlock = message.content[0];
  const text = responseBlock.type === 'text' ? responseBlock.text : '';
  return parseJSONCandidate(text);
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 413 });
  }

  const formData = await req.formData();
  const sessionId = (formData.get('sessionId') as string | null) ?? 'unknown';
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx');

  let rawText = '';

  try {
    if (isPdf) {
      // Import dinâmico com interop CJS/ESM: com pdf-parse em
      // serverComponentsExternalPackages, require() direto quebra
      // ("TypeError: e is not a function") — a função pode vir em .default
      const pdfParseMod = (await import('pdf-parse')) as unknown as {
        default?: unknown;
      };
      const pdfParse = (pdfParseMod.default ?? pdfParseMod) as (
        buf: Buffer
      ) => Promise<{ text: string }>;
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
  } catch (err) {
    if (isPdf) {
      // pdf-parse falhou (comum em PDFs do Canva/Figma com features
      // novas do formato) — NÃO desistir: seguir com rawText vazio,
      // o que força o caminho de visão logo abaixo
      // (textoTemQualidade('') === false).
      console.error('[parse-resume] pdf-parse falhou, tentando visão:', err);
      rawText = '';
    } else {
      return NextResponse.json(
        { error: 'Não foi possível ler o arquivo. Tente com outro PDF ou DOCX.' },
        { status: 422 }
      );
    }
  }

  // Detectar PDF de imagem (texto extraído insuficiente ou de baixa qualidade)
  if (isPdf && !textoTemQualidade(rawText)) {
    try {
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
      const images = await pdfToBase64Images(arrayBuffer);

      if (images.length === 0) {
        return NextResponse.json(
          { error: 'Não foi possível processar o PDF.' },
          { status: 400 }
        );
      }

      const candidate = normalizeCandidate(await callVisionForResume(images));
      // Vision (imagens) custa mais que parsing de texto — estimativa maior
      if (!authUserId) await addDailyCost(PARSE_CALL_COST_USD * 4);
      return NextResponse.json({ candidate, isImagePdf: true });
    } catch (err) {
      console.error('[parse-resume] visão falhou:', err);
      // Fallback: tentar parsear com o texto incompleto se houver algo aproveitável
      if (rawText && rawText.trim().length > 50) {
        try {
          const systemFallback =
            'Você é um parser de currículos. Extraia as informações exatamente como estão. Não invente dados. Se um campo não existir, use string vazia ou array vazio.';
          const userFallback = `Extraia as informações deste currículo (texto pode estar incompleto) e retorne JSON com a estrutura abaixo. Preencha apenas os campos que conseguir identificar:
{
  "nome": "string",
  "cargo_atual": "string",
  "experiencias": [{ "cargo": "string", "empresa": "string", "periodo": "string", "descricao": "string" }],
  "habilidades": ["string"],
  "formacao": [{ "curso": "string", "instituicao": "string", "periodo": "string" }],
  "certificacoes": ["string"]
}

Texto do currículo:
${rawText.slice(0, 4000)}`;
          const candidate = normalizeCandidate(await callAIJSON<Candidate>('parsing', systemFallback, userFallback, 2000, sessionId));
          if (!authUserId) await addDailyCost(PARSE_CALL_COST_USD);
          return NextResponse.json({ candidate, isImagePdf: true, warning: 'Parsing parcial — algumas informações podem estar incompletas.' });
        } catch (err) {
          console.error('[parse-resume] visão falhou:', err);
          /* cai no erro abaixo */
        }
      }

      return NextResponse.json(
        { error: 'Não foi possível ler este PDF. Tente "Preencher manualmente" para continuar.' },
        { status: 422 }
      );
    }
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
    const candidate = normalizeCandidate(await callAIJSON<Candidate>('parsing', systemPrompt, userMessage, 2000, sessionId));
    if (!authUserId) await addDailyCost(PARSE_CALL_COST_USD);
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
