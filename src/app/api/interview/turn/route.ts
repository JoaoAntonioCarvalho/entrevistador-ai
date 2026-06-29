import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { callAIJSONWithUsage } from '@/lib/services/claude';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';
import {
  Candidate, Job, InterviewConfig,
  ConversationTurn, InterviewTurnResponse
} from '@/lib/types';

export const dynamic     = 'force-dynamic';
export const maxDuration = 60; // segundos — cobre última pergunta com avaliação completa

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
  authUserId?: string | null;
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
DIRETRIZES ABSOLUTAS PARA PERGUNTAS:

1. NUNCA faça perguntas genéricas de acompanhamento como "aprofunde mais",
   "me conte mais sobre isso", "pode elaborar?" ou "interessante, continue".
   CADA pergunta deve ser completamente nova, específica e desafiadora.

2. CADA pergunta deve ter entre 2 e 4 frases. Nunca uma frase só. A pergunta deve:
   - Estabelecer um contexto ou cenário específico
   - Fazer a pergunta principal
   - Adicionar uma restrição, tensão ou desafio
   - Terminar com "Seja específico." quando a pergunta pedir exemplos ou situações reais.

3. TIPOS DE PERGUNTAS que devem aparecer (variar ao longo da entrevista):

   COMPORTAMENTAL (método STAR forçado):
   "Descreva uma situação específica em que [cenário concreto e desafiador].
   Qual foi exatamente sua contribuição — não da equipe, a sua — e qual foi
   o resultado mensurável? Seja específico."

   SITUACIONAL (cenário hipotético complexo):
   "Imagine que você assume [cargo] e nas primeiras duas semanas descobre que
   [problema grave e realista]. Você tem prazo de [tempo curto] e [recurso
   limitado]. Como exatamente você priorizaria e o que faria primeiro?"

   TÉCNICA/COMPETÊNCIA (profundidade real):
   "Em [área técnica relevante para a vaga], qual é a decisão mais difícil que
   você já teve que tomar entre [opção A] e [opção B]? O que você considerou,
   o que escolheu e o que teria feito diferente hoje?"

   PRESSÃO/CONFLITO (desconforto intencional):
   "Conte uma situação em que você discordou fortemente de uma decisão do seu
   gestor ou líder sobre [tema relevante]. Como você comunicou sua discordância,
   o que aconteceu e o que você aprendeu sobre como influenciar sem autoridade
   formal? Seja específico."

   AUTOCONHECIMENTO (vulnerabilidade produtiva):
   "Qual é a sua maior lacuna técnica ou comportamental para este cargo
   específico? Não me diga 'sou perfeccionista'. Me diga algo real, o que você
   está fazendo para desenvolver e por que ainda não está onde quer estar.
   Seja honesto e específico."

   VISÃO ESTRATÉGICA (para vagas sênior/liderança):
   "Olhando para [área/mercado relevante] nos próximos 2-3 anos, qual mudança
   você acha que a maioria das empresas está subestimando e por quê? Como isso
   afetaria a forma como você tomaria decisões neste cargo?"

   RESOLUÇÃO DE PROBLEMAS (raciocínio ao vivo):
   "Você recebe a missão de [objetivo específico e ambicioso] com [restrições
   reais]. Pense em voz alta: por onde começa, que informações busca primeiro
   e como mede sucesso?"

4. PERSONALIZAR para a vaga e currículo:
   - Referenciar a empresa da vaga pelo nome
   - Usar tecnologias específicas do currículo
   - Citar cargos anteriores reais do candidato
   - Adaptar o nível de complexidade ao nível da vaga (${config.nivel})

5. PROGRESSÃO obrigatória ao longo da entrevista:
   - Perguntas 1-2: rapport e contexto (ainda desafiadoras, mas mais abertas)
   - Perguntas 3-5: profundidade máxima, cenários complexos, pressão crescente
   - Perguntas 6-7: síntese, visão e fit cultural
   - Pergunta final: sempre terminar com o que o candidato quer saber ou
     o que acrescentaria sobre si mesmo que não foi perguntado

