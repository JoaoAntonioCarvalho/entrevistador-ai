import { Redis } from '@upstash/redis';

// ── Teto global de gasto diário (disjuntor anti-abuso) ───────────────────────
//
// Limita o prejuízo máximo por dia com o tráfego GRATUITO (anônimo), não
// importa quantos IPs um atacante use — os rate limits por IP não protegem
// contra rotação de proxy. Usuários autenticados nunca são contados nem
// bloqueados: pagar exige conta, então todo pagante está logado.
//
// O contador é uma ESTIMATIVA de custo (preços espelhados de MODEL_PRICES do
// store.ts), não contabilidade exata — precisão de centavos é irrelevante
// para um disjuntor.

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

const CAP_USD = (() => {
  const v = Number(process.env.DAILY_COST_CAP_USD ?? '10');
  return Number.isFinite(v) && v > 0 ? v : 10;
})();

// Preços por token (USD) — manter em sincronia com MODEL_PRICES em store.ts
const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  'google/gemini-3.1-flash-lite': { in: 0.25 / 1e6, out: 1.50 / 1e6 },
  'google/gemini-2.5-flash':      { in: 0.30 / 1e6, out: 2.50 / 1e6 },
  'anthropic/claude-haiku-4.5':   { in: 1.00 / 1e6, out: 5.00 / 1e6 },
  'claude-haiku-4-5-20251001':    { in: 1.00 / 1e6, out: 5.00 / 1e6 },
  'claude-sonnet-4-5':            { in: 3.00 / 1e6, out: 15.0 / 1e6 },
};

// Modelo desconhecido: assumir preço de Haiku (conservador) em vez de 0,
// para o disjuntor nunca subcontar por causa de um modelo novo.
const FALLBACK_PRICE = { in: 1.00 / 1e6, out: 5.00 / 1e6 };

export function estimateAICost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const p = MODEL_PRICES[model] ?? FALLBACK_PRICE;
  return inputTokens * p.in + outputTokens * p.out;
}

// OpenAI TTS-1-HD: $0.015 por 1.000 caracteres
export function estimateTTSCost(chars: number): number {
  return (chars / 1000) * 0.015;
}

// Custo médio estimado de uma chamada de parsing/geração de setup
// (modelos flash — usado onde a rota não expõe os tokens reais)
export const PARSE_CALL_COST_USD = 0.005;

function todayKey(): string {
  return `cost:daily:${new Date().toISOString().slice(0, 10)}`;
}

/**
 * true quando o gasto gratuito estimado de hoje já atingiu o teto.
 * Falha do Redis nunca bloqueia o produto (retorna false).
 */
export async function isDailyCapExceeded(): Promise<boolean> {
  if (!redis) return false;
  try {
    const total = Number(await redis.get(todayKey()) ?? 0);
    return total >= CAP_USD;
  } catch {
    return false;
  }
}

/**
 * Acumula custo estimado no contador do dia e alerta no Telegram ao
 * cruzar 80% e 100% do teto. Chamar apenas para tráfego não autenticado.
 */
export async function addDailyCost(usd: number): Promise<void> {
  if (!redis || !(usd > 0)) return;
  try {
    const key = todayKey();
    const total = await redis.incrbyfloat(key, usd);
    await redis.expire(key, 60 * 60 * 48);

    for (const pct of [0.8, 1.0]) {
      if (total >= CAP_USD * pct) {
        const flag = await redis.set(`${key}:alert:${pct}`, '1', { nx: true, ex: 60 * 60 * 48 });
        if (flag === 'OK') {
          const emoji = pct >= 1 ? '🚨' : '⚠️';
          await alertTelegram(
            `${emoji} Teto de gasto diário: US$ ${total.toFixed(2)} de US$ ${CAP_USD.toFixed(2)} ` +
            `(${Math.round(pct * 100)}%)${pct >= 1 ? ' — tráfego gratuito BLOQUEADO até amanhã (UTC).' : '.'}`
          );
        }
      }
    }
  } catch { /* medição nunca derruba a rota */ }
}

async function alertTelegram(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text }),
    });
  } catch { /* silencioso */ }
}
