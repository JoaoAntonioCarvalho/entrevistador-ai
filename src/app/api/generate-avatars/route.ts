import { NextRequest, NextResponse } from 'next/server';
import { callAIJSON } from '@/lib/services/claude';
import { Job } from '@/lib/types';
import { parseRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

interface AvatarGeneratedBilingual {
  sarah: {
    titulo_pt: string; descricao_pt: string; especialidade_pt: string;
    titulo_en: string; descricao_en: string; especialidade_en: string;
  };
  carlos: {
    titulo_pt: string; descricao_pt: string; especialidade_pt: string;
    titulo_en: string; descricao_en: string; especialidade_en: string;
  };
  alex: {
    titulo_pt: string; descricao_pt: string; especialidade_pt: string;
    titulo_en: string; descricao_en: string; especialidade_en: string;
  };
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

    const { job, sessionId }: { job: Job; sessionId: string } =
      await req.json();

    if (!job?.titulo) {
      return NextResponse.json({ error: 'Vaga inválida.' }, { status: 400 });
    }

    const systemPrompt = `Você é um especialista em recrutamento.
Gere perfis realistas para 3 entrevistadores com base na vaga fornecida.
Gere os campos em PORTUGUÊS BRASILEIRO e em INGLÊS na mesma resposta.
Retorne APENAS JSON válido. Sem markdown. Sem texto antes ou depois.`;

    const userMessage = `Vaga: ${job.titulo}
Empresa: ${job.empresa || 'não informada'}
Requisitos: ${job.requisitos_obrigatorios?.slice(0, 3).join(', ') || 'não informados'}
Stack: ${job.stack_tecnica?.slice(0, 4).join(', ') || 'não informada'}

Gere perfis bilíngues para os 3 entrevistadores fixos abaixo.
Cada um deve ter papel diferente e relevante para esta vaga.

Papéis obrigatórios:
- Sarah: sempre ligada a recrutamento, pessoas ou cultura
- Carlos: sempre ligado ao lado técnico ou de negócios da vaga
- Alex: sempre ligado a liderança, gestão ou área específica da vaga

Regras:
- Títulos devem ser cargos reais que existiriam nesta empresa
- Descrições: 1 frase curta e direta sobre o que avalia nesta entrevista
- Especialidade: 2-3 palavras que resumem o foco
- Os campos _en devem ser traduções naturais em inglês americano
- NÃO traduza literalmente — adapte para soar natural em inglês

Retorne JSON exato:
{
  "sarah": {
    "titulo_pt": "cargo em português",
    "descricao_pt": "descrição em português",
    "especialidade_pt": "2-3 palavras em português",
    "titulo_en": "job title in English",
    "descricao_en": "description in English",
    "especialidade_en": "2-3 words in English"
  },
  "carlos": {
    "titulo_pt": "...", "descricao_pt": "...", "especialidade_pt": "...",
    "titulo_en": "...", "descricao_en": "...", "especialidade_en": "..."
  },
  "alex": {
    "titulo_pt": "...", "descricao_pt": "...", "especialidade_pt": "...",
    "titulo_en": "...", "descricao_en": "...", "especialidade_en": "..."
  }
}

Exemplos para Software Engineer:
sarah.titulo_pt: "Talent Acquisition — Engenharia"
sarah.titulo_en: "Engineering Talent Acquisition"
carlos.titulo_pt: "Staff Engineer"
carlos.titulo_en: "Staff Engineer"
alex.titulo_pt: "Engineering Manager"
alex.titulo_en: "Engineering Manager"`;

    const result = await callAIJSON<AvatarGeneratedBilingual>(
      'parsing',
      systemPrompt,
      userMessage,
      1000,
      sessionId ?? 'unknown'
    );

    return NextResponse.json({ avatars: result });

  } catch {
    return NextResponse.json({
      avatars: {
        sarah: {
          titulo_pt: 'Especialista em Recrutamento',
          descricao_pt: 'Avalia fit cultural e motivações do candidato.',
          especialidade_pt: 'Pessoas & Cultura',
          titulo_en: 'Talent Acquisition Specialist',
          descricao_en: 'Evaluates cultural fit and candidate motivations.',
          especialidade_en: 'People & Culture',
        },
        carlos: {
          titulo_pt: 'Líder Técnico',
          descricao_pt: 'Aprofunda competências técnicas e experiências.',
          especialidade_pt: 'Técnico & Sistemas',
          titulo_en: 'Tech Lead',
          descricao_en: 'Dives deep into technical skills and experience.',
          especialidade_en: 'Technical & Systems',
        },
        alex: {
          titulo_pt: 'Head de People',
          descricao_pt: 'Avalia liderança, adaptabilidade e soft skills.',
          especialidade_pt: 'Liderança & Fit',
          titulo_en: 'Head of People',
          descricao_en: 'Evaluates leadership, adaptability and soft skills.',
          especialidade_en: 'Leadership & Fit',
        },
      },
    });
  }
}
