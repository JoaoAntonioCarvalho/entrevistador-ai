import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://entrevistador-ai.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow:  [
          '/interview',
          '/dashboard',
          '/feedback',
          '/camera-check',
          '/pagamento/',
          '/api/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
