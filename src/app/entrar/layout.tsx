import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar ou criar conta',
  description: 'Acesse sua conta para ver seu histórico de entrevistas.',
  robots: { index: false, follow: false },
};

export default function EntrarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
