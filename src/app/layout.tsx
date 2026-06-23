import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://entrevistador-ai.vercel.app'
  ),
  title: {
    default:  'Entrevistador.ai — Simule entrevistas de emprego com IA',
    template: '%s | Entrevistador.ai',
  },
  description:
    'Pratique entrevistas de emprego com um entrevistador virtual que fala, ' +
    'ouve e reage em tempo real. Receba nota e feedback personalizado para ' +
    'cada resposta. Gratuito para começar.',
  keywords: [
    'simulador de entrevista',
    'preparação para entrevista',
    'entrevista de emprego',
    'inteligência artificial',
    'treinar entrevista',
    'feedback de entrevista',
    'praticar entrevista',
    'entrevista com IA',
  ],
  authors: [{ name: 'Entrevistador.ai' }],
  creator: 'Entrevistador.ai',
  openGraph: {
    type:        'website',
    locale:      'pt_BR',
    url:         '/',
    siteName:    'Entrevistador.ai',
    title:       'Entrevistador.ai — Simule entrevistas de emprego com IA',
    description:
      'Pratique entrevistas de emprego com um entrevistador virtual ' +
      'que fala, ouve e reage em tempo real. Receba nota e feedback ' +
      'personalizado. Gratuito para começar.',
    images: [
      {
        url:    '/og-image.png',
        width:  1200,
        height: 630,
        alt:    'Entrevistador.ai — Simulador de entrevistas com IA',
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Entrevistador.ai — Simule entrevistas de emprego com IA',
    description:
      'Pratique entrevistas de emprego com IA. Voz real, perguntas ' +
      'personalizadas, feedback detalhado.',
    images: ['/og-image.png'],
  },
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <Toaster />
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
