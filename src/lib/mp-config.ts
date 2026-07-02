import { MercadoPagoConfig } from 'mercadopago';

const isProducao = process.env.MP_MODO === 'producao';


export const mpConfig = new MercadoPagoConfig({
  accessToken: isProducao
    ? process.env.MP_ACCESS_TOKEN_PROD!
    : process.env.MP_ACCESS_TOKEN_TEST!,
});

// Alias para diagnóstico (mp-diagnostico/route.ts importa `mp`)
export const mp = mpConfig;

// Access token cru resolvido (prod/test) — para chamadas diretas à API do MP
// que o SDK não cobre, como GET /authorized_payments/{id} no webhook.
export const MP_ACCESS_TOKEN = isProducao
  ? process.env.MP_ACCESS_TOKEN_PROD!
  : process.env.MP_ACCESS_TOKEN_TEST!;

// Planos que são assinatura recorrente (PreApproval), não compra avulsa.
export function isAssinatura(plano: string): boolean {
  return plano === 'mensal-starter' || plano === 'mensal-pro';
}

export const MP_PUBLIC_KEY = isProducao
  ? process.env.MP_PUBLIC_KEY_PROD!
  : process.env.MP_PUBLIC_KEY_TEST!;

export const PRECOS = {
  'finalizar-atual': 9.90,
  'credito-7':       12.90,
  'credito-14':      22.90,
  'mensal-starter':  39.90,
  'mensal-pro':      59.90,
} as const;

export const DESCRICOES = {
  'finalizar-atual': 'Entrevistador.IA — Finalizar entrevista (7 perguntas)',
  'credito-7':       'Entrevistador.IA — 1 entrevista de 7 perguntas',
  'credito-14':      'Entrevistador.IA — 1 entrevista de 14 perguntas',
  'mensal-starter':  'Entrevistador.IA — Plano Starter (6×7 perguntas/mês)',
  'mensal-pro':      'Entrevistador.IA — Plano Pro (6×14 perguntas/mês)',
} as const;

export const PERGUNTAS_POR_PLANO = {
  'finalizar-atual': 7,
  'credito-7':       7,
  'credito-14':      14,
  'mensal-starter':  7,
  'mensal-pro':      14,
} as const;

export type PlanoKey = keyof typeof PRECOS;
