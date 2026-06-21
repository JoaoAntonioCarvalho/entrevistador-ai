import { NextRequest, NextResponse } from 'next/server';
import { callAIJSONWithUsage } from '@/lib/services/claude';
import {
  Candidate, Job, InterviewConfig,
  ConversationTurn, InterviewTurnResponse
} from '@/lib/types';

interface TurnRequest {
  candidate: Candidate;
  job: Job;
  config: InterviewConfig;
  conversation: ConversationTurn[];
  candidateResponse: string;
  isFirstTurn: boolean;
  isLastTurn: boolean;
  sessionId?: string;
  perguntasRespondidas: number;
  totalPerguntas: number;
}

interface Blocos {
  abertura:   { inicio: number; fim: number };
  curriculo:  { inicio: number; fim: number };
  vaga:       { inicio: number; fim: number };
  tecnico:    { inicio: number; fim: number };
  fechamento: { inicio: number; fim: number };
}

function calcularBlocos(total: number): Blocos {
  if (total <= 5) {
    return {
      abertura:   { inicio: 0, fim: 0 },
      curriculo:  { inicio: 1, fim: 1 },
      vaga:       { inicio: 2, fim: 2 },
      tecnico:    { inicio: 3, fim: 3 },
      fechamento: { inicio: 4, fim: 4 },
    };
  }

  if (total <= 10) {
    return {
      abertura:   { inicio: 0, fim: 1 },
      curriculo:  { inicio: 2, fim: 3 },
      vaga:       { inicio: 4, fim: 5 },
      tecnico:    { inicio: 6, fim: total - 2 },
      fechamento: { inicio: total - 1, fim: total - 1 },
    };
  }

  if (total <= 15) {
    return {
      abertura:   { inicio: 0, fim: 2 },
      curriculo:  { inicio: 3, fim: 5 },
      vaga:       { inicio: 6, fim: 8 },
      tecnico:    { inicio: 9, fim: total - 2 },
      fechamento: { inicio: total - 1, fim: total - 1 },
    };
  }

  return {
    abertura:   { inicio: 0,  fim: 3  },
    curriculo:  { inicio: 4,  fim: 7  },
    vaga:       { inicio: 8,  fim: 11 },
    tecnico:    { inicio: 12, fim: 17 },
    fechamento: { inicio: 18, fim: 19 },
  };
}

function getBlocoAtual(respondidas: number, blocos: Blocos): string {
  const { abertura, curriculo, vaga, tecnico } = blocos;

  if (respondidas <= abertura.fim) {
    return `BLOCO: ABERTURA (pergunta ${respondidas + 1})
FOCO OBRIGATÓRIO: Apresentação e trajetória profissional.
Faça perguntas abertas para conhecer o candidato.
Exemplos: trajetória, motivações, por que está buscando nova oportunidade.
NÃO faça perguntas técnicas ainda.`;
  }

  if (respondidas <= curriculo.fim) {
    return `BLOCO: CURRÍCULO (pergunta ${respondidas + 1})
FOCO OBRIGATÓRIO: Explorar experiências específicas do currículo.
Você DEVE mencionar uma empresa, cargo ou período real do currículo do candidato.
Explore: projetos relevantes, desafios enfrentados, resultados alcançados.
Nunca faça pergunta genérica — sempre referencie algo concreto do histórico dele.`;
  }

  if (respondidas <= vaga.fim) {
    return `BLOCO: FIT COM A VAGA (pergunta ${respondidas + 1})
FOCO OBRIGATÓRIO: Avaliar o encaixe do candidato com a vaga específica.
Você DEVE cruzar a experiência do candidato com os requisitos da vaga.
Explore: por que ele quer esta vaga, como sua experiência se aplica,
o que sabe sobre a empresa, como lidaria com as responsabilidades descritas.`;
  }

  if (respondidas <= tecnico.fim) {
    return `BLOCO: TÉCNICO / COMPORTAMENTAL (pergunta ${respondidas + 1})
FOCO OBRIGATÓRIO: Aprofundar competências técnicas e comportamentais.
Use a stack da vaga cruzada com as habilidades do candidato.
Para comportamental: use metodologia STAR, peça exemplos reais.
Para técnico: faça perguntas conceituais e situacionais da stack da vaga.
Varie entre técnico e comportamental — não repita o mesmo estilo duas vezes seguidas.`;
  }

  return `BLOCO: FECHAMENTO (pergunta ${respondidas + 1} — ÚLTIMA PERGUNTA)
FOCO OBRIGATÓRIO: Encerrar com uma pergunta de fechamento relevante.
Exemplos válidos: "Tem alguma pergunta sobre a vaga ou o processo?",
"Tem algo que gostaria de destacar que não abordamos ainda?",
"Como você se vê contribuindo nos primeiros 3 meses nesta posição?"
NÃO faça pergunta técnica. Esta é a última pergunta antes do encerramento.`;
}

