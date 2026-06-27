import Anthropic from '@anthropic-ai/sdk';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AITask = 'parsing' | 'interview' | 'feedback';

type Provider = 'anthropic' | 'openrouter';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SELEÇÃO DE PROVIDER E MODELOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getProvider(): Provider {
  if (process.env.OPENROUTER_API_KEY?.trim()) return 'openrouter';
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'anthropic';
  throw new Error('Nenhum provider de IA configurado.');
}

/*
  Critério de seleção de modelos:

  OPENROUTER (foco em custo para testes):
  - parsing:   google/gemini-3.1-flash-lite
               ~$0.25/M input · $1.50/M output. Extração determinística de JSON.
  - interview: google/gemini-2.5-flash
               ~$0.30/M input · $2.50/M output. Conversas longas com histórico.
  - feedback:  anthropic/claude-haiku-4.5
               ~$1.00/M input · $5.00/M output. Melhor fluência em PT para TTS.

  ANTHROPIC DIRETA (foco em confiabilidade para produção):
  - parsing:   claude-haiku-4-5-20251001  — mais barato, suficiente para extração
  - interview: claude-haiku-4-5-20251001  — latência aceitável em turnos de voz
  - feedback:  claude-sonnet-4-5          — melhor qualidade para roteiro final
*/

const MODELS: Record<Provider, Record<AITask, string>> = {
  openrouter: {
    parsing:   'google/gemini-3.1-flash-lite',
    interview: 'google/gemini-2.5-flash',
    feedback:  'anthropic/claude-haiku-4.5',
  },
  anthropic: {
    parsing:   'claude-haiku-4-5-20251001',
    interview: 'claude-haiku-4-5-20251001',
    feedback:  'claude-sonnet-4-5',
  },
};

export function getModel(task: AITask): string {
  return MODELS[getProvider()][task];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLIENTES INTERNOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

async function callOpenRouterRaw(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Entrevistador.IA',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json() as OpenRouterResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter retornou resposta vazia.');

  return {
    text:         content,
    inputTokens:  data?.usage?.prompt_tokens     ?? 0,
    outputTokens: data?.usage?.completion_tokens ?? 0,
  };
}

async function callAnthropicRaw(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client  = getAnthropicClient();
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Tipo de resposta inesperado da Anthropic.');

  return {
    text:         content.text,
    inputTokens:  message.usage?.input_tokens  ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUNÇÕES PÚBLICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function callAIWithUsage(
  task: AITask,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000,
  retries = 2
): Promise<{ text: string; inputTokens: number; outputTokens: number; model: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const provider = getProvider();
      const model    = getModel(task);
      let result: { text: string; inputTokens: number; outputTokens: number };

      if (provider === 'openrouter') {
        result = await callOpenRouterRaw(model, systemPrompt, userMessage, maxTokens);
      } else {
        result = await callAnthropicRaw(model, systemPrompt, userMessage, maxTokens);
      }

      return { ...result, model };
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Erro desconhecido após retries');
}

export async function callAI(
  task: AITask,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000,
  sessionId = 'unknown',
  retries = 2
): Promise<string> {
  void sessionId;
  const result = await callAIWithUsage(task, systemPrompt, userMessage, maxTokens, retries);
  return result.text;
}

export async function callAIJSONWithUsage<T>(
  task: AITask,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000,
  sessionId = 'unknown'
): Promise<{ data: T; inputTokens: number; outputTokens: number; model: string }> {
  void sessionId;
  const result = await callAIWithUsage(
    task,
    systemPrompt + '\n\nIMPORTANTE: Retorne APENAS JSON válido. Sem texto antes ou depois. Sem markdown. Sem backticks. Sem explicações. Comece diretamente com { e termine com }.',
    userMessage,
    maxTokens
  );

  const rawText = result.text;
  const meta    = { inputTokens: result.inputTokens, outputTokens: result.outputTokens, model: result.model };

  let conteudo = rawText.trim();
  conteudo = conteudo
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // Estratégia 1: parse direto após limpeza
  try {
    return { data: JSON.parse(conteudo) as T, ...meta };
  } catch { /* fall through */ }

  // Estratégia 2: extrair o primeiro bloco JSON com regex
  try {
    const match = conteudo.match(/\{[\s\S]*\}/);
    if (match) return { data: JSON.parse(match[0]) as T, ...meta };
  } catch { /* fall through */ }

  // Estratégia 3: balancear chaves manualmente
  try {
    let depth = 0, start = -1;
    for (let i = 0; i < conteudo.length; i++) {
      if (conteudo[i] === '{') {
        if (start === -1) start = i;
        depth++;
      } else if (conteudo[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          return { data: JSON.parse(conteudo.slice(start, i + 1)) as T, ...meta };
        }
      }
    }
  } catch { /* fall through */ }

  // Estratégia 4: fallback seguro — não travar a entrevista por erro de parse
  console.error('[turn] parse falhou. Preview:', conteudo.slice(0, 200));
  const falaMatch = conteudo.match(/"fala"\s*:\s*"([^"]+)"/);
  const fala = falaMatch?.[1] ?? 'Obrigado pela sua resposta.';
  return {
    data: { fala, avaliacao: { nota: 7, positivo: '', melhoria: '', resposta_ideal: '' }, encerrar: false } as unknown as T,
    ...meta,
  };
}

export async function callAIJSON<T>(
  task: AITask,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000,
  sessionId = 'unknown'
): Promise<T> {
  const result = await callAIJSONWithUsage<T>(task, systemPrompt, userMessage, maxTokens, sessionId);
  return result.data;
}

// Aliases de compatibilidade — task padrão: interview, sessionId padrão: unknown
export const callClaude     = (s: string, u: string, t?: number) => callAI('interview', s, u, t);
export const callClaudeJSON = <T>(s: string, u: string, t?: number) => callAIJSON<T>('interview', s, u, t);
