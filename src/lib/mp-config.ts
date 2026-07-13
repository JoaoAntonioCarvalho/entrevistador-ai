import { MercadoPagoConfig } from 'mercadopago';

// Preços/descrições/descontos vivem em mp-precos.ts (client-safe) — este
// arquivo reexporta tudo e acrescenta só o que precisa de env var de
// servidor (access token). Client components devem importar de mp-precos.ts
// diretamente, nunca daqui (ver comentário no topo de mp-precos.ts).
export * from './mp-precos';

export const isProducao = process.env.MP_MODO === 'producao';


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

export const MP_PUBLIC_KEY = isProducao
  ? process.env.MP_PUBLIC_KEY_PROD!
  : process.env.MP_PUBLIC_KEY_TEST!;
