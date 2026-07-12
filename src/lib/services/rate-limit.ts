import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const configured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
);

const redis = configured
  ? new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

type Duration = `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`;

function makeLimit(requests: number, window: Duration, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window), prefix });
}

// Rotas caras (turno de entrevista, TTS): 50 chamadas / 10 min por IP
// (~30 por sessão completa de 7 perguntas + TTS + retentativas)
export const aiRateLimit = makeLimit(50, '10 m', 'ratelimit:ai');

// Parsing (currículo/vaga/geração): 10 chamadas / 10 min por IP
export const parseRateLimit = makeLimit(10, '10 m', 'ratelimit:parse');

// Consultas leves de conta/dados (sem custo de IA): 60 / 10 min por IP
export const lightQueryRateLimit = makeLimit(60, '10 m', 'ratelimit:light-query');

// Sessões completas por dia (anti-abuso): 5 entrevistas / 24h por IP
export const sessionRateLimit = makeLimit(5, '24 h', 'ratelimit:session');

// Webhook MP: 100 / min (proteção contra flood)
export const webhookRateLimit = makeLimit(100, '1 m', 'ratelimit:webhook');

// Notificações internas (Telegram): bucket próprio para não competir com o
// parseRateLimit das rotas essenciais de setup. Anti-spam do relay público.
export const notifyRateLimit = makeLimit(20, '10 m', 'ratelimit:notify');

// Perguntas gratuitas: 9 por 24h por IP (anônimos não podem burlar limpando cache)
export const freeQuestionsLimit = makeLimit(9, '24 h', 'ratelimit:free-questions');

// Sessões gratuitas: 1 por 24h por IP
export const freeSessionLimit = makeLimit(1, '24 h', 'ratelimit:free-session');

// Feedback final: 1 chamada por sessão na prática. 12/24h por IP cobre as 5
// sessões diárias permitidas + retentativas, sem deixar a rota (que gera
// custo de IA e não exige auth) aberta para abuso em massa.
export const feedbackRateLimit = makeLimit(12, '24 h', 'ratelimit:feedback');

export async function checkRateLimit(limiter: Ratelimit | null, ip: string): Promise<boolean> {
  if (!limiter) return true;
  const { success } = await limiter.limit(ip);
  return success;
}

export function getClientIp(req: Request): string {
  // Na Vercel, `x-real-ip` é preenchido pela plataforma com o IP real de quem
  // conectou e NÃO é forjável pelo cliente. Já o valor MAIS À ESQUERDA de
  // `x-forwarded-for` é enviado pelo próprio cliente (a Vercel apenas anexa os
  // hops seguintes), então usá-lo permitiria burlar o rate limit rotacionando o
  // header. Preferimos `x-real-ip`; no fallback usamos o ÚLTIMO valor de
  // `x-forwarded-for` (hop mais próximo e confiável), nunca o primeiro.
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return 'unknown';
}
