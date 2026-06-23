import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://entrevistador-ai.vercel.app';

  return [
    {
      url:             base,
      lastModified:    new Date(),
      changeFrequency: 'weekly',
      priority:        1,
    },
    {
      url:             `${base}/planos`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.8,
    },
    {
      url:             `${base}/termos`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.3,
    },
    {
      url:             `${base}/privacidade`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.3,
    },
  ];
}
