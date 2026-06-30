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

// Sessões completas por dia (anti-abuso): 5 entrevistas / 24h por IP
export const sessionRateLimit = makeLimit(5, '24 h', 'ratelimit:session');

// Webhook MP: 100 / min (proteção contra flood)
export const webhookRateLimit = makeLimit(100, '1 m', 'ratelimit:webhook');

// Perguntas gratuitas: 3 por 24h por IP (anônimos não podem burlar limpando cache)
export const freeQuestionsLimit = makeLimit(3, '24 h', 'ratelimit:free-questions');

// Sessões gratuitas: 1 por 24h por IP
export const freeSessionLimit = makeLimit(1, '24 h', 'ratelimit:free-session');

export async function checkRateLimit(limiter: Ratelimit | null, ip: string): Promise<boolean> {
  if (!limiter) return true;
  const { success } = await limiter.limit(ip);
  return success;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? 'unknown';
}
