'use client';

import { Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PixCheckoutPanelProps {
  status:       'idle' | 'loading' | 'ready' | 'confirmado' | 'expirado' | 'erro';
  qrCode:       string | null;
  qrCodeBase64: string | null;
  secondsLeft:  number;
  onGerarNovo:  () => void;
}

function formatarTempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PixCheckoutPanel({
  status, qrCode, qrCodeBase64, secondsLeft, onGerarNovo,
}: PixCheckoutPanelProps) {
  async function copiar() {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      toast.success('Código Pix copiado!');
    } catch {
      toast.error('Não foi possível copiar. Selecione o código manualmente.');
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerando código Pix...</p>
      </div>
    );
  }

  if (status === 'confirmado') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full
                        flex items-center justify-center">
          <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          Pagamento confirmado!
        </p>
      </div>
    );
  }

  if (status === 'expirado') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          O código Pix expirou.
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Gere um novo código para continuar.
        </p>
        <button
          onClick={onGerarNovo}
          className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-full
                     bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
                     text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Gerar novo Pix
        </button>
      </div>
    );
  }

  if (status === 'erro') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível gerar o Pix agora.
        </p>
        <button
          onClick={onGerarNovo}
          className="mt-1 px-4 py-2 rounded-full border border-zinc-200
                     dark:border-zinc-700 text-xs font-medium
                     hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (status === 'ready' && qrCode) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        {qrCodeBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${qrCodeBase64}`}
            alt="QR code Pix"
            className="w-40 h-40 rounded-lg border border-zinc-200 dark:border-zinc-700"
          />
        )}

        <div className="w-full flex items-center gap-2">
          <input
            readOnly
            value={qrCode}
            onFocus={e => e.currentTarget.select()}
            className="flex-1 min-w-0 text-[11px] px-3 py-2 rounded-lg
                       border border-zinc-200 dark:border-zinc-700
                       bg-zinc-50 dark:bg-zinc-800 text-zinc-600
                       dark:text-zinc-300 truncate"
          />
          <button
            onClick={copiar}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg
                       bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
                       text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar
          </button>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Expira em <span className="font-mono tabular-nums">{formatarTempo(secondsLeft)}</span>
        </p>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Aguardando confirmação do pagamento...
        </div>
      </div>
    );
  }

  return null;
}
