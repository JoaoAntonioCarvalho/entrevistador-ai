'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-white flex items-center
                       justify-center min-h-screen px-6">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-semibold mb-2">
            Algo deu errado
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            O erro foi registrado automaticamente.
            Tente recarregar a página.
          </p>
          <button
            onClick={reset}
            className="bg-white text-zinc-900 px-6 py-2.5
                       rounded-full text-sm font-medium
                       hover:bg-zinc-100 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
