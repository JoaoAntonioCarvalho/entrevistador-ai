// Dados de preços/planos — client-safe (sem env var de servidor nem
// MercadoPagoConfig). mp-config.ts reexporta tudo daqui e acrescenta o que só
// pode rodar no servidor (access token, mpConfig) — client components devem
// importar DAQUI, nunca de mp-config.ts (instanciar MercadoPagoConfig no
// bundle do browser quebra, ver comentário em conta/page.tsx).

export const PRECOS = {
  'finalizar-atual': 5.90,
  'credito-7':       8.90,
  'credito-14':      12.90,
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

// A API de assinaturas (PreApproval) limita `reason` a 40 caracteres —
// o Checkout Pro avulso (DESCRICOES acima) não tem esse limite.
export const DESCRICOES_CURTAS = {
  'mensal-starter': 'Entrevistador.IA Starter',
  'mensal-pro':     'Entrevistador.IA Pro',
} as const;

export const PERGUNTAS_POR_PLANO = {
  'finalizar-atual': 7,
  'credito-7':       7,
  'credito-14':      14,
  'mensal-starter':  7,
  'mensal-pro':      14,
} as const;

export type PlanoKey = keyof typeof PRECOS;

// Planos que são assinatura recorrente (PreApproval), não compra avulsa.
export function isAssinatura(plano: string): boolean {
  return plano === 'mensal-starter' || plano === 'mensal-pro';
}

// Pix (Checkout Transparente/Orders API) tem 10% de desconto — mensal é
// assinatura e não aceita Pix (ver mp-criar-pix/route.ts), então o desconto
// só se aplica aos avulsos.
export const DESCONTO_PIX = 0.10;

export function precoComDesconto(plano: PlanoKey, metodo: 'cartao' | 'pix'): number {
  const base = PRECOS[plano];
  if (metodo !== 'pix') return base;
  return Math.round(base * (1 - DESCONTO_PIX) * 100) / 100;
}

// Entrevistas por mês liberadas por qualquer plano mensal — usado só pra
// calcular o preço por-entrevista e comparar com o avulso equivalente.
const ENTREVISTAS_POR_MES = 6;

const AVULSO_EQUIVALENTE = {
  'mensal-starter': 'credito-7',
  'mensal-pro':      'credito-14',
} as const;

// % de economia do mensal vs comprar a mesma quantidade de perguntas avulso,
// plano por plano — Starter e Pro têm preço por-entrevista diferente entre
// si, então NUNCA usar um percentual único pros dois (ver PaymentGateModal.tsx
// e planos/page.tsx).
export function descontoMensal(plano: keyof typeof AVULSO_EQUIVALENTE): number {
  const precoPorEntrevista = PRECOS[plano] / ENTREVISTAS_POR_MES;
  const precoAvulso = PRECOS[AVULSO_EQUIVALENTE[plano]];
  return Math.round((1 - precoPorEntrevista / precoAvulso) * 100);
}

// Usado só em textos "economize até X%" que precisam de um único número —
// o maior dos dois descontos reais (Starter/Pro), nunca um valor fixo.
export function maiorDescontoMensal(): number {
  return Math.max(descontoMensal('mensal-starter'), descontoMensal('mensal-pro'));
}
