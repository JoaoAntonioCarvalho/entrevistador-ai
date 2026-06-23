import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resultado da entrevista',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
