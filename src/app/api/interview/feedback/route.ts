import { NextRequest, NextResponse } from 'next/server';
import {
  TurnEvaluation,
  InterviewConfig,
  SessionScores,
  CompetencyScores,
} from '@/lib/types';
import { callAIJSONWithUsage } from '@/lib/services/claude';
import {
  aiRateLimit,
  feedbackRateLimit,
  checkRateLimit,
  getClientIp,
} from '@/lib/services/rate-limit';
import { isDailyCapExceeded, addDailyCost, estimateAICost } from '@/lib/services/cost-cap';
import { getAuthUserId } from '@/lib/services/auth-server';

interface FeedbackRequest {
  evaluations: TurnEvaluation[];
  config: InterviewConfig;
  candidateName: string;
  jobTitle: string;
  sessionId: string;
}

interface FeedbackScript {
  ponto_forte:              string;
  melhoria_principal:       string;
  recomendacao:             string;
  ponto_forte_pt?:          string;
  melhoria_principal_pt?:   string;
  recomendacao_pt?:         string;
}

interface FeedbackResponse {
  feedback_script: FeedbackScript;
  scores: SessionScores;
  competencias: CompetencyScores;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip) ||
      !await checkRateLimit(feedbackRateLimit, ip)) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }

  // Disjuntor de custo diário: anônimo bloqueado quando o teto estoura.
  // O cliente (/feedback) tem retry + fallback local de scores, então o
  // usuário ainda recebe um relatório mesmo com 503 aqui.
  const authUserId = await getAuthUserId(req);
  if (!authUserId && await isDailyCapExceeded()) {
    return NextResponse.json(
      { error: 'Serviço temporariamente indisponível. Tente novamente mais tarde.' },
      { status: 503 }
    );
  }

  let evaluations: TurnEvaluation[] = [];
  let candidateName = '';
  let jobTitle = '';
  let sessionId = 'unknown';
  let config: InterviewConfig | null = null;

  try {
    const body: FeedbackRequest = await req.json();
    evaluations  = body.evaluations  ?? [];
    candidateName = body.candidateName ?? '';
    jobTitle      = body.jobTitle      ?? '';
    sessionId     = body.sessionId     ?? 'unknown';
    config        = body.config        ?? null;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  if (!evaluations || evaluations.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma avaliação encontrada.' },
      { status: 400 }
    );
  }

  const avgNota = evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
  const notaGeral = Math.round(avgNota * 10);

  try {
    const langInstruction = config?.idioma === 'en'
      ? 'Generate the feedback in English. For fields ending in _pt, translate to Brazilian Portuguese.'
      : 'Gere o feedback em português brasileiro.';

    const systemPrompt = `Você é um coach de carreira sênior analisando o desempenho de ${candidateName} em uma entrevista para a vaga de ${jobTitle}. ${langInstruction} Seja específico, honesto e construtivo.`;

    const evaluationsList = evaluations
      .map(
        (e, i) => `
--- Pergunta ${i + 1} ---
Pergunta: ${e.pergunta}
Resposta do candidato: ${e.resposta}
Nota: ${e.nota}/10
O que estava bom: ${e.positivo}
O que melhorar: ${e.melhoria}
Resposta ideal: ${e.resposta_ideal}`
      )
      .join('\n');

    const feedbackScriptInstruction = config?.idioma === 'en'
      ? `"feedback_script": {
      "ponto_forte":           "One genuine strength with a concrete example from the interview. Max 2 sentences. In English.",
      "melhoria_principal":    "The main improvement area with a concrete example. Max 2 sentences. In English.",
      "recomendacao":          "One practical recommendation for the next interview. Max 2 sentences. In English.",
      "ponto_forte_pt":        "Mesma informação do ponto_forte traduzida para português brasileiro. Máximo 2 frases.",
      "melhoria_principal_pt": "Mesma informação da melhoria_principal traduzida para português brasileiro. Máximo 2 frases.",
      "recomendacao_pt":       "Mesma informação da recomendacao traduzida para português brasileiro. Máximo 2 frases."
    }`
      : `"feedback_script": {
      "ponto_forte":        "Um ponto forte genuíno e específico com exemplo concreto da entrevista. Máximo 2 frases.",
      "melhoria_principal": "A principal área de melhoria com exemplo do que poderia ter sido melhor. Máximo 2 frases.",
      "recomendacao":       "Uma recomendação prática e acionável para a próxima entrevista. Máximo 2 frases."
    }`;

    const userMessage = `Analise as seguintes avaliações da entrevista e retorne um JSON com exatamente esta estrutura:
{
  ${feedbackScriptInstruction},
  "scores": { "geral": ${notaGeral}, "clareza": 0-10, "relevancia": 0-10, "profundidade": 0-10 },
  "competencias": { "comunicacao": 0-10, "resolucao_problemas": 0-10, "conhecimento_tecnico": 0-10, "lideranca": 0-10, "adaptabilidade": 0-10 }
}

Os campos clareza, relevancia, profundidade e todas as competências devem ser números inteiros de 0 a 10, baseados nas avaliações abaixo.

AVALIAÇÕES:
${evaluationsList}`;

    const result = await callAIJSONWithUsage<FeedbackResponse>(
      'feedback',
      systemPrompt,
      userMessage,
      2000,
      sessionId
    );

    // Medir custo do tráfego gratuito no disjuntor diário
    if (!authUserId) {
      await addDailyCost(
        estimateAICost(result.inputTokens, result.outputTokens, result.model)
      );
    }

    result.data.scores.geral = notaGeral;

    return NextResponse.json(result.data);
  } catch {
    const notaMedia = evaluations.reduce((s, e) => s + e.nota, 0) / evaluations.length;
    const geral = Math.round(notaMedia * 10);
    const isEn = config?.idioma === 'en';
    return NextResponse.json({
      feedback_script: {
        ponto_forte:              isEn ? 'You showed good engagement throughout the interview.'                  : 'Você demonstrou boa disposição ao longo da entrevista.',
        melhoria_principal:       isEn ? 'Work on structuring your answers with concrete examples.'             : 'Procure estruturar melhor suas respostas com exemplos concretos.',
        recomendacao:             isEn ? 'Practice the STAR method to organize your responses.'                 : 'Pratique o método STAR para organizar suas respostas nas próximas entrevistas.',
        ...(isEn ? {
          ponto_forte_pt:         'Você demonstrou boa disposição ao longo da entrevista.',
          melhoria_principal_pt:  'Procure estruturar melhor suas respostas com exemplos concretos.',
          recomendacao_pt:        'Pratique o método STAR para organizar suas respostas nas próximas entrevistas.',
        } : {}),
      },
      scores: {
        geral,
        clareza: Math.round(notaMedia),
        relevancia: Math.round(notaMedia),
        profundidade: Math.round(notaMedia),
      },
      competencias: {
        comunicacao: Math.round(notaMedia),
        resolucao_problemas: Math.round(notaMedia),
        conhecimento_tecnico: Math.round(notaMedia),
        lideranca: Math.round(notaMedia),
        adaptabilidade: Math.round(notaMedia),
      },
      warning: 'Feedback gerado com dados parciais devido a erro no servidor.',
    });
  }
}