function getInterviewPhase(respondidas: number, total: number): string {
  return getBlocoAtual(respondidas, calcularBlocos(total));
}

function buildSystemPrompt(
  candidate: Candidate,
  job: Job,
  config: InterviewConfig,
  perguntasRespondidas: number,
  totalPerguntas: number,
  isLastTurn: boolean
): string {
  const langLine = config.idioma === 'pt'
    ? 'Conduza toda a entrevista em português do Brasil.'
    : 'Conduct the entire interview in English.';

  const avatarNomes: Record<string, string> = {
    sarah:  'Sarah',
    carlos: 'Carlos',
    alex:   'Alex',
  };
  const nomeEntrevistador = avatarNomes[config.avatar_id] ?? 'Sarah';

  const typeGuide = {
    comportamental: 'Use metodologia STAR (Situação, Tarefa, Ação, Resultado). Pergunte sobre experiências passadas e situações reais.',
    tecnica: 'Faça perguntas técnicas conceituais e situacionais com base na stack da vaga cruzada com o histórico do candidato. Aprofunde quando necessário.',
    mista: 'Alterne entre perguntas comportamentais (STAR) e técnicas conforme o fluxo natural da conversa.',
  }[config.tipo];

  const temCurriculo =
    (candidate.experiencias?.length ?? 0) > 0 ||
    (candidate.habilidades?.length ?? 0) > 0;

  const perfilBloco = temCurriculo
    ? `PERFIL DO CANDIDATO:
Nome: ${candidate.nome}
Cargo atual: ${candidate.cargo_atual}
Experiências relevantes:
${candidate.experiencias.slice(0, 3).map(e => `  - ${e.cargo} na ${e.empresa} (${e.periodo})`).join('\n')}
Habilidades: ${candidate.habilidades.slice(0, 10).join(', ')}
Formação: ${candidate.formacao.map(f => `${f.curso} (${f.instituicao})`).join('; ')}`
    : `PERFIL DO CANDIDATO:
Nome: ${candidate.nome}
Cargo informado: ${candidate.cargo_atual || 'Não informado'}
Nota: O candidato não forneceu currículo detalhado.
Faça perguntas mais abertas para descobrir o perfil dele
durante a própria entrevista. Explore experiências e
habilidades através das respostas.`;

  return `Você é um entrevistador profissional conduzindo uma entrevista real para a vaga de ${job.titulo} na empresa ${job.empresa}.

${langLine}

SEU NOME: ${nomeEntrevistador}
Use seu nome se o candidato perguntar quem você é.
NUNCA use colchetes ou placeholders na sua fala. Nunca escreva [Seu Nome], [Nome], [Entrevistador], [Nome da Empresa] ou qualquer texto entre colchetes. Sempre use os nomes reais.

${perfilBloco}

SOBRE A VAGA:
Cargo: ${job.titulo} | Empresa: ${job.empresa}
Requisitos obrigatórios: ${job.requisitos_obrigatorios.slice(0, 5).join(', ')}
Stack técnica: ${job.stack_tecnica.join(', ')}
Responsabilidades principais: ${job.responsabilidades.slice(0, 3).join('; ')}

NÍVEL: ${config.nivel.toUpperCase()}
TIPO: ${typeGuide}

REGRAS DE COMPORTAMENTO:
1. Seja profissional, levemente desafiador e humano — nunca robótico.
2. Faça EXATAMENTE UMA pergunta por turno. Nunca duas.
3. Se a resposta for vaga ou muito curta, faça um follow-up na mesma resposta antes de mudar de assunto.
4. Reaja naturalmente à resposta antes de fazer a próxima pergunta.
5. Varie o ritmo: às vezes reaja e depois pergunte; às vezes vá direto.
6. Ajuste profundidade ao nível ${config.nivel}.
7. Fale como um humano em conversa real — nunca como um roteiro corporativo.
   Evite: "Que interessante!", "Ótimo!", "Excelente resposta!", "Com certeza!",
   "Absolutamente!", "Perfeito!". Essas expressões soam artificiais.
   Prefira reações neutras e naturais: "Entendi.", "Faz sentido.", "Ok.",
   "E nesse caso...", "Me conta mais sobre...", "Isso me leva a outra questão..."
8. Varie o comprimento das falas:
   - Às vezes uma frase curta de transição + pergunta direta.
   - Às vezes uma observação sobre o que foi dito antes de perguntar.
   - Nunca duas falas longas seguidas.
9. Use contrações e linguagem coloquial profissional quando em português:
   "tá", "pra", "né", "isso", "bacana", "legal" são aceitáveis com moderação.
   Em inglês: "that's", "you'd", "let's", "how'd", "what's" — nunca formal demais.
10. Se o candidato der uma resposta muito boa, reconheça brevemente e avance.
    Se der uma resposta fraca ou vaga, peça para desenvolver sem ser condescendente.
    Exemplo bom: "Consegue me dar um exemplo concreto disso?"
    Exemplo ruim: "Interessante perspectiva! Poderia elaborar mais?"
11. QUALIDADE DAS PERGUNTAS — obrigatório:
    - Sempre cruze o currículo do candidato com os requisitos da vaga.
      Exemplo: se o candidato tem 3 anos de React e a vaga pede React,
      pergunte sobre um desafio técnico específico que ele enfrentou com React.
    - Nunca faça perguntas genéricas como "Fale sobre seus pontos fortes".
      Substitua por: "Olhando sua experiência na [empresa X], qual foi o
      projeto mais desafiador tecnicamente e como você o resolveu?"
    - Para perguntas comportamentais: sempre mencione um contexto específico
      do currículo do candidato na pergunta.
    - Para perguntas técnicas: use termos da stack da vaga, não termos genéricos.
    - Nunca repita o mesmo tema em duas perguntas seguidas.
    - Nunca faça duas perguntas em sequência sobre o mesmo emprego anterior.
12. PROGRESSÃO OBRIGATÓRIA:
    Siga esta sequência ao longo da entrevista:
    1ª-2ª pergunta: trajetória e motivação (quem é o candidato)
    3ª-5ª pergunta: experiências relevantes para a vaga (o que já fez)
    6ª-8ª pergunta: perguntas técnicas ou desafios específicos (como pensa)
    9ª+ pergunta: diferenciais, cultura, fit com a empresa (por que ele)
    Última pergunta: encerramento (dúvidas, destaques finais)

SOBRE O CAMPO "fala":
- Máximo 2-3 sentenças por turno.
- Sem asteriscos, sem markdown, sem parênteses explicativos.
- Escreva exatamente como a pessoa falaria em voz alta.
- Não use vírgulas em excesso — prefira pontos. Frases curtas soam mais naturais na fala.
- Evite palavras difíceis de pronunciar ou termos técnicos em sequência —
  o texto será convertido em áudio.

FASE ATUAL DA ENTREVISTA:
${getInterviewPhase(perguntasRespondidas, totalPerguntas)}

FORMATO DE RETORNO — sempre JSON exato, sem markdown:
{
  "fala": "texto exato que o entrevistador vai dizer — apenas a fala, sem didascálias ou asteriscos",
  "avaliacao": {
    "nota": número inteiro de 0 a 10,
    "positivo": "o que estava bom na resposta",
    "melhoria": "o que poderia melhorar",
    "resposta_ideal": "como o candidato deveria ter respondido considerando seu currículo e a vaga"
  }
}

A "avaliacao" é INTERNA — o candidato nunca a verá. Seja honesto e específico.${isLastTurn ? `

════════════════════════════════════════
MODO ENCERRAMENTO ATIVO — REGRAS ABSOLUTAS
════════════════════════════════════════

Esta é a última fala da entrevista. O candidato já respondeu a última pergunta.

PROIBIDO — não faça nenhuma das seguintes ações:
❌ Terminar a fala com "?" — nenhum sinal de interrogação em nenhuma posição
❌ Fazer qualquer pergunta, direta ou indireta
❌ Usar frases como "Você tem alguma dúvida?", "Alguma pergunta?",
   "Gostaria de saber mais sobre...?", "O que você acha...?",
   "Tem algo que gostaria de acrescentar?"
❌ Perguntas embutidas: "Ficou alguma dúvida sobre o processo?" — PROIBIDO
❌ Perguntas retóricas: "Foi uma ótima conversa, não foi?" — PROIBIDO

OBRIGATÓRIO — siga esta estrutura em exatamente 3-4 frases declarativas:
1. Reaja à última resposta do candidato de forma específica e genuína.
   Se ele fez uma pergunta, responda brevemente. Se disse que não tem dúvidas, reconheça.
   Se destacou algo, comente. Use SEMPRE uma frase declarativa, nunca interrogativa.
2. Faça um comentário positivo e específico sobre algo que se destacou na entrevista.
3. Agradeça pelo nome: "${candidate.nome.split(' ')[0]}".
4. Informe que o feedback estará disponível em instantes. Ponto final.

EXEMPLOS CORRETOS:
${config.idioma === 'en'
  ? `✓ "Good point on scalability. This was a very rich conversation — you showed strong technical clarity and good product vision. Thank you for your time, ${candidate.nome.split(' ')[0]}. Your feedback report will be ready shortly."
✓ "Understood, glad everything was clear. You brought very concrete examples today, which makes the evaluation much more precise. Thank you, ${candidate.nome.split(' ')[0]}. The full report will be available shortly."`
  : `✓ "Boa observação sobre escalabilidade. Foi uma conversa bastante rica — você demonstrou clareza técnica e boa visão de produto. Obrigado pela participação, ${candidate.nome.split(' ')[0]}. O seu feedback estará disponível em instantes."
✓ "Entendido, fico feliz que tenha ficado tudo claro. Você trouxe exemplos muito concretos hoje, o que torna a avaliação mais precisa. Agradeço o seu tempo, ${candidate.nome.split(' ')[0]}. O relatório completo estará disponível em breve."`}

EXEMPLOS INCORRETOS:
❌ "Obrigado! Tem alguma dúvida sobre os próximos passos?"
❌ "Foi ótimo conversar com você. Alguma pergunta final?"
❌ "Você tem algo a acrescentar antes de encerrarmos?"

Tom: caloroso, profissional, conclusivo. Máximo 4 frases. Zero perguntas. Zero interrogações.` : ''}`;
}

