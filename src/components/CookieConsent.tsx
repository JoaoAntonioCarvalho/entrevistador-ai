'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setShow(true);
  }, []);

  function accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
  }

  function decline() {
    localStorage.setItem('cookie-consent', 'declined');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900
                    dark:bg-zinc-950 border-t border-zinc-800 px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row
                      items-center justify-between gap-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          Usamos cookies essenciais para o funcionamento do site e,
          com seu consentimento, cookies de análise. Veja nossa{' '}
          <Link href="/privacidade" className="underline hover:text-white">
            Política de Privacidade
          </Link>.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="text-xs text-zinc-400 border border-zinc-700
                       px-4 py-2 rounded-full hover:bg-zinc-800
                       transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={accept}
            className="text-xs bg-white text-zinc-900 px-4 py-2
                       rounded-full hover:bg-zinc-100 transition-colors
                       font-medium"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
