'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/services/api-client';

type Status = 'idle' | 'loading' | 'ready' | 'confirmado' | 'expirado' | 'erro';

interface UsePixCheckoutParams {
  plano:       string;
  sessionId:   string | null;
  onConfirmado: () => void;
}

// Encapsula o ciclo de vida do Pix inline (Checkout Transparente / Orders
// API): cria a cobrança, mostra QR/copia-e-cola, faz polling em
// /api/credits/check (o mesmo endpoint que /pagamento/sucesso já usa para
// confirmar créditos) e conta os 30 min até expirar.
export function usePixCheckout({ plano, sessionId, onConfirmado }: UsePixCheckoutParams) {
  const [status, setStatus]           = useState<Status>('idle');
  const [qrCode, setQrCode]           = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const limpar = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  const criar = useCallback(async () => {
    limpar();
    setStatus('loading');
    try {
      const res = await authedFetch('/api/mp-criar-pix', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano, sessionId }),
      });
      const data = await res.json();

      if (!res.ok || !data.qrCode) {
        setStatus('erro');
        return;
      }

      setQrCode(data.qrCode);
      setQrCodeBase64(data.qrCodeBase64 ?? null);
      setSecondsLeft(data.expiresIn ?? 30 * 60);
      setStatus('ready');

      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            limpar();
            setStatus('expirado');
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      pollRef.current = setInterval(async () => {
        try {
          const check = await authedFetch('/api/credits/check', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: plano === 'finalizar-atual' ? sessionId : null }),
          });
          const checkData = await check.json();
          if (checkData.hasCredit) {
            limpar();
            setStatus('confirmado');
            setTimeout(onConfirmado, 1200);
          }
        } catch { /* tenta de novo no próximo tick */ }
      }, 3000);

    } catch {
      setStatus('erro');
    }
  }, [plano, sessionId, onConfirmado, limpar]);

  useEffect(() => () => limpar(), [limpar]);

  return { status, qrCode, qrCodeBase64, secondsLeft, criar };
}