6. REAÇÕES do entrevistador entre perguntas — variar entre:
   - Retomar algo específico que o candidato disse
     ("você mencionou X — isso é relevante porque...")
   - Desafiar levemente ("entendo, mas como você responderia a quem argumenta que...")
   - Validar brevemente e aprofundar ("faz sentido. Agora me fala de uma situação
     em que isso não funcionou.")
   NUNCA repetir a resposta do candidato de volta.
   NUNCA dizer "excelente resposta" ou "muito bom".

SOBRE O CAMPO "fala":
- Máximo 2-3 sentenças por turno.
- Sem asteriscos, sem markdown, sem parênteses explicativos.
- Escreva exatamente como a pessoa falaria em voz alta — discurso oral natural, não texto escrito.
- Use vírgulas onde haveria uma pausa de respiração. Frases muito longas sem pontuação
  soam robotizadas no áudio.
- Evite palavras difíceis de pronunciar ou termos técnicos em sequência —
  o texto será convertido em áudio.
- Prefira construções conversacionais a formais. Conectivos como "então", "portanto",
  "no entanto" devem ser precedidos de vírgula quando iniciam cláusula nova.

FASE ATUAL DA ENTREVISTA:
${getInterviewPhase(perguntasRespondidas, totalPerguntas)}

CRÍTICO: Retorne SOMENTE o objeto JSON puro, sem nenhum texto antes ou depois, sem markdown, sem backticks (\`\`\`), sem comentários. Apenas o JSON começando com { e terminando com }.

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
  // Parse antecipado — necessário para bypass do rate limit para usuários pagantes
  let body: TurnRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    // Usuários pagantes não são bloqueados pelo rate limit
    const sessionIdRL  = body.sessionId;
    const authUserIdRL = body.authUserId;
    let isPaid = false;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (sessionIdRL && sessionIdRL !== 'unknown') {
      const { data: sess } = await supabaseAdmin
        .from('sessions')
        .select('payment_status')
        .eq('id', sessionIdRL)
        .single();
      if (sess?.payment_status === 'paid') isPaid = true;
    }

    if (!isPaid && authUserIdRL) {
      const { data: credit } = await supabaseAdmin
        .from('credits')
        .select('id')
        .eq('auth_user_id', authUserIdRL)
        .eq('usado', false)
        .eq('mp_status', 'approved')
        .limit(1)
        .single();
      if (credit) isPaid = true;
    }

    if (!isPaid) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      );
    }
  }

  const candidate: TurnRequest['candidate'] | null = body.candidate ?? null;
  const job: TurnRequest['job'] | null             = body.job ?? null;
  const config: TurnRequest['config'] | null       = body.config ?? null;
  const conversation: TurnRequest['conversation']  = body.conversation ?? [];
  const candidateResponse = body.candidateResponse ?? '';
  const isFirstTurn       = body.isFirstTurn ?? false;
  const isLastTurn        = body.isLastTurn  ?? false;
  const sessionId         = body.sessionId   ?? 'unknown';
  const perguntasRespondidas = body.perguntasRespondidas ?? 0;
  const totalPerguntas    = body.totalPerguntas ?? 7;
  const authUserId: string | null = body.authUserId ?? null;

  if (!candidate || !job || !config) {
    return NextResponse.json({ error: 'Dados da sessão incompletos.' }, { status: 400 });
  }

  if (typeof candidateResponse !== 'string' || candidateResponse.length > 5000) {
    return NextResponse.json({ error: 'Resposta do candidato inválida.' }, { status: 400 });
  }

  if (
    !Number.isFinite(perguntasRespondidas) || perguntasRespondidas < 0 ||
    !Number.isFinite(totalPerguntas) || totalPerguntas < 1 || totalPerguntas > 20
  ) {
    return NextResponse.json({ error: 'Contagem de perguntas inválida.' }, { status: 400 });
  }

  // Rejeitar sessão descartada
  if (sessionId && sessionId !== 'unknown') {
    const supabaseCheck = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: sessCheck } = await supabaseCheck
      .from('sessions')
      .select('status')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessCheck?.status === 'discarded') {
      return NextResponse.json(
        { error: 'session_discarded', message: 'Esta sessão foi descartada.' },
        { status: 403 }
      );
    }
  }

  // Gate de pagamento: verificar antes da IA mas só retornar depois
  // (para incluir a avaliação da última resposta no corpo do 402)
  let requiresPayment = false;
  if (!isFirstTurn && perguntasRespondidas >= 3) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let liberado = false;

    if (sessionId && sessionId !== 'unknown') {
      const { data: sess } = await supabaseAdmin
        .from('sessions')
        .select('payment_status')
        .eq('id', sessionId)
        .single();
      if (sess?.payment_status === 'paid') liberado = true;
    }

    if (!liberado && authUserId) {
      const { data: credit } = await supabaseAdmin
        .from('credits')
        .select('id, perguntas, expires_at')
        .eq('auth_user_id', authUserId)
        .eq('usado', false)
        .eq('mp_status', 'approved')
        .gte('perguntas', totalPerguntas)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (credit) liberado = true;
    }

    if (!liberado) requiresPayment = true;
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

    // Campos ausentes: construir fallback em vez de lançar erro — evita travar entrevista
    if (!result.data.fala) {
      const primeiroNome = candidate?.nome?.split(' ')[0] ?? 'candidato';
      result.data.fala = isLastTurn
        ? (config.idioma === 'en'
            ? `Thank you for your time, ${primeiroNome}. Your feedback report will be ready shortly.`
            : `Obrigado pela sua participação, ${primeiroNome}. Seu feedback estará disponível em instantes.`)
        : (config.idioma === 'en'
            ? 'Thank you for your response. Let me follow up with another question.'
            : 'Obrigado pela resposta. Vou seguir com a próxima pergunta.');
    }
    if (!result.data.avaliacao) {
      result.data.avaliacao = { nota: 5, positivo: 'N/A', melhoria: 'N/A', resposta_ideal: 'N/A' };
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

    // Gate de pagamento — retornar 402 COM avaliação para não perder a nota da última pergunta
    if (requiresPayment) {
      return NextResponse.json(
        {
          error:     'payment_required',
          message:   'Pagamento necessário para continuar.',
          avaliacao: result.data.avaliacao,
        },
        { status: 402 },
      );
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
    Sentry.captureException(error, {
      tags: { route: 'interview/turn' },
      extra: {
        sessionId,
        perguntasRespondidas,
      },
    });
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
