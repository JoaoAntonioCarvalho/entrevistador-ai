import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Criar conta grátis',
  description: 'Crie sua conta gratuita para acessar seu histórico de entrevistas.',
  robots: { index: false, follow: false },
};

export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
