'use client';

import { ArrowRight, Bell, BellOff } from 'lucide-react';

interface Props {
  idioma?:   string;
  onDismiss: () => void;
}

// Popup "não está ouvindo?" — iOS apenas. Puramente visual: observa estados
// existentes da entrevista, não toca em nenhuma lógica de áudio. O popup
// inteiro é tocável para dispensar; não bloqueia nada atrás.
export default function SilentModeHint({ idioma, onDismiss }: Props) {
  const en = idioma === 'en';
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-36 z-50
                    w-[calc(100%-2rem)] max-w-sm">
      <button
        onClick={onDismiss}
        aria-label={
          en
            ? 'Dismiss silent mode notice'
            : 'Dispensar aviso de modo silencioso'
        }
        className="w-full bg-zinc-900 text-white rounded-2xl
                   shadow-2xl border border-zinc-700 px-5 py-4 text-left
                   animate-fade-in-up"
        style={{ animationDuration: '0.3s' }}
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <BellOff className="w-8 h-8 opacity-50" />
          <ArrowRight className="w-5 h-5 text-zinc-400" />
          <Bell className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm leading-relaxed text-zinc-200">
          {en
            ? "Can't hear anything? Your phone may be on silent mode. Flip the side switch on your iPhone to hear the interviewer — raising the volume alone won't work."
            : 'Não está ouvindo? Seu celular pode estar no modo silencioso. Destrave a chavinha lateral do iPhone para ouvir o entrevistador — só aumentar o volume não resolve.'}
        </p>
      </button>
    </div>
  );
}
