'use client';

import { Mic, MicOff, Send, Loader2 } from 'lucide-react';

interface MicrophoneButtonProps {
  state: 'idle' | 'listening' | 'processing' | 'disabled';
  onClick: () => void;
  interimTranscript?: string;
  lang?: 'pt' | 'en';
}

const LABELS = {
  pt: {
    idle:       'Toque para falar',
    listening:  'Ouvindo...',
    processing: 'Processando...',
    disabled:   'Aguarde...',
    send:       'Toque para enviar',
    tap_send:   'Quando terminar, toque em enviar',
  },
  en: {
    idle:       'Tap to speak',
    listening:  'Listening...',
    processing: 'Processing...',
    disabled:   'Please wait...',
    send:       'Tap to send',
    tap_send:   'When done, tap to send',
  },
};

export function MicrophoneButton({
  state,
  onClick,
  interimTranscript,
  lang = 'pt',
}: MicrophoneButtonProps) {
  const labels     = LABELS[lang];
  const isListening  = state === 'listening';
  const isProcessing = state === 'processing';
  const isDisabled   = state === 'disabled';
  const isIdle       = state === 'idle';

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">

      {/* Transcrição parcial — aparece acima enquanto grava */}
      <div className="min-h-[40px] w-full text-center px-4">
        {isListening && interimTranscript && (
          <p className="text-sm text-zinc-400 italic leading-snug">
            &ldquo;{interimTranscript.slice(0, 80)}{interimTranscript.length > 80 ? '...' : ''}&rdquo;
          </p>
        )}
        {isListening && !interimTranscript && (
          <p className="text-xs text-zinc-500">
            {labels.tap_send}
          </p>
        )}
      </div>

      {/* Área principal */}
      <div className="flex items-center gap-6">

        {/* Botão do microfone */}
        <div className="flex flex-col items-center gap-2">

          {/* Label acima do botão — visível só nos estados ativos */}
          <div className={`text-sm font-medium tracking-wide transition-all duration-300 min-h-[20px] ${
            isIdle
              ? 'text-zinc-400 opacity-100'
              : isListening
              ? 'text-zinc-300 opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}>
            {isListening
              ? (lang === 'pt' ? '🎙 Ouvindo... toque para enviar' : '🎙 Listening... tap to send')
              : (lang === 'pt' ? 'Toque para responder' : 'Tap to respond')}
          </div>

          {/* Wrapper relativo para o anel de ping */}
          <div className="relative">
            {/* Ping sutil ao redor do botão — só quando aguardando */}
            {isIdle && (
              <span className="absolute inset-0 rounded-full animate-ping bg-zinc-400/20" />
            )}

            <button
              onClick={!isDisabled && !isProcessing ? onClick : undefined}
              disabled={isDisabled || isProcessing}
              aria-label={
                isIdle       ? labels.idle       :
                isListening  ? labels.listening  :
                isProcessing ? labels.processing :
                               labels.disabled
              }
              className={[
                'relative flex items-center justify-center rounded-full transition-all duration-200 select-none w-16 h-16',
                isIdle       ? 'bg-zinc-700 hover:bg-zinc-600 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105' : '',
                isListening  ? 'bg-red-600 cursor-pointer shadow-lg shadow-red-900/30' : '',
                isProcessing ? 'bg-zinc-700 cursor-not-allowed' : '',
                isDisabled   ? 'bg-zinc-800 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {/* Rings pulsando ao gravar */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-30" />
                  <span className="absolute -inset-2 rounded-full border-2 border-red-500 opacity-40 animate-pulse" />
                </>
              )}

              {isIdle       && <Mic     className="w-7 h-7 text-white" />}
              {isListening  && <MicOff  className="w-7 h-7 text-white" />}
              {isProcessing && <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />}
              {isDisabled   && <Mic     className="w-7 h-7 text-zinc-500" />}
            </button>
          </div>

          <span className={`text-xs font-medium transition-colors ${
            isIdle       ? 'text-zinc-100' :
            isListening  ? 'text-red-400'  :
            isProcessing ? 'text-zinc-400' :
                           'text-zinc-500'
          }`}>
            {isIdle       ? labels.idle       :
             isListening  ? labels.listening  :
             isProcessing ? labels.processing :
                            labels.disabled}
          </span>
        </div>

        {/* Botão enviar — só aparece quando está gravando */}
        {isListening && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
            <button
              onClick={onClick}
              aria-label={labels.send}
              className="w-16 h-16 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Send className="w-6 h-6 text-white" />
            </button>
            <span className="text-xs font-medium text-zinc-100">
              {labels.send}
            </span>
          </div>
        )}

      </div>

      {/* Instrução contextual abaixo */}
      <div className="min-h-[20px]">
        {isIdle && (
          <p className="text-xs text-zinc-500 text-center max-w-[180px] leading-relaxed animate-fade-in-up">
            {lang === 'pt'
              ? 'Fale sua resposta e toque novamente para enviar'
              : 'Speak your answer and tap again to send'}
          </p>
        )}
      </div>

    </div>
  );
}

export default MicrophoneButton;
