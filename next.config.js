/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

function validateEnv() {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());

  if (hasAnthropic && hasOpenRouter) {
    console.error('\n');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('  ERRO DE CONFIGURAÇÃO — Entrevistador.ai não pode iniciar');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('  Você configurou DOIS providers de IA ao mesmo tempo:');
    console.error('  → ANTHROPIC_API_KEY ✓');
    console.error('  → OPENROUTER_API_KEY ✓');
    console.error('');
    console.error('  Mantenha APENAS UM no .env.local e remova o outro.');
    console.error('');
    console.error('  Recomendação para testes: use OPENROUTER_API_KEY');
    console.error('  Recomendação para produção: use ANTHROPIC_API_KEY');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }

  if (!hasAnthropic && !hasOpenRouter) {
    console.error('\n');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('  ERRO DE CONFIGURAÇÃO — Entrevistador.ai não pode iniciar');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('  Nenhum provider de IA configurado no .env.local.');
    console.error('');
    console.error('  Adicione UMA das opções abaixo:');
    console.error('  → ANTHROPIC_API_KEY=sk-ant-...');
    console.error('  → OPENROUTER_API_KEY=sk-or-...');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }

  const provider = hasOpenRouter ? 'OpenRouter' : 'Anthropic (direto)';
  console.log(`\n✓ Entrevistador.ai — Provider de IA: ${provider}\n`);
}

const securityHeaders = [
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  {
    key:   'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()',
  },
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key:   'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // https://www.mercadopago.com: security.js (Device ID, ver
      // PaymentFlow.tsx) — recomendação nº 1 do MP p/ reduzir recusa de
      // cartão. Sem isso o CSP bloqueia o script e o Device ID nunca é
      // gerado (X-meli-session-id fica ausente em mp-criar-preferencia).
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.mercadopago.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      [
        "connect-src 'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://api.anthropic.com",
        "https://openrouter.ai",
        "https://api.openai.com",
        "https://api.mercadopago.com",
        "https://www.mercadopago.com",
        "https://api.mercadolibre.com",
        "https://api.telegram.org",
        "https://*.ingest.sentry.io",
        "https://*.sentry.io",
      ].join(' '),
      "media-src 'self' blob:",
      "frame-src https://www.mercadopago.com.br https://www.mercadopago.com",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig = {
  experimental: {
    // Pacotes nativos/Node-only não podem ser empacotados pelo webpack —
    // precisam ser resolvidos em runtime no node_modules da função (Vercel).
    // Sem isso: "ReferenceError: DOMMatrix is not defined" no parse de PDF.
    serverComponentsExternalPackages: [
      '@napi-rs/canvas',
      'pdfjs-dist',
      'pdf-parse',
    ],
    // O worker do pdfjs é carregado por caminho em runtime (não é import
    // estático), então o file tracing não o detecta — incluir explicitamente
    // no deploy da função de parse
    outputFileTracingIncludes: {
      '/api/parse-resume': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    }
    return config;
  },
  async headers() {
    return [
      {
        source:  '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

// Export as function so Next.js passes `phase` — lets us skip validation during build
const configFn = (phase) => {
  if (phase !== 'phase-production-build') {
    validateEnv();
  }
  return nextConfig;
};

module.exports = withSentryConfig(configFn, {
  org:     'entrevistador-ai',
  project: 'entrevistador-ai',
  silent:  true,
  sourcemaps: { disable: true },
});
