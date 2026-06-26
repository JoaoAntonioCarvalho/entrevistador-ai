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
  const labels      = LABELS[lang];
  const isListening  = state === 'listening';
  const isProcessing = state === 'processing';
  const isDisabled   = state === 'disabled';
  const isIdle       = state === 'idle';

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">

      {/* Transcrição parcial — aparece acima enquanto grava */}
      <div className="min-h-[36px] w-full text-center px-4">
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

          {/* Label acima do botão */}
          <div className={`text-sm transition-all duration-300 min-h-[20px] ${
            isIdle
              ? 'text-zinc-500 dark:text-zinc-400 opacity-100'
              : isListening
              ? 'text-zinc-600 dark:text-zinc-300 opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}>
            {isListening
              ? (lang === 'pt' ? 'Ouvindo... toque para enviar' : 'Listening... tap to send')
              : (lang === 'pt' ? 'Toque para responder'         : 'Tap to respond')}
          </div>

          {/* Wrapper relativo para o anel de ping */}
          <div className="relative">
            {isIdle && (
              <span className="absolute inset-0 rounded-full animate-ping bg-zinc-400/15 dark:bg-zinc-600/20" />
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
                'relative flex items-center justify-center rounded-full transition-all duration-200 select-none w-14 h-14',
                isIdle       ? 'bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-100 cursor-pointer shadow-md hover:shadow-lg hover:scale-105' : '',
                isListening  ? 'bg-red-500 cursor-pointer shadow-md shadow-red-900/20' : '',
                isProcessing ? 'bg-zinc-200 dark:bg-zinc-700 cursor-not-allowed opacity-70' : '',
                isDisabled   ? 'bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {/* Rings pulsando ao gravar */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
                  <span className="absolute -inset-2 rounded-full border border-red-400 opacity-30 animate-pulse" />
                </>
              )}

              {isIdle       && <Mic     className="w-6 h-6 text-white dark:text-zinc-900" />}
              {isListening  && <MicOff  className="w-6 h-6 text-white" />}
              {isProcessing && <Loader2 className="w-5 h-5 text-zinc-400 dark:text-zinc-500 animate-spin" />}
              {isDisabled   && <Mic     className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />}
            </button>
          </div>

          <span className={`text-xs transition-colors ${
            isIdle       ? 'text-zinc-500 dark:text-zinc-400' :
            isListening  ? 'text-red-500'                    :
            isProcessing ? 'text-zinc-400'                   :
                           'text-zinc-500 dark:text-zinc-600'
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
              className="w-14 h-14 bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-100 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Send className="w-5 h-5 text-white dark:text-zinc-900" />
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {labels.send}
            </span>
          </div>
        )}

      </div>

      {/* Instrução contextual abaixo */}
      <div className="min-h-[20px]">
        {isIdle && (
          <p className="text-xs text-center max-w-[180px] leading-relaxed text-zinc-400 dark:text-zinc-500 animate-fade-in-up">
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
