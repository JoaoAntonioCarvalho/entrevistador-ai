'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authedFetch } from '@/lib/services/api-client';
import { usePixCheckout } from '@/hooks/usePixCheckout';
import { PixCheckoutPanel } from './PixCheckoutPanel';
import { X, QrCode, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentFlowProps {
  plano:     string;
  sessionId: string | null;
  onClose:   () => void;
  // Chamado logo antes de qualquer navegação/saída da tela atual (abrir o
  // cartão em nova aba ou confirmar o Pix e voltar pra entrevista) — quem
  // está dentro de uma entrevista usa isso pra suprimir o aviso de "sair da
  // página" (ver interview/page.tsx, suppressLeaveWarningRef).
  onBeforeNavigateAway?: () => void;
}

const MENSAL = new Set(['mensal-starter', 'mensal-pro']);

// Planos mensais são assinatura recorrente (PreApproval) — só cartão, a
// doc de Orders não confirma Pix recorrente. Avulsos (finalizar-atual,
// credito-7/14) podem escolher Pix ou cartão.
export function PaymentFlow({ plano, sessionId, onClose, onBeforeNavigateAway }: PaymentFlowProps) {
  const router    = useRouter();
  const isMensal  = MENSAL.has(plano);
  const [metodo, setMetodo]   = useState<'escolha' | 'pix' | 'cartao'>(isMensal ? 'cartao' : 'escolha');
  const [loadingCartao, setLoadingCartao] = useState(false);

  // Mesma regra de destino usada em /pagamento/sucesso: finalizar-atual
  // retoma a entrevista, qualquer outro plano é crédito novo → /conta.
  const destino = plano === 'finalizar-atual' && sessionId
    ? `/interview?resume=true&sessionId=${sessionId}&paid=true`
    : '/conta';

  // security.js (recomendação nº 1 da doc do MP p/ reduzir recusa de cartão)
  // exige o atributo `view`, que não é um HTMLAttribute React válido — por
  // isso é injetado manualmente em vez de via next/script.
  useEffect(() => {
    if (document.getElementById('mp-security-script')) return;
    const s = document.createElement('script');
    s.id = 'mp-security-script';
    s.src = 'https://www.mercadopago.com/v2/security.js';
    s.setAttribute('view', 'checkout');
    document.body.appendChild(s);
  }, []);

  const pix = usePixCheckout({
    plano,
    sessionId,
    onConfirmado: () => {
      onBeforeNavigateAway?.();
      onClose();
      router.push(destino);
    },
  });

  async function pagarCartao() {
    setLoadingCartao(true);
    try {
      const endpoint = isMensal ? '/api/mp-criar-assinatura' : '/api/mp-criar-preferencia';

      // Device ID (window.MP_DEVICE_SESSION_ID, populado pelo security.js do
      // MP abaixo) reduz recusa de cartão por antifraude — só se aplica ao
      // Checkout Pro avulso, não à assinatura nem ao Pix transparente.
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (!isMensal) {
        const deviceId = (window as unknown as { MP_DEVICE_SESSION_ID?: string }).MP_DEVICE_SESSION_ID;
        if (deviceId) headers['X-meli-session-id'] = deviceId;
      }

      const res = await authedFetch(endpoint, {
        method:  'POST',
        headers,
        body: JSON.stringify({ plano, sessionId }),
      });
      const data = await res.json();
      if (data.initPoint) {
        // Tentativa de manter o pagamento no navegador em vez do app nativo
        // do Mercado Pago no celular. NÃO é garantido — é comportamento de
        // Universal Links/App Links do sistema operacional, fora do
        // controle da aplicação. Testar em iOS e Android reais após o
        // deploy e reportar se o app nativo ainda abre.
        onBeforeNavigateAway?.();
        window.open(data.initPoint, '_blank');
        onClose();
      } else {
        toast.error('Erro ao iniciar pagamento.');
        setLoadingCartao(false);
      }
    } catch {
      toast.error('Erro ao iniciar pagamento.');
      setLoadingCartao(false);
    }
  }

  const titulo = metodo === 'escolha'
    ? 'Como você quer pagar?'
    : metodo === 'pix' ? 'Pagar com Pix' : 'Pagar com cartão';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center
                    bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full
                      max-w-[380px] shadow-2xl overflow-hidden
                      border border-zinc-100 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            {titulo}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
                       text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {metodo === 'escolha' && (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setMetodo('pix')}
              className="flex flex-col items-center gap-2 py-5 rounded-xl
                         border border-zinc-200 dark:border-zinc-700
                         hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <QrCode className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-white">Pix</span>
            </button>
            <button
              onClick={() => setMetodo('cartao')}
              className="flex flex-col items-center gap-2 py-5 rounded-xl
                         border border-zinc-200 dark:border-zinc-700
                         hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <CreditCard className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-white">Cartão</span>
            </button>
          </div>
        )}

        {metodo === 'pix' && pix.status === 'idle' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Você vai pagar via Pix. A chave aparece em nome de{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                João Carvalho — responsável pelo Entrevistador.IA
              </span>{' '}
              — e o pagamento é 100% processado pelo Mercado Pago.
            </p>
            <button
              onClick={pix.criar}
              className="w-full bg-zinc-900 dark:bg-white text-white
                         dark:text-zinc-900 py-2.5 rounded-full text-xs
                         font-bold hover:opacity-90 transition-opacity"
            >
              Continuar
            </button>
          </div>
        )}

        {metodo === 'pix' && pix.status !== 'idle' && (
          <PixCheckoutPanel
            status={pix.status}
            qrCode={pix.qrCode}
            qrCodeBase64={pix.qrCodeBase64}
            secondsLeft={pix.secondsLeft}
            onGerarNovo={pix.criar}
          />
        )}

        {metodo === 'cartao' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Você será redirecionado ao Mercado Pago para inserir os dados
              do cartão com segurança.
            </p>
            <button
              onClick={pagarCartao}
              disabled={loadingCartao}
              className="w-full bg-zinc-900 dark:bg-white text-white
                         dark:text-zinc-900 py-2.5 rounded-full text-xs
                         font-bold hover:opacity-90 disabled:opacity-50
                         transition-opacity flex items-center
                         justify-center gap-2"
            >
              {loadingCartao ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
