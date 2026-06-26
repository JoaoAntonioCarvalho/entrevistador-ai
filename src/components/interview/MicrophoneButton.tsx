'use client';

import { Mic, Square, Loader2 } from 'lucide-react';

interface MicrophoneButtonProps {
  state: 'idle' | 'listening' | 'processing' | 'disabled';
  onClick: () => void;
  lang?: 'pt' | 'en';
}

export function MicrophoneButton({ state, onClick, lang = 'pt' }: MicrophoneButtonProps) {
  const isIdle       = state === 'idle';
  const isListening  = state === 'listening';
  const isProcessing = state === 'processing';
  const isDisabled   = state === 'disabled';
  const isActive     = isIdle || isListening;

  const label =
    isIdle       ? (lang === 'pt' ? 'Toque para falar'              : 'Tap to speak')          :
    isListening  ? (lang === 'pt' ? 'Ouvindo... toque para enviar'  : 'Listening... tap to send') :
                   (lang === 'pt' ? 'Aguarde...'                    : 'Please wait...');

  return (
    <div className="flex flex-col items-center gap-3">
      <span className={`text-xs font-medium transition-colors ${
        isListening ? 'text-red-400' : 'text-zinc-400 dark:text-zinc-500'
      }`}>
        {label}
      </span>

      <div className="relative">
        {/* Ping idle */}
        {isIdle && (
          <span className="absolute inset-0 rounded-full animate-ping bg-zinc-400/10 dark:bg-zinc-600/15 pointer-events-none" />
        )}
        {/* Rings ao gravar */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 pointer-events-none" />
            <span className="absolute -inset-3 rounded-full border border-red-400 opacity-20 animate-pulse pointer-events-none" />
          </>
        )}

        <button
          onClick={isActive ? onClick : undefined}
          disabled={!isActive}
          aria-label={label}
          className={[
            'relative w-16 h-16 rounded-full flex items-center justify-center',
            'transition-all duration-200 select-none',
            isIdle       ? 'bg-zinc-900 dark:bg-white hover:scale-105 cursor-pointer shadow-md hover:shadow-lg'    : '',
            isListening  ? 'bg-red-500 cursor-pointer shadow-md shadow-red-900/20 scale-105'                       : '',
            isProcessing ? 'bg-zinc-200 dark:bg-zinc-700 opacity-60 cursor-not-allowed'                           : '',
            isDisabled   ? 'bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed'                                      : '',
          ].filter(Boolean).join(' ')}
        >
          {isIdle       && <Mic    className="w-7 h-7 text-white dark:text-zinc-900" />}
          {isListening  && <Square className="w-6 h-6 text-white fill-white" />}
          {isProcessing && <Loader2 className="w-5 h-5 text-zinc-400 dark:text-zinc-500 animate-spin" />}
          {isDisabled   && <Mic    className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />}
        </button>
      </div>
    </div>
  );
}

export default MicrophoneButton;
