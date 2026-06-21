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
  title: 'Entrevistador.ai — Pratique entrevistas com IA',
  description: 'Simule entrevistas reais com um entrevistador virtual com IA. Receba feedback detalhado e evolua a cada sessão.',
  keywords: 'simulador de entrevista, preparação para entrevista, entrevista de emprego, IA, inteligência artificial',
  authors: [{ name: 'Entrevistador.ai' }],
  openGraph: {
    title: 'Entrevistador.ai',
    description: 'Pratique entrevistas reais com IA e receba feedback personalizado.',
    locale: 'pt_BR',
    type: 'website',
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
