import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planos e Preços',
  description:
    'Escolha o plano ideal para sua preparação. ' +
    'Comece grátis com 9 perguntas ou desbloqueie ' +
    'entrevistas completas a partir de R$9,90.',
};

export default function PlanosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