export async function POST(req: NextRequest) {
  let candidate: TurnRequest['candidate'] | null = null;
  let job: TurnRequest['job'] | null = null;
  let config: TurnRequest['config'] | null = null;
  let conversation: TurnRequest['conversation'] = [];
  let candidateResponse = '';
  let isFirstTurn = false;
  let isLastTurn  = false;
  let sessionId = 'unknown';
  let perguntasRespondidas = 0;
  let totalPerguntas = 10;

  try {
    const body: TurnRequest = await req.json();
    candidate             = body.candidate;
    job                   = body.job;
    config                = body.config;
    conversation          = body.conversation ?? [];
    candidateResponse     = body.candidateResponse ?? '';
    isFirstTurn           = body.isFirstTurn ?? false;
    isLastTurn            = body.isLastTurn ?? false;
    sessionId             = body.sessionId ?? 'unknown';
    perguntasRespondidas  = body.perguntasRespondidas ?? 0;
    totalPerguntas        = body.totalPerguntas ?? 10;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  if (!candidate || !job || !config) {
    return NextResponse.json({ error: 'Dados da sessão incompletos.' }, { status: 400 });
  }

  try {
    const systemPrompt = buildSystemPrompt(
      candidate, job, config,
      perguntasRespondidas,
      totalPerguntas,
      isLastTurn
    );

    const historyText = conversation
      .map(t => `${t.role === 'interviewer' ? 'ENTREVISTADOR' : 'CANDIDATO'}: ${t.text}`)
      .join('\n\n');

    let userMessage: string;

    if (isFirstTurn) {
      userMessage = `Esta é a PRIMEIRA mensagem da entrevista.
Cumprimente o candidato pelo nome (${candidate.nome}), mencione brevemente a vaga (${job.titulo}), e faça a pergunta de abertura clássica: peça para ele falar sobre si mesmo e sua trajetória profissional.
Para o campo "avaliacao", use nota=10 e preencha positivo/melhoria/resposta_ideal com "N/A — abertura da entrevista".`;
    } else {
      userMessage = `HISTÓRICO DA CONVERSA:
${historyText}

ÚLTIMA RESPOSTA DO CANDIDATO:
"${candidateResponse}"

Com base na resposta acima e no histórico completo, gere a próxima fala do entrevistador e avalie a última resposta do candidato.`;
    }

    const result = await callAIJSONWithUsage<InterviewTurnResponse>(
      'interview',
      systemPrompt,
      userMessage,
      1200,
      sessionId
    );

    if (!result.data.fala || !result.data.avaliacao) {
      throw new Error('Formato de resposta inválido');
    }

    if (isLastTurn && result.data.fala.includes('?')) {
      const falaCorrigida = result.data.fala
        .split(/(?<=[.!])\s+/)
        .filter(frase => !frase.includes('?'))
        .join(' ')
        .trim();
      if (falaCorrigida.length > 20) {
        result.data.fala = falaCorrigida;
      } else {
        const primeiroNome = candidate?.nome?.split(' ')[0] ?? 'candidato';
        result.data.fala = config.idioma === 'en'
          ? `Thank you for your time today, ${primeiroNome}. It was a pleasure speaking with you. Your feedback report will be ready shortly.`
          : `Obrigado pela sua participação hoje, ${primeiroNome}. Foi um prazer conversar com você. Seu feedback estará disponível em instantes.`;
      }
    }

    return NextResponse.json({
      ...result.data,
      _usage: {
        inputTokens:  result.inputTokens,
        outputTokens: result.outputTokens,
        model:        result.model,
      },
    });
  } catch (error) {
    console.error('[interview/turn]', error);
    const fallbackFala = isFirstTurn
      ? (config?.idioma === 'en'
        ? `Hello ${candidate?.nome ?? 'candidate'}. Thank you for being here. Could you start by telling me a bit about yourself and your professional background?`
        : `Olá ${candidate?.nome ?? 'candidato'}. Obrigado por estar aqui. Pode começar me contando um pouco sobre você e sua trajetória profissional?`)
      : (config?.idioma === 'en'
        ? 'I understand. Could you tell me more about your experience?'
        : 'Entendi. Pode continuar me contando mais sobre sua experiência?');
    return NextResponse.json({
      fala: fallbackFala,
      avaliacao: { nota: 5, positivo: 'N/A', melhoria: 'N/A', resposta_ideal: 'N/A' },
    });
  }
}
